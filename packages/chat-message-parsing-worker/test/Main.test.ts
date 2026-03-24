import { expect, test } from '@jest/globals'
import { mockWorkerGlobalRpc } from '@lvce-editor/rpc'
import * as Main from '../src/parts/Main/Main.ts'

test('main', async () => {
  const { dispose, start } = mockWorkerGlobalRpc()
  const mainPromise = Main.main()
  start()
  await mainPromise
  dispose()
  expect(true).toBe(true)
})
