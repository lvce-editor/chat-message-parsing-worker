import type { MessageIntermediateNode } from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'
import { parseMessageContent } from '../ParseMessageContent/ParseMessageContent.ts'

export const parseMessageContents = (rawMessages: readonly string[]): (readonly MessageIntermediateNode[])[] => {
  return rawMessages.map(parseMessageContent)
}
