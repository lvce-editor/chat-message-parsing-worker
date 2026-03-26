import { MessagePortRpcClient } from '@lvce-editor/rpc'
import * as NetworkCommandMap from '../CommandMap/CommandMap.ts'

export const handleMessagePort = async (port: MessagePort): Promise<void> => {
  await MessagePortRpcClient.create({
    commandMap: NetworkCommandMap.commandMap,
    messagePort: port,
  })
}
