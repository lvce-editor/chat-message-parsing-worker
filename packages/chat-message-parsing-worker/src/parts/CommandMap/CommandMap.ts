import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { parseMessageContent } from '../ParseMessageContent/ParseMessageContent.ts'
import { parseMessageContents } from '../ParseMessageContents/ParseMessageContents.ts'

export const commandMap = {
  'ChatParser.parseMessageContent': parseMessageContent,
  'ChatParser.parseMessageContents': parseMessageContents,
  'HandleMessagePort.handleMessagePort': handleMessagePort,
}
