import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'

export const initialize = async (_: string, port: MessagePort): Promise<void> => {
  await handleMessagePort(port)
}
