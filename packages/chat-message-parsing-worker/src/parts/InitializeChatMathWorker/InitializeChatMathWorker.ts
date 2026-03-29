import { LazyTransferMessagePortRpcParent } from '@lvce-editor/rpc'
import { ChatMathWorker, RendererWorker } from '@lvce-editor/rpc-registry'

const sendMessagePortToChatMathWorker = async (port: MessagePort): Promise<void> => {
  await RendererWorker.sendMessagePortToChatMathWorker(port, 0)
}

export const initializeChatMathWorker = async (): Promise<void> => {
  const rpc = await LazyTransferMessagePortRpcParent.create({
    commandMap: {},
    send: sendMessagePortToChatMathWorker,
  })
  ChatMathWorker.set(rpc)
}
