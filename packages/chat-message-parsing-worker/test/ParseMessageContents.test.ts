import { expect, test } from '@jest/globals'
import { parseMessageContents } from '../src/parts/ParseMessageContents/ParseMessageContents.ts'

test('parseMessageContents should parse each message independently', () => {
  expect(parseMessageContents(['hello', '1. first\n2. second'])).toEqual([
    [
      {
        children: [
          {
            text: 'hello',
            type: 'text',
          },
        ],
        type: 'text',
      },
    ],
    [
      {
        items: [
          {
            children: [
              {
                text: 'first',
                type: 'text',
              },
            ],
            type: 'list-item',
          },
          {
            children: [
              {
                text: 'second',
                type: 'text',
              },
            ],
            type: 'list-item',
          },
        ],
        type: 'ordered-list',
      },
    ],
  ])
})

test('parseMessageContents should return an empty array for no messages', () => {
  expect(parseMessageContents([])).toEqual([])
})
