import { ChatMathWorker } from '@lvce-editor/rpc-registry'
import type {
  MessageInlineNode,
  MessageIntermediateNode,
  MessageListItemNode,
  MessageTableCellNode,
  MessageTableRowNode,
} from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'

const mapAsync = async <T, U>(items: readonly T[], mapper: (item: T) => Promise<U>): Promise<readonly U[]> => {
  return Promise.all(items.map(mapper))
}

const parseMathInline = async (children: readonly MessageInlineNode[]): Promise<readonly MessageInlineNode[]> => {
  const nextChildren: MessageInlineNode[] = []
  for (const child of children) {
    if (child.type === 'math-inline') {
      const dom = await ChatMathWorker.getMathInlineDom(child)
      nextChildren.push({
        dom,
        type: 'math-inline-dom',
      })
      continue
    }
    if (child.type === 'bold') {
      nextChildren.push({
        ...child,
        children: await parseMathInline(child.children),
      })
      continue
    }
    if (child.type === 'italic') {
      nextChildren.push({
        ...child,
        children: await parseMathInline(child.children),
      })
      continue
    }
    if (child.type === 'strikethrough') {
      nextChildren.push({
        ...child,
        children: await parseMathInline(child.children),
      })
      continue
    }
    nextChildren.push(child)
  }
  return nextChildren
}

const parseMathListItem = async (item: MessageListItemNode): Promise<MessageListItemNode> => {
  const children = await parseMathInline(item.children)
  if (!item.nestedItems) {
    return {
      ...item,
      children,
    }
  }
  const nestedItems: MessageListItemNode[] = []
  for (const nestedItem of item.nestedItems) {
    nestedItems.push(await parseMathListItem(nestedItem))
  }
  return {
    ...item,
    children,
    nestedItems,
  }
}

const parseMathTableCell = async (cell: MessageTableCellNode): Promise<MessageTableCellNode> => {
  return {
    ...cell,
    children: await parseMathInline(cell.children),
  }
}

const parseMathTableRow = async (row: MessageTableRowNode): Promise<MessageTableRowNode> => {
  return {
    ...row,
    cells: await mapAsync(row.cells, parseMathTableCell),
  }
}

export const parseMathNode = async (node: MessageIntermediateNode): Promise<MessageIntermediateNode> => {
  if (node.type === 'math-block') {
    const dom = await ChatMathWorker.getMathBlockDom(node)
    return {
      dom,
      type: 'math-block-dom',
    }
  }
  if (node.type === 'text' || node.type === 'heading') {
    return {
      ...node,
      children: await parseMathInline(node.children),
    }
  }
  if (node.type === 'blockquote') {
    return {
      ...node,
      children: await mapAsync(node.children, parseMathNode),
    }
  }
  if (node.type === 'ordered-list' || node.type === 'unordered-list') {
    return {
      ...node,
      items: await mapAsync(node.items, parseMathListItem),
    }
  }
  if (node.type === 'table') {
    return {
      ...node,
      headers: await mapAsync(node.headers, parseMathTableCell),
      rows: await mapAsync(node.rows, parseMathTableRow),
    }
  }
  return node
}
