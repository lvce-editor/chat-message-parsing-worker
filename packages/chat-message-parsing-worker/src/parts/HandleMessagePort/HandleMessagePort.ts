import { PlainMessagePortRpc } from '@lvce-editor/rpc'
import { commandMap } from '../CommandMap/CommandMap.ts'

export const handleMessagePort = async (port: MessagePort): Promise<void> => {
  await PlainMessagePortRpc.create({
    commandMap: commandMap,
    isMessagePortOpen: true,
    messagePort: port,
  })
}
