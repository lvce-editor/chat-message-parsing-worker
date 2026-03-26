import type { MessageIntermediateNode } from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'
import { parseBlockTokens } from '../ParseBlockTokens/ParseBlockTokens.ts'
import { scanBlockTokens } from '../ScanBlockTokens/ScanBlockTokens.ts'

export const parseMessageContent = (rawMessage: string): readonly MessageIntermediateNode[] => {
  return parseBlockTokens(scanBlockTokens(rawMessage))
}
