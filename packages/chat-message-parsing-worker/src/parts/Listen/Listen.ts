import { WebWorkerRpcClient } from '@lvce-editor/rpc'
import * as CommandMap from '../CommandMap/CommandMap.ts'
import { initializeChatMathWorker } from '../InitializeChatMathWorker/InitializeChatMathWorker.ts'

export const listen = async (): Promise<void> => {
  await WebWorkerRpcClient.create({
    commandMap: CommandMap.commandMap,
  })
  await initializeChatMathWorker()
}
