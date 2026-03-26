import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { parseMessageContent } from '../ParseMessageContent/ParseMessageContent.ts'

export const commandMap = {
  'ChatParser.parseMessageContent': parseMessageContent,
  'HandleMessagePort.handleMessagePort': handleMessagePort,
}
