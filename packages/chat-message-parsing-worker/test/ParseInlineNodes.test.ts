import { expect, test } from '@jest/globals'
import { parseInlineNodes } from '../src/parts/ParseMessageContent/ParseInlineNodes.ts'

test('parseInlineNodes should trim trailing punctuation from raw urls', () => {
  expect(parseInlineNodes('Docs https://example.com/path?q=1).')).toEqual([
    {
      text: 'Docs ',
      type: 'text',
    },
    {
      href: 'https://example.com/path?q=1',
      text: 'https://example.com/path?q=1',
      type: 'link',
    },
    {
      text: ').',
      type: 'text',
    },
  ])
})

test('parseInlineNodes should parse markdown links with nested parentheses', () => {
  expect(parseInlineNodes('[docs](https://example.com/a(b)c)')).toEqual([
    {
      href: 'https://example.com/a(b)c',
      text: 'docs',
      type: 'link',
    },
  ])
})

test('parseInlineNodes should sanitize unsafe relative links and normalize safe ones', () => {
  expect(parseInlineNodes('[safe](./docs//guide.md) [unsafe](../secret.txt) [colon](mailto:test@example.com)')).toEqual([
    {
      href: 'file:///workspace/docs/guide.md',
      text: 'safe',
      type: 'link',
    },
    {
      text: ' ',
      type: 'text',
    },
    {
      href: '#',
      text: 'unsafe',
      type: 'link',
    },
    {
      text: ' ',
      type: 'text',
    },
    {
      href: '#',
      text: 'colon',
      type: 'link',
    },
  ])
})

test('parseInlineNodes should convert absolute filesystem links to file uris', () => {
  expect(
    parseInlineNodes(
      '[README.md](/test/problems-view/README.md) [My Notes](/Users/simon/Projects/My Notes) [README.md](C:\\Users\\Simon\\Documents\\My Notes\\README.md)',
    ),
  ).toEqual([
    {
      href: 'file:///test/problems-view/README.md',
      text: 'README.md',
      type: 'link',
    },
    {
      text: ' ',
      type: 'text',
    },
    {
      href: 'file:///Users/simon/Projects/My%20Notes',
      text: 'My Notes',
      type: 'link',
    },
    {
      text: ' ',
      type: 'text',
    },
    {
      href: 'file:///C:/Users/Simon/Documents/My%20Notes/README.md',
      text: 'README.md',
      type: 'link',
    },
  ])
})

test('parseInlineNodes should sanitize non-http images and keep https images', () => {
  expect(parseInlineNodes('![ok](https://example.com/image.png) ![bad](./image.png)')).toEqual([
    {
      alt: 'ok',
      src: 'https://example.com/image.png',
      type: 'image',
    },
    {
      text: ' ',
      type: 'text',
    },
    {
      alt: 'bad',
      src: '#',
      type: 'image',
    },
  ])
})

test('parseInlineNodes should parse italic content that contains bold content', () => {
  expect(parseInlineNodes('*outer **inner** done*')).toEqual([
    {
      children: [
        {
          text: 'outer ',
          type: 'text',
        },
        {
          children: [
            {
              text: 'inner',
              type: 'text',
            },
          ],
          type: 'bold',
        },
        {
          text: ' done',
          type: 'text',
        },
      ],
      type: 'italic',
    },
  ])
})

test('parseInlineNodes should reject inline math after alphanumeric text but parse display math', () => {
  expect(parseInlineNodes('x$1$ and $$ y $$')).toEqual([
    {
      text: 'x$1$ and ',
      type: 'text',
    },
    {
      displayMode: true,
      text: 'y',
      type: 'math-inline',
    },
  ])
})
