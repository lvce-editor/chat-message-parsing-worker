import { expect, test } from '@jest/globals'
import { mockWorkerGlobalRpc } from '@lvce-editor/rpc'
import * as Listen from '../src/parts/Listen/Listen.ts'

test('listen', async () => {
  const { dispose, start } = mockWorkerGlobalRpc()
  const listenPromise = Listen.listen()
  start()
  await listenPromise
  dispose()
  expect(true).toBe(true)
})
