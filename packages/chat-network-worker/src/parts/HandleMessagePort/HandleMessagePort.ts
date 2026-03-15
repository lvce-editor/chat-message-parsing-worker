import { MessagePortRpcClient } from '@lvce-editor/rpc'
import * as NetworkCommandMap from '../CommandMap/NetworkCommandMap.ts'

export const handleMessagePort = async (port: MessagePort): Promise<void> => {
  await MessagePortRpcClient.create({
    commandMap: NetworkCommandMap.networkCommandMap,
    messagePort: port,
  })
}
