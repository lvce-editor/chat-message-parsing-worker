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

export const parseBlockTokens = (tokens: readonly BlockToken[]): readonly MessageIntermediateNode[] => {
  if (tokens.length === 0) {
    return getEmptyTextNode()
  }

  const nodes: MessageIntermediateNode[] = []
  let paragraphLines: string[] = []
  let listItems: MessageListItemNode[] = []
  let listType: 'ordered-list' | 'unordered-list' | '' = ''
  let orderedListPathStack: Array<{ readonly indentation: number; readonly path: readonly number[] }> = []
  let canContinueOrderedListItemParagraph = false

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

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) {
      return
    }
    nodes.push({
      children: parseInlineNodes(paragraphLines.join('\n')),
      type: 'text',
    })
    paragraphLines = []
  }

  const flushList = (): void => {
    if (listItems.length === 0) {
      return
    }
    nodes.push({
      items: listItems,
      type: listType || 'ordered-list',
    })
    listItems = []
    listType = ''
    orderedListPathStack = []
    canContinueOrderedListItemParagraph = false
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token.type === 'blank-line') {
      flushParagraph()
      canContinueOrderedListItemParagraph = false
      continue
    }

    if (token.type === 'code-block') {
      flushList()
      flushParagraph()
      if (token.language) {
        nodes.push({
          codeTokens: highlightCode(token.text, token.language),
          language: token.language,
          text: token.text,
          type: 'code-block',
        })
      } else {
        nodes.push({
          codeTokens: highlightCode(token.text, undefined),
          text: token.text,
          type: 'code-block',
        })
      }
      continue
    }

    if (token.type === 'math-block') {
      flushList()
      flushParagraph()
      nodes.push({
        text: token.text,
        type: 'math-block',
      })
      continue
    }

    if (token.type === 'thematic-break') {
      flushList()
      flushParagraph()
      nodes.push({
        type: 'thematic-break',
      })
      continue
    }

    if (token.type === 'blockquote-line') {
      flushList()
      flushParagraph()
      const lines: string[] = []
      while (i < tokens.length && tokens[i].type === 'blockquote-line') {
        const quoteToken = tokens[i]
        if (quoteToken.type === 'blockquote-line') {
          lines.push(quoteToken.text)
        }
        i++
      }
      i--
      nodes.push({
        children: parseBlockTokens(scanBlockTokens(lines.join('\n'))),
        type: 'blockquote',
      })
      continue
    }

    if (token.type === 'table-row-line') {
      const expectedColumns = token.cells.length
      if (isTableSeparatorToken(tokens[i + 1], expectedColumns)) {
        flushList()
        flushParagraph()
        const rows: MessageTableRowNode[] = []
        i += 2
        while (i < tokens.length && tokens[i].type === 'table-row-line') {
          const rowToken = tokens[i]
          if (rowToken.type !== 'table-row-line') {
            break
          }
          if (rowToken.cells.length === expectedColumns) {
            rows.push(toTableRow(rowToken))
          }
          i++
        }
        i--
        nodes.push({
          headers: token.cells.map(toTableCell),
          rows,
          type: 'table',
        })
        continue
      }
      flushList()
      paragraphLines.push(token.line)
      continue
    }

    if (token.type === 'ordered-list-item-line') {
      if (listType === 'ordered-list' && listItems.length > 0 && token.indentation > 0 && orderedListPathStack.length > 0) {
        const parentEntry = orderedListPathStack.toReversed().find((entry) => entry.indentation < token.indentation)
        if (parentEntry) {
          const parentItem = getListItemAtPath(listItems, parentEntry.path)
          if (parentItem) {
            const nextIndex = parentItem.nestedItems?.length || 0
            const nextItem = createListItem(token.text, nextIndex + 1)
            listItems = appendNestedItemAtPath(listItems, parentEntry.path, nextItem, 'ordered-list')
            const nextPath = [...parentEntry.path, nextIndex]
            orderedListPathStack = [
              ...orderedListPathStack.filter((entry) => entry.indentation < token.indentation),
              { indentation: token.indentation, path: nextPath },
            ]
            canContinueOrderedListItemParagraph = true
            continue
          }
        }
      }
      if (listType && listType !== 'ordered-list') {
        flushList()
      }
      flushParagraph()
      listType = 'ordered-list'
      const nextIndex = listItems.length
      const nextItem = createListItem(token.text, nextIndex + 1)
      listItems.push(nextItem)
      orderedListPathStack = [
        ...orderedListPathStack.filter((entry) => entry.indentation < token.indentation),
        { indentation: token.indentation, path: [nextIndex] },
      ]
      canContinueOrderedListItemParagraph = true
      continue
    }

    if (token.type === 'unordered-list-item-line') {
      if (listType === 'ordered-list' && listItems.length > 0 && token.indentation > 0 && orderedListPathStack.length > 0) {
        const parentEntry = orderedListPathStack.toReversed().find((entry) => entry.indentation < token.indentation)
        if (parentEntry) {
          const nextItem = createListItem(token.text)
          listItems = appendNestedItemAtPath(listItems, parentEntry.path, nextItem, 'unordered-list')
          canContinueOrderedListItemParagraph = false
          continue
        }
      }
      if (listType && listType !== 'unordered-list') {
        flushList()
      }
      flushParagraph()
      listType = 'unordered-list'
      listItems.push(createListItem(token.text))
      canContinueOrderedListItemParagraph = false
      continue
    }

    if (token.type === 'heading-line') {
      flushList()
      flushParagraph()
      nodes.push({
        children: parseInlineNodes(token.text),
        level: token.level,
        type: 'heading',
      })
      continue
    }

    if (token.type === 'paragraph-line' && listType === 'ordered-list' && listItems.length > 0 && canContinueOrderedListItemParagraph) {
      const currentPath = orderedListPathStack.at(-1)?.path
      if (currentPath) {
        listItems = appendInlineChildrenAtPath(listItems, currentPath, parseInlineNodes(token.text))
        continue
      }
    }

    flushList()
    paragraphLines.push(token.text)
    canContinueOrderedListItemParagraph = false
  }

  flushList()
  flushParagraph()

  return nodes.length === 0 ? getEmptyTextNode() : nodes
}
