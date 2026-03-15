import type { MessageIntermediateNode } from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'

export interface ParsedMessage {
  readonly id: string
  readonly parsedContent: readonly MessageIntermediateNode[]
  readonly text: string
}
