import type {
  MessageInlineNode,
  MessageIntermediateNode,
  MessageListItemNode,
  MessageTableCellNode,
  MessageTableRowNode,
} from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'
import { highlightCode } from '../HighlightCode/HighlightCode.ts'
import { parseInlineNodes } from './ParseInlineNodes.ts'
import { type BlockToken, scanBlockTokens } from './ScanBlockTokens.ts'

const isTableSeparatorCell = (value: string): boolean => {
  if (!value) {
    return false
  }
  let index = 0
  if (value[index] === ':') {
    index++
  }
  let dashCount = 0
  while (index < value.length && value[index] === '-') {
    dashCount++
    index++
  }
  if (dashCount < 3) {
    return false
  }
  if (index < value.length && value[index] === ':') {
    index++
  }
  return index === value.length
}

const isTableSeparatorToken = (token: BlockToken | undefined, expectedColumns: number): boolean => {
  if (!token || token.type !== 'table-row-line') {
    return false
  }
  if (token.cells.length !== expectedColumns) {
    return false
  }
  return token.cells.every(isTableSeparatorCell)
}

const toTableCell = (value: string): MessageTableCellNode => {
  return {
    children: parseInlineNodes(value),
    type: 'table-cell',
  }
}

const toTableRow = (token: Extract<BlockToken, { type: 'table-row-line' }>): MessageTableRowNode => {
  return {
    cells: token.cells.map(toTableCell),
    type: 'table-row',
  }
}

const getEmptyTextNode = (): readonly MessageIntermediateNode[] => {
  return [
    {
      children: [
        {
          text: '',
          type: 'text',
        },
      ],
      type: 'text',
    },
  ]
}

type ListType = 'ordered-list' | 'unordered-list' | ''

interface OrderedListPathEntry {
  readonly indentation: number
  readonly path: readonly number[]
}

interface ParseState {
  canContinueOrderedListItemParagraph: boolean
  listItems: MessageListItemNode[]
  listType: ListType
  nodes: MessageIntermediateNode[]
  orderedListPathStack: readonly OrderedListPathEntry[]
  paragraphLines: string[]
}

const createInitialState = (): ParseState => {
  return {
    canContinueOrderedListItemParagraph: false,
    listItems: [],
    listType: '',
    nodes: [],
    orderedListPathStack: [],
    paragraphLines: [],
  }
}

const createListItem = (text: string, index?: number): MessageListItemNode => {
  return {
    children: parseInlineNodes(text),
    ...(index === undefined ? {} : { index }),
    type: 'list-item',
  }
}

const getListItemAtPath = (items: readonly MessageListItemNode[], path: readonly number[]): MessageListItemNode | undefined => {
  let currentItems = items
  let currentItem: MessageListItemNode | undefined
  for (const index of path) {
    currentItem = currentItems[index]
    if (!currentItem) {
      return undefined
    }
    currentItems = currentItem.nestedItems || []
  }
  return currentItem
}

const appendNestedItemAtPath = (
  items: readonly MessageListItemNode[],
  path: readonly number[],
  item: MessageListItemNode,
  nestedListType: 'ordered-list' | 'unordered-list',
): MessageListItemNode[] => {
  if (path.length === 0) {
    return [...items, item]
  }
  const [index, ...rest] = path
  const current = items[index]
  if (!current) {
    return [...items]
  }
  const nextNestedItems =
    rest.length > 0 ? appendNestedItemAtPath(current.nestedItems || [], rest, item, nestedListType) : [...(current.nestedItems || []), item]
  const nextItem = {
    ...current,
    nestedItems: nextNestedItems,
    nestedListType,
  }
  return [...items.slice(0, index), nextItem, ...items.slice(index + 1)]
}

const appendInlineChildrenAtPath = (
  items: readonly MessageListItemNode[],
  path: readonly number[],
  children: MessageListItemNode['children'],
): MessageListItemNode[] => {
  if (path.length === 0) {
    return [...items]
  }
  const [index, ...rest] = path
  const current = items[index]
  if (!current) {
    return [...items]
  }
  const lineBreakNode: MessageInlineNode = {
    text: '\n',
    type: 'text',
  }
  const nextChildren: MessageInlineNode[] = [...current.children, lineBreakNode, ...children]
  const nextItem =
    rest.length > 0
      ? {
          ...current,
          nestedItems: appendInlineChildrenAtPath(current.nestedItems || [], rest, children),
        }
      : {
          ...current,
          children: nextChildren,
        }
  return [...items.slice(0, index), nextItem, ...items.slice(index + 1)]
}

