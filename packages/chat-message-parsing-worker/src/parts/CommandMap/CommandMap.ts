import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import * as NetworkCommandMap from './NetworkCommandMap.ts'

export const commandMap = {
  ...NetworkCommandMap.networkCommandMap,
  'HandleMessagePort.handleMessagePort': handleMessagePort,
}
