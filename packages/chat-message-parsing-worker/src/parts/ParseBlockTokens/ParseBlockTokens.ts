import type {
  MessageIntermediateNode,
  MessageListItemNode,
  MessageTableCellNode,
  MessageTableRowNode,
} from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'
import { parseInlineNodes } from '../ParseInlineNodes/ParseInlineNodes.ts'
import { type BlockToken, scanBlockTokens } from '../ScanBlockTokens/ScanBlockTokens.ts'

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

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export const parseBlockTokens = (tokens: readonly BlockToken[]): readonly MessageIntermediateNode[] => {
  if (tokens.length === 0) {
    return getEmptyTextNode()
  }

  const nodes: MessageIntermediateNode[] = []
  let paragraphLines: string[] = []
  let listItems: MessageListItemNode[] = []
  let listType: 'ordered-list' | 'unordered-list' | '' = ''
  let orderedListPathStack: Array<{ readonly indentation: number; readonly path: readonly number[] }> = []

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
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token.type === 'blank-line') {
      flushParagraph()
      continue
    }

    if (token.type === 'code-block') {
      flushList()
      flushParagraph()
      if (token.language) {
        nodes.push({
          language: token.language,
          text: token.text,
          type: 'code-block',
        })
      } else {
        nodes.push({
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
            const nextItem: MessageListItemNode = {
              children: parseInlineNodes(token.text),
              type: 'list-item',
            }
            const nextIndex = parentItem.nestedItems?.length || 0
            listItems = appendNestedItemAtPath(listItems, parentEntry.path, nextItem, 'ordered-list')
            const nextPath = [...parentEntry.path, nextIndex]
            orderedListPathStack = [
              ...orderedListPathStack.filter((entry) => entry.indentation < token.indentation),
              { indentation: token.indentation, path: nextPath },
            ]
            continue
          }
        }
      }
      if (listType && listType !== 'ordered-list') {
        flushList()
      }
      flushParagraph()
      listType = 'ordered-list'
      const nextItem: MessageListItemNode = {
        children: parseInlineNodes(token.text),
        type: 'list-item',
      }
      listItems.push(nextItem)
      const nextIndex = listItems.length - 1
      orderedListPathStack = [
        ...orderedListPathStack.filter((entry) => entry.indentation < token.indentation),
        { indentation: token.indentation, path: [nextIndex] },
      ]
      continue
    }

    if (token.type === 'unordered-list-item-line') {
      if (listType === 'ordered-list' && listItems.length > 0 && token.indentation > 0 && orderedListPathStack.length > 0) {
        const parentEntry = orderedListPathStack.toReversed().find((entry) => entry.indentation < token.indentation)
        if (parentEntry) {
          const nextItem: MessageListItemNode = {
            children: parseInlineNodes(token.text),
            type: 'list-item',
          }
          listItems = appendNestedItemAtPath(listItems, parentEntry.path, nextItem, 'unordered-list')
          continue
        }
      }
      if (listType && listType !== 'unordered-list') {
        flushList()
      }
      flushParagraph()
      listType = 'unordered-list'
      listItems.push({
        children: parseInlineNodes(token.text),
        type: 'list-item',
      })
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

    flushList()
    paragraphLines.push(token.text)
  }

  flushList()
  flushParagraph()

  return nodes.length === 0 ? getEmptyTextNode() : nodes
}
