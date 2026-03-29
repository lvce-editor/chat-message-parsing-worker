import { expect, test } from '@jest/globals'
import type { BlockToken } from '../src/parts/ParseMessageContent/ScanBlockTokens.ts'
import { parseBlockTokens } from '../src/parts/ParseMessageContent/ParseBlockTokens.ts'

const textNode = (text: string): ReturnType<typeof parseBlockTokens>[number] => ({
  children: [{ text, type: 'text' as const }],
  type: 'text' as const,
})

const listItem = (text: string, index?: number): { children: readonly [{ text: string; type: 'text' }]; index?: number; type: 'list-item' } => ({
  children: [{ text, type: 'text' }],
  ...(index === undefined ? {} : { index }),
  type: 'list-item',
})

test('parseBlockTokens should return empty text node for empty input', () => {
  expect(parseBlockTokens([])).toEqual([textNode('')])
})

test('parseBlockTokens should merge paragraph lines and split on blank line', () => {
  const tokens: readonly BlockToken[] = [
    { text: 'first line', type: 'paragraph-line' },
    { text: 'second line', type: 'paragraph-line' },
    { type: 'blank-line' },
    { text: 'third line', type: 'paragraph-line' },
  ]

  expect(parseBlockTokens(tokens)).toEqual([textNode('first line\nsecond line'), textNode('third line')])
})

test('parseBlockTokens should parse code block with language', () => {
  const tokens: readonly BlockToken[] = [
    { text: 'before', type: 'paragraph-line' },
    { language: 'ts', text: 'const x = 1', type: 'code-block' },
    { text: 'after', type: 'paragraph-line' },
  ]

  expect(parseBlockTokens(tokens)).toEqual([
    textNode('before'),
    {
      codeTokens: [
        { className: 'TokenKeyword', text: 'const' },
        { className: '', text: ' x = ' },
        { className: 'TokenNumber', text: '1' },
      ],
      language: 'ts',
      text: 'const x = 1',
      type: 'code-block',
    },
    textNode('after'),
  ])
})

test('parseBlockTokens should parse code block without language', () => {
  const tokens: readonly BlockToken[] = [{ text: 'echo ok', type: 'code-block' }]

  expect(parseBlockTokens(tokens)).toEqual([
    {
      codeTokens: [{ className: '', text: 'echo ok' }],
      text: 'echo ok',
      type: 'code-block',
    },
  ])
})

test('parseBlockTokens should parse math block', () => {
  const tokens: readonly BlockToken[] = [{ text: 'x + y = z', type: 'math-block' }]

  expect(parseBlockTokens(tokens)).toEqual([{ text: 'x + y = z', type: 'math-block' }])
})

test('parseBlockTokens should parse thematic break', () => {
  const tokens: readonly BlockToken[] = [{ type: 'thematic-break' }]

  expect(parseBlockTokens(tokens)).toEqual([{ type: 'thematic-break' }])
})

test('parseBlockTokens should parse heading line', () => {
  const tokens: readonly BlockToken[] = [{ level: 2, text: 'Heading', type: 'heading-line' }]

  expect(parseBlockTokens(tokens)).toEqual([
    {
      children: [{ text: 'Heading', type: 'text' }],
      level: 2,
      type: 'heading',
    },
  ])
})

test('parseBlockTokens should parse blockquote and recurse into nested blocks', () => {
  const tokens: readonly BlockToken[] = [
    { text: 'quoted', type: 'blockquote-line' },
    { text: '1. nested', type: 'blockquote-line' },
    { text: '| a | b |', type: 'blockquote-line' },
    { text: '| --- | --- |', type: 'blockquote-line' },
    { text: '| c | d |', type: 'blockquote-line' },
  ]

  expect(parseBlockTokens(tokens)).toEqual([
    {
      children: [
        textNode('quoted'),
        {
          items: [listItem('nested', 1)],
          type: 'ordered-list',
        },
        {
          headers: [
            { children: [{ text: 'a', type: 'text' }], type: 'table-cell' },
            { children: [{ text: 'b', type: 'text' }], type: 'table-cell' },
          ],
          rows: [
            {
              cells: [
                { children: [{ text: 'c', type: 'text' }], type: 'table-cell' },
                { children: [{ text: 'd', type: 'text' }], type: 'table-cell' },
              ],
              type: 'table-row',
            },
          ],
          type: 'table',
        },
      ],
      type: 'blockquote',
    },
  ])
})

test('parseBlockTokens should parse table with matching separator and filter mismatched rows', () => {
  const tokens: readonly BlockToken[] = [
    { cells: ['h1', 'h2'], line: '| h1 | h2 |', type: 'table-row-line' },
    { cells: ['---', ':---:'], line: '| --- | :---: |', type: 'table-row-line' },
    { cells: ['r1', 'r2'], line: '| r1 | r2 |', type: 'table-row-line' },
    { cells: ['skip'], line: '| skip |', type: 'table-row-line' },
    { cells: ['r3', 'r4'], line: '| r3 | r4 |', type: 'table-row-line' },
  ]

  expect(parseBlockTokens(tokens)).toEqual([
    {
      headers: [
        { children: [{ text: 'h1', type: 'text' }], type: 'table-cell' },
        { children: [{ text: 'h2', type: 'text' }], type: 'table-cell' },
      ],
      rows: [
        {
          cells: [
            { children: [{ text: 'r1', type: 'text' }], type: 'table-cell' },
            { children: [{ text: 'r2', type: 'text' }], type: 'table-cell' },
          ],
          type: 'table-row',
        },
        {
          cells: [
            { children: [{ text: 'r3', type: 'text' }], type: 'table-cell' },
            { children: [{ text: 'r4', type: 'text' }], type: 'table-cell' },
          ],
          type: 'table-row',
        },
      ],
      type: 'table',
    },
  ])
})

