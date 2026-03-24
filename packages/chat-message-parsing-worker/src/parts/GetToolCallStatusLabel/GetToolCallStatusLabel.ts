import type { ChatToolCall } from '../ChatMessage/ChatMessage.ts'

export const getToolCallStatusLabel = (toolCall: ChatToolCall): string => {
  if (toolCall.status === 'not-found') {
    return ' (not-found)'
  }
  if (toolCall.status === 'error') {
    if (toolCall.errorMessage) {
      return ` (error: ${toolCall.errorMessage})`
    }
    return ' (error)'
  }
  return ''
}
