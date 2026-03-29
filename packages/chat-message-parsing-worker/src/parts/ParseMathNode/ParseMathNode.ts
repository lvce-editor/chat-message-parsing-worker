import { ChatMathWorker } from '@lvce-editor/rpc-registry'
import type {
  MessageInlineNode,
  MessageIntermediateNode,
  MessageListItemNode,
  MessageTableCellNode,
} from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'

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
    const children: MessageIntermediateNode[] = []
    for (const child of node.children) {
      children.push(await parseMathNode(child))
    }
    return {
      ...node,
      children,
    }
  }
  if (node.type === 'ordered-list' || node.type === 'unordered-list') {
    const items: MessageListItemNode[] = []
    for (const item of node.items) {
      items.push(await parseMathListItem(item))
    }
    return {
      ...node,
      items,
    }
  }
  if (node.type === 'table') {
    const headers: MessageTableCellNode[] = []
    for (const header of node.headers) {
      headers.push(await parseMathTableCell(header))
    }
    const rows = []
    for (const row of node.rows) {
      const cells: MessageTableCellNode[] = []
      for (const cell of row.cells) {
        cells.push(await parseMathTableCell(cell))
      }
      rows.push({
        ...row,
        cells,
      })
    }
    return {
      ...node,
      headers,
      rows,
    }
  }
  return node
}
