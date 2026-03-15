import { expect, test } from '@jest/globals'
import * as CommandMap from '../src/parts/CommandMap/CommandMap.ts'
import * as HandleMessagePort from '../src/parts/HandleMessagePort/HandleMessagePort.ts'

test('commandMap exposes handleMessagePort', () => {
  expect(CommandMap.commandMap['HandleMessagePort.handleMessagePort']).toBe(HandleMessagePort.handleMessagePort)
})
