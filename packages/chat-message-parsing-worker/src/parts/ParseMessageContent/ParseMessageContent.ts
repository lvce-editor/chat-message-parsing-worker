import type { MessageIntermediateNode } from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'
import { parseBlockTokens } from './ParseBlockTokens.ts'
import { scanBlockTokens } from './ScanBlockTokens.ts'

export const parseMessageContent = (rawMessage: string): readonly MessageIntermediateNode[] => {
  return parseBlockTokens(scanBlockTokens(rawMessage))
}
