import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { initialize } from '../Initialize/Initialize.ts'
import { parseMessage } from '../ParseMessage/ParseMessage.ts'
import { parseMessageContent } from '../ParseMessageContent/ParseMessageContent.ts'
import { parseMessageContents } from '../ParseMessageContents/ParseMessageContents.ts'

export const commandMap = {
  'ChatMessageParsing.parseMessageContent': parseMessageContent,
  'ChatMessageParsing.parseMessageContents': parseMessageContents,
  'ChatParser.parseMessage': parseMessage,
  'ChatParser.parseMessageContent': parseMessageContent,
  'ChatParser.parseMessageContents': parseMessageContents,
  'HandleMessagePort.handleMessagePort': handleMessagePort,
  initialize: initialize,
}
