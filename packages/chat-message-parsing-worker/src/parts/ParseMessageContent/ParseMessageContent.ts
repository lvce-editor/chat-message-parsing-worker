import type { MessageIntermediateNode } from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'
import { parseBlockTokens } from './ParseBlockTokens.ts'
import { scanBlockTokens } from './ScanBlockTokens.ts'

export const parseMessageContent = async (rawMessage: string): Promise<readonly MessageIntermediateNode[]> => {
  return parseBlockTokens(scanBlockTokens(rawMessage))
}
