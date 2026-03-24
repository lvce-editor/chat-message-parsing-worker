import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { parseMessageContent } from '../ParseMessageContent/ParseMessageContent.ts'
import * as NetworkCommandMap from './NetworkCommandMap.ts'

export const commandMap = {
  ...NetworkCommandMap.networkCommandMap,
  'ChatParser.parseMessageContent': parseMessageContent,
  'HandleMessagePort.handleMessagePort': handleMessagePort,
}
