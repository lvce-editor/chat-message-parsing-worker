import type { ChatMessage } from '../../ChatMessage/ChatMessage.ts'
import type { ChatViewEvent } from '../../ChatViewEvent/ChatViewEvent.ts'

export const toFinalMessages = (events: readonly ChatViewEvent[]): readonly ChatMessage[] => {
  const byId = new Map<string, ChatMessage>()
  let order: string[] = []
  for (const event of events) {
    if (event.type === 'chat-session-messages-replaced') {
      byId.clear()
      order = []
      for (const message of event.messages) {
        byId.set(message.id, message)
        order.push(message.id)
      }
      continue
    }
    if (event.type === 'chat-message-added') {
      byId.set(event.message.id, event.message)
      order.push(event.message.id)
      continue
    }
    if (event.type === 'chat-message-updated') {
      const message = byId.get(event.messageId)
      if (!message) {
        continue
      }
      byId.set(event.messageId, {
        ...message,
        ...(event.inProgress === undefined
          ? {}
          : {
              inProgress: event.inProgress,
            }),
        text: event.text,
        time: event.time,
        ...(event.toolCalls === undefined
          ? {}
          : {
              toolCalls: event.toolCalls,
            }),
      })
    }
  }
  return order.map((id) => byId.get(id)).filter((message) => !!message) as readonly ChatMessage[]
}
