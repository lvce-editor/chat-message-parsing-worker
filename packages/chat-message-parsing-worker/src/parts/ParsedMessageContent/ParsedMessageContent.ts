import { ChatMathWorker } from '@lvce-editor/rpc-registry'
import type { ChatMessage } from '../ChatMessage/ChatMessage.ts'
import type { ParsedMessage } from '../ParsedMessage/ParsedMessage.ts'
import type {
  MessageInlineNode,
  MessageIntermediateNode,
  MessageListItemNode,
  MessageTableCellNode,
} from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'
import { parseMessageContent } from '../ParseMessageContent/ParseMessageContent.ts'

const emptyMessageContent: readonly MessageIntermediateNode[] = [
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

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const parseMathNode = async (node: MessageIntermediateNode): Promise<MessageIntermediateNode> => {
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

export const parseMessage = async (rawMessage: string): Promise<readonly MessageIntermediateNode[]> => {
  const parsedContent = parseMessageContent(rawMessage)
  const nextParsedContent: MessageIntermediateNode[] = []
  for (const node of parsedContent) {
    nextParsedContent.push(await parseMathNode(node))
  }
  return nextParsedContent
}

export const getParsedMessageContent = (
  parsedMessages: readonly ParsedMessage[],
  messageId: string,
): readonly MessageIntermediateNode[] | undefined => {
  const parsedMessage = parsedMessages.find((item) => item.id === messageId)
  return parsedMessage?.parsedContent
}

export const setParsedMessageContent = (
  parsedMessages: readonly ParsedMessage[],
  messageId: string,
  text: string,
  parsedContent: readonly MessageIntermediateNode[],
): readonly ParsedMessage[] => {
  const index = parsedMessages.findIndex((item) => item.id === messageId)
  if (index === -1) {
    return [...parsedMessages, { id: messageId, parsedContent, text }]
  }
  const existingItem = parsedMessages[index]
  if (existingItem.text === text && existingItem.parsedContent === parsedContent) {
    return parsedMessages
  }
  return [...parsedMessages.slice(0, index), { ...existingItem, parsedContent, text }, ...parsedMessages.slice(index + 1)]
}

export const copyParsedMessageContent = (
  parsedMessages: readonly ParsedMessage[],
  sourceMessageId: string,
  targetMessageId: string,
): readonly ParsedMessage[] => {
  const parsedMessage = parsedMessages.find((item) => item.id === sourceMessageId)
  if (!parsedMessage) {
    return parsedMessages
  }
  return setParsedMessageContent(parsedMessages, targetMessageId, parsedMessage.text, parsedMessage.parsedContent)
}

export const parseAndStoreMessageContent = async (
  parsedMessages: readonly ParsedMessage[],
  message: ChatMessage,
): Promise<readonly ParsedMessage[]> => {
  const existingParsedMessage = parsedMessages.find((item) => item.id === message.id)
  if (existingParsedMessage && existingParsedMessage.text === message.text) {
    return parsedMessages
  }
  await Promise.resolve()
  const parsedContent = message.text === '' ? emptyMessageContent : await parseMessage(message.text)
  return setParsedMessageContent(parsedMessages, message.id, message.text, parsedContent)
}

export const parseAndStoreMessagesContent = async (
  parsedMessages: readonly ParsedMessage[],
  messages: readonly ChatMessage[],
): Promise<readonly ParsedMessage[]> => {
  let nextParsedMessages = parsedMessages
  for (const message of messages) {
    nextParsedMessages = await parseAndStoreMessageContent(nextParsedMessages, message)
  }
  return nextParsedMessages
}

export const getEmptyMessageContent = (): readonly MessageIntermediateNode[] => {
  return emptyMessageContent
}
