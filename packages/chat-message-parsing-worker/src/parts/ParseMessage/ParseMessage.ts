import type { MessageIntermediateNode } from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'
import { parseMathNode } from '../ParseMathNode/ParseMathNode.ts'
import { parseMessageContent } from '../ParseMessageContent/ParseMessageContent.ts'

export const parseMessage = async (rawMessage: string): Promise<readonly MessageIntermediateNode[]> => {
  const parsedContent = parseMessageContent(rawMessage)
  const nextParsedContent: MessageIntermediateNode[] = []
  for (const node of parsedContent) {
    nextParsedContent.push(await parseMathNode(node))
  }
  return nextParsedContent
}