const flushParagraph = (state: ParseState): void => {
  if (state.paragraphLines.length === 0) {
    return
  }
  state.nodes.push({
    children: parseInlineNodes(state.paragraphLines.join('\n')),
    type: 'text',
  })
  state.paragraphLines = []
}

const flushList = (state: ParseState): void => {
  if (state.listItems.length === 0) {
    return
  }
  state.nodes.push({
    items: state.listItems,
    type: state.listType || 'ordered-list',
  })
  state.listItems = []
  state.listType = ''
  state.orderedListPathStack = []
  state.canContinueOrderedListItemParagraph = false
}

const flushOpenBlocks = (state: ParseState): void => {
  flushList(state)
  flushParagraph(state)
}

const findOrderedListParentEntry = (state: ParseState, indentation: number): OrderedListPathEntry | undefined => {
  if (state.listType !== 'ordered-list' || state.listItems.length === 0 || indentation <= 0 || state.orderedListPathStack.length === 0) {
    return undefined
  }
  return state.orderedListPathStack.toReversed().find((entry) => entry.indentation < indentation)
}

const addNestedOrderedListItem = (state: ParseState, token: Extract<BlockToken, { type: 'ordered-list-item-line' }>): boolean => {
  const parentEntry = findOrderedListParentEntry(state, token.indentation)
  if (!parentEntry) {
    return false
  }
  const parentItem = getListItemAtPath(state.listItems, parentEntry.path)
  if (!parentItem) {
    return false
  }
  const nextIndex = parentItem.nestedItems?.length || 0
  const nextItem = createListItem(token.text, nextIndex + 1)
  state.listItems = appendNestedItemAtPath(state.listItems, parentEntry.path, nextItem, 'ordered-list')
  state.orderedListPathStack = [
    ...state.orderedListPathStack.filter((entry) => entry.indentation < token.indentation),
    { indentation: token.indentation, path: [...parentEntry.path, nextIndex] },
  ]
  state.canContinueOrderedListItemParagraph = true
  return true
}

const addNestedUnorderedListItem = (state: ParseState, token: Extract<BlockToken, { type: 'unordered-list-item-line' }>): boolean => {
  const parentEntry = findOrderedListParentEntry(state, token.indentation)
  if (!parentEntry) {
    return false
  }
  state.listItems = appendNestedItemAtPath(state.listItems, parentEntry.path, createListItem(token.text), 'unordered-list')
  state.canContinueOrderedListItemParagraph = false
  return true
}

const beginTopLevelOrderedListItem = (state: ParseState, token: Extract<BlockToken, { type: 'ordered-list-item-line' }>): void => {
  if (state.listType && state.listType !== 'ordered-list') {
    flushList(state)
  }
  flushParagraph(state)
  state.listType = 'ordered-list'
  const nextIndex = state.listItems.length
  state.listItems.push(createListItem(token.text, nextIndex + 1))
  state.orderedListPathStack = [
    ...state.orderedListPathStack.filter((entry) => entry.indentation < token.indentation),
    { indentation: token.indentation, path: [nextIndex] },
  ]
  state.canContinueOrderedListItemParagraph = true
}

const beginTopLevelUnorderedListItem = (state: ParseState, token: Extract<BlockToken, { type: 'unordered-list-item-line' }>): void => {
  if (state.listType && state.listType !== 'unordered-list') {
    flushList(state)
  }
  flushParagraph(state)
  state.listType = 'unordered-list'
  state.listItems.push(createListItem(token.text))
  state.canContinueOrderedListItemParagraph = false
}

const consumeBlockquote = (tokens: readonly BlockToken[], start: number): { readonly nextIndex: number; readonly node: MessageIntermediateNode } => {
  const lines: string[] = []
  let index = start
  while (index < tokens.length && tokens[index].type === 'blockquote-line') {
    const token = tokens[index] as Extract<BlockToken, { type: 'blockquote-line' }>
    lines.push(token.text)
    index++
  }
  return {
    nextIndex: index,
    node: {
      children: parseBlockTokens(scanBlockTokens(lines.join('\n'))),
      type: 'blockquote',
    },
  }
}

