import type { ChatMessage } from '../ChatMessage/ChatMessage.ts'

interface ChatViewEventBase {
  readonly sessionId: string
  readonly timestamp: string
}

export interface ChatSessionCreatedEvent extends ChatViewEventBase {
  readonly title: string
  readonly type: 'chat-session-created'
}

export interface ChatSessionDeletedEvent extends ChatViewEventBase {
  readonly type: 'chat-session-deleted'
}

export interface ChatSessionTitleUpdatedEvent extends ChatViewEventBase {
  readonly title: string
  readonly type: 'chat-session-title-updated'
}

export interface ChatMessageAddedEvent extends ChatViewEventBase {
  readonly message: ChatMessage
  readonly type: 'chat-message-added'
}

export interface ChatMessageUpdatedEvent extends ChatViewEventBase {
  readonly inProgress: boolean | undefined
  readonly messageId: string
  readonly text: string
  readonly time: string
  readonly toolCalls?: ChatMessage['toolCalls']
  readonly type: 'chat-message-updated'
}

export interface ChatSessionMessagesReplacedEvent extends ChatViewEventBase {
  readonly messages: readonly ChatMessage[]
  readonly type: 'chat-session-messages-replaced'
}

export interface HandleInputEvent extends ChatViewEventBase {
  readonly type: 'handle-input'
  readonly value: string
}

export interface HandleSubmitEvent extends ChatViewEventBase {
  readonly type: 'handle-submit'
  readonly value: string
}

export interface ChatAttachmentAddedEvent extends ChatViewEventBase {
  readonly attachmentId: string
  readonly blob: Blob
  readonly mimeType: string
  readonly name: string
  readonly size: number
  readonly type: 'chat-attachment-added'
}

export interface DataEvent extends ChatViewEventBase {
  readonly type: 'sse-response-part'
  readonly value: unknown
}

export interface ResponseCompletedEvent extends ChatViewEventBase {
  readonly type: 'sse-response-completed'
  readonly value: unknown
}

export interface EventStreamFinishedEvent extends ChatViewEventBase {
  readonly type: 'event-stream-finished'
  readonly value: '[DONE]'
}

export type ChatViewEvent =
  | ChatSessionCreatedEvent
  | ChatSessionDeletedEvent
  | ChatSessionTitleUpdatedEvent
  | ChatMessageAddedEvent
  | ChatMessageUpdatedEvent
  | ChatSessionMessagesReplacedEvent
  | HandleInputEvent
  | HandleSubmitEvent
  | ChatAttachmentAddedEvent
  | DataEvent
  | ResponseCompletedEvent
  | EventStreamFinishedEvent
