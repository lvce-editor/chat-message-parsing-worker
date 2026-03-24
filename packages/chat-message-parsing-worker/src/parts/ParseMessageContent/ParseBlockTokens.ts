import type {
  MessageIntermediateNode,
  MessageListItemNode,
  MessageTableCellNode,
  MessageTableRowNode,
} from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'
import type { BlockToken } from './ScanBlockTokens.ts'
import { parseInlineNodes } from './ParseInlineNodes.ts'

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
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token.type === 'blank-line') {
      flushList()
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
      if (listType && listType !== 'ordered-list') {
        flushList()
      }
      flushParagraph()
      listType = 'ordered-list'
      listItems.push({
        children: parseInlineNodes(token.text),
        type: 'list-item',
      })
      continue
    }

    if (token.type === 'unordered-list-item-line') {
      if (listType === 'ordered-list' && listItems.length > 0 && token.indentation > 0) {
        const previousItem = listItems.at(-1)
        if (previousItem) {
          const nestedItems = previousItem.nestedItems ? [...previousItem.nestedItems] : []
          nestedItems.push({
            children: parseInlineNodes(token.text),
            type: 'list-item',
          })
          listItems[listItems.length - 1] = {
            ...previousItem,
            nestedItems,
          }
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
