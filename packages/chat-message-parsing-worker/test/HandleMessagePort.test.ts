import { expect, test } from '@jest/globals'
import * as CommandMap from '../src/parts/CommandMap/CommandMap.ts'
import * as HandleMessagePort from '../src/parts/HandleMessagePort/HandleMessagePort.ts'
import * as ParseMessageContent from '../src/parts/ParseMessageContent/ParseMessageContent.ts'
import * as ParseMessageContents from '../src/parts/ParseMessageContents/ParseMessageContents.ts'

test('commandMap exposes handleMessagePort', () => {
  expect(CommandMap.commandMap['HandleMessagePort.handleMessagePort']).toBe(HandleMessagePort.handleMessagePort)
})

test('commandMap exposes parseMessageContent aliases', () => {
  expect(CommandMap.commandMap['ChatMessageParsing.parseMessageContent']).toBe(ParseMessageContent.parseMessageContent)
  expect(CommandMap.commandMap['ChatParser.parseMessageContent']).toBe(ParseMessageContent.parseMessageContent)
})

test('commandMap exposes parseMessageContents aliases', () => {
  expect(CommandMap.commandMap['ChatMessageParsing.parseMessageContents']).toBe(ParseMessageContents.parseMessageContents)
  expect(CommandMap.commandMap['ChatParser.parseMessageContents']).toBe(ParseMessageContents.parseMessageContents)
})

test('handleMessagePort resolves for an open message port', async () => {
  const { port1, port2 } = new MessageChannel()

  await expect(HandleMessagePort.handleMessagePort(port1)).resolves.toBeUndefined()

  port1.close()
  port2.close()
})

test('commandMap initialize resolves for an open message port', async () => {
  const { port1, port2 } = new MessageChannel()

  await expect(CommandMap.commandMap.initialize('', port1)).resolves.toBeUndefined()

  port1.close()
  port2.close()
})