const consumeTable = (
  tokens: readonly BlockToken[],
  start: number,
  token: Extract<BlockToken, { type: 'table-row-line' }>,
): { readonly nextIndex: number; readonly node?: MessageIntermediateNode } => {
  const expectedColumns = token.cells.length
  if (!isTableSeparatorToken(tokens[start + 1], expectedColumns)) {
    return {
      nextIndex: start,
    }
  }
  const rows: MessageTableRowNode[] = []
  let index = start + 2
  while (index < tokens.length && tokens[index].type === 'table-row-line') {
    const rowToken = tokens[index] as Extract<BlockToken, { type: 'table-row-line' }>
    if (rowToken.cells.length === expectedColumns) {
      rows.push(toTableRow(rowToken))
    }
    index++
  }
  return {
    nextIndex: index,
    node: {
      headers: token.cells.map(toTableCell),
      rows,
      type: 'table',
    },
  }
}

const pushCodeBlock = (state: ParseState, token: Extract<BlockToken, { type: 'code-block' }>): void => {
  state.nodes.push(
    token.language
      ? {
          codeTokens: highlightCode(token.text, token.language),
          language: token.language,
          text: token.text,
          type: 'code-block',
        }
      : {
          codeTokens: highlightCode(token.text, undefined),
          text: token.text,
          type: 'code-block',
        },
  )
}

const appendOrderedListParagraph = (state: ParseState, token: Extract<BlockToken, { type: 'paragraph-line' }>): boolean => {
  if (state.listType !== 'ordered-list' || state.listItems.length === 0 || !state.canContinueOrderedListItemParagraph) {
    return false
  }
  const currentPath = state.orderedListPathStack.at(-1)?.path
  if (!currentPath) {
    return false
  }
  state.listItems = appendInlineChildrenAtPath(state.listItems, currentPath, parseInlineNodes(token.text))
  return true
}

const processBlockToken = (state: ParseState, tokens: readonly BlockToken[], index: number): number => {
  const token = tokens[index]

  switch (token.type) {
    case 'blank-line':
      flushParagraph(state)
      state.canContinueOrderedListItemParagraph = false
      return index + 1
    case 'blockquote-line': {
      flushOpenBlocks(state)
      const blockquote = consumeBlockquote(tokens, index)
      state.nodes.push(blockquote.node)
      return blockquote.nextIndex
    }
    case 'code-block':
      flushOpenBlocks(state)
      pushCodeBlock(state, token)
      return index + 1
    case 'heading-line':
      flushOpenBlocks(state)
      state.nodes.push({
        children: parseInlineNodes(token.text),
        level: token.level,
        type: 'heading',
      })
      return index + 1
    case 'math-block':
      flushOpenBlocks(state)
      state.nodes.push({
        text: token.text,
        type: 'math-block',
      })
      return index + 1
    case 'ordered-list-item-line':
      if (!addNestedOrderedListItem(state, token)) {
        beginTopLevelOrderedListItem(state, token)
      }
      return index + 1
    case 'paragraph-line':
      if (!appendOrderedListParagraph(state, token)) {
        flushList(state)
        state.paragraphLines.push(token.text)
        state.canContinueOrderedListItemParagraph = false
      }
      return index + 1
    case 'table-row-line': {
      const table = consumeTable(tokens, index, token)
      if (table.node) {
        flushOpenBlocks(state)
        state.nodes.push(table.node)
        return table.nextIndex
      }
      flushList(state)
      state.paragraphLines.push(token.line)
      return index + 1
    }
    case 'thematic-break':
      flushOpenBlocks(state)
      state.nodes.push({
        type: 'thematic-break',
      })
      return index + 1
    case 'unordered-list-item-line':
      if (!addNestedUnorderedListItem(state, token)) {
        beginTopLevelUnorderedListItem(state, token)
      }
      return index + 1
  }
}

export const parseBlockTokens = (tokens: readonly BlockToken[]): readonly MessageIntermediateNode[] => {
  if (tokens.length === 0) {
    return getEmptyTextNode()
  }

  const state = createInitialState()

  for (let index = 0; index < tokens.length; ) {
    index = processBlockToken(state, tokens, index)
  }

  flushList(state)
  flushParagraph(state)

  return state.nodes.length === 0 ? getEmptyTextNode() : state.nodes
}
