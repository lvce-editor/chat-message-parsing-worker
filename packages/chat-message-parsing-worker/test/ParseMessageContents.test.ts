import { expect, test } from '@jest/globals'
import { parseMessageContents } from '../src/parts/ParseMessageContents/ParseMessageContents.ts'

const orderedListItem = (text: string, index: number): { children: readonly [{ text: string; type: 'text' }]; index: number; type: 'list-item' } => ({
  children: [
    {
      text,
      type: 'text' as const,
    },
  ],
  index,
  type: 'list-item' as const,
})

test('parseMessageContents should parse each message independently', (): void => {
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
        items: [orderedListItem('first', 1), orderedListItem('second', 2)],
        type: 'ordered-list',
      },
    ],
  ])
})

test('parseMessageContents should return an empty array for no messages', (): void => {
  expect(parseMessageContents([])).toEqual([])
})
