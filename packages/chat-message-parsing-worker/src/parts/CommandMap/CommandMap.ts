import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { parseMessageContent } from '../ParseMessageContent/ParseMessageContent.ts'
import { parseMessageContents } from '../ParseMessageContents/ParseMessageContents.ts'

export const commandMap = {
  'ChatMessageParsing.parseMessageContent': parseMessageContent,
  'ChatMessageParsing.parseMessageContents': parseMessageContents,
  'ChatParser.parseMessageContent': parseMessageContent,
  'ChatParser.parseMessageContents': parseMessageContents,
  'HandleMessagePort.handleMessagePort': handleMessagePort,
  initialize: (_: string, port: MessagePort): Promise<void> => handleMessagePort(port),
}