test('parseBlockTokens should treat table-looking lines as paragraph when separator is invalid', () => {
  const tokens: readonly BlockToken[] = [
    { cells: ['h1', 'h2'], line: '| h1 | h2 |', type: 'table-row-line' },
    { cells: ['--', '---'], line: '| -- | --- |', type: 'table-row-line' },
  ]

  expect(parseBlockTokens(tokens)).toEqual([textNode('| h1 | h2 |\n| -- | --- |')])
})

test('parseBlockTokens should parse ordered list items', () => {
  const tokens: readonly BlockToken[] = [
    { indentation: 0, text: 'one', type: 'ordered-list-item-line' },
    { indentation: 0, text: 'two', type: 'ordered-list-item-line' },
  ]

  expect(parseBlockTokens(tokens)).toEqual([
    {
      items: [listItem('one', 1), listItem('two', 2)],
      type: 'ordered-list',
    },
  ])
})

test('parseBlockTokens should parse unordered list items', () => {
  const tokens: readonly BlockToken[] = [
    { indentation: 0, text: 'one', type: 'unordered-list-item-line' },
    { indentation: 0, text: 'two', type: 'unordered-list-item-line' },
  ]

  expect(parseBlockTokens(tokens)).toEqual([
    {
      items: [
        { children: [{ text: 'one', type: 'text' }], type: 'list-item' },
        { children: [{ text: 'two', type: 'text' }], type: 'list-item' },
      ],
      type: 'unordered-list',
    },
  ])
})

test('parseBlockTokens should flush list when switching ordered to unordered', () => {
  const tokens: readonly BlockToken[] = [
    { indentation: 0, text: 'one', type: 'ordered-list-item-line' },
    { indentation: 0, text: 'two', type: 'unordered-list-item-line' },
  ]

  expect(parseBlockTokens(tokens)).toEqual([
    {
      items: [listItem('one', 1)],
      type: 'ordered-list',
    },
    {
      items: [listItem('two')],
      type: 'unordered-list',
    },
  ])
})

test('parseBlockTokens should nest ordered list item by indentation path', () => {
  const tokens: readonly BlockToken[] = [
    { indentation: 0, text: 'parent', type: 'ordered-list-item-line' },
    { indentation: 2, text: 'child', type: 'ordered-list-item-line' },
    { indentation: 0, text: 'sibling', type: 'ordered-list-item-line' },
  ]

  expect(parseBlockTokens(tokens)).toEqual([
    {
      items: [
        {
          children: [{ text: 'parent', type: 'text' }],
          index: 1,
          nestedItems: [listItem('child', 1)],
          nestedListType: 'ordered-list',
          type: 'list-item',
        },
        {
          children: [{ text: 'sibling', type: 'text' }],
          index: 2,
          type: 'list-item',
        },
      ],
      type: 'ordered-list',
    },
  ])
})

test('parseBlockTokens should nest unordered list item under ordered parent by indentation path', () => {
  const tokens: readonly BlockToken[] = [
    { indentation: 0, text: 'parent', type: 'ordered-list-item-line' },
    { indentation: 2, text: 'child bullet', type: 'unordered-list-item-line' },
  ]

  expect(parseBlockTokens(tokens)).toEqual([
    {
      items: [
        {
          children: [{ text: 'parent', type: 'text' }],
          index: 1,
          nestedItems: [listItem('child bullet')],
          nestedListType: 'unordered-list',
          type: 'list-item',
        },
      ],
      type: 'ordered-list',
    },
  ])
})

test('parseBlockTokens should fall back to top-level item when nested ordered parent path cannot be resolved', () => {
  const tokens: readonly BlockToken[] = [
    { indentation: 2, text: 'starts indented', type: 'ordered-list-item-line' },
    { indentation: 1, text: 'no parent with lower indent', type: 'ordered-list-item-line' },
  ]

  expect(parseBlockTokens(tokens)).toEqual([
    {
      items: [listItem('starts indented', 1), listItem('no parent with lower indent', 2)],
      type: 'ordered-list',
    },
  ])
})

test('parseBlockTokens should flush list before heading and continue paragraph after heading', () => {
  const tokens: readonly BlockToken[] = [
    { indentation: 0, text: 'item', type: 'unordered-list-item-line' },
    { level: 3, text: 'title', type: 'heading-line' },
    { text: 'after heading', type: 'paragraph-line' },
  ]

  expect(parseBlockTokens(tokens)).toEqual([
    {
      items: [{ children: [{ text: 'item', type: 'text' }], type: 'list-item' }],
      type: 'unordered-list',
    },
    {
      children: [{ text: 'title', type: 'text' }],
      level: 3,
      type: 'heading',
    },
    textNode('after heading'),
  ])
})
