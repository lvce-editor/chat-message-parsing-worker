import { expect, test } from '@jest/globals'
import * as ParseMessageContent from '../src/parts/ParseMessageContent/ParseMessageContent.ts'

const orderedListItem = (
  children: readonly unknown[],
  index: number,
  extra: Record<string, unknown> = {},
): { children: readonly unknown[]; index: number; type: 'list-item' } & Record<string, unknown> => ({
  children,
  index,
  type: 'list-item' as const,
  ...extra,
})

test('parseMessageContent should convert absolute README links in assistant text to file uris', () => {
  const rawMessage = [
    'Done - I removed the Gitpod section from the README.',
    '',
    'Changed file:',
    '- [README.md](/test/problems-view/README.md)',
  ].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'Done - I removed the Gitpod section from the README.',
          type: 'text',
        },
      ],
      type: 'text',
    },
    {
      children: [
        {
          text: 'Changed file:',
          type: 'text',
        },
      ],
      type: 'text',
    },
    {
      items: [
        {
          children: [
            {
              href: 'file:///test/problems-view/README.md',
              text: 'README.md',
              type: 'link',
            },
          ],
          type: 'list-item',
        },
      ],
      type: 'unordered-list',
    },
  ])
})

test('parseMessageContent should parse mixed paragraph and ordered list blocks', () => {
  const rawMessage = [
    'I have access to the following tools:',
    '',
    '1. functions.read_file - Read UTF-8 text content from a file inside the currently open workspace folder. Only pass an absolute URI.',
    '2. functions.write_file - Write UTF-8 text content to a file inside the currently open workspace folder.',
    '3. functions.list_files - List direct children (files and folders) for a folder inside the currently open workspace folder.',
    '',
    'I can also use these tools in parallel when appropriate.',
  ].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'I have access to the following tools:',
          type: 'text',
        },
      ],
      type: 'text',
    },
    {
      items: [
        orderedListItem(
          [
            {
              text: 'functions.read_file - Read UTF-8 text content from a file inside the currently open workspace folder. Only pass an absolute URI.',
              type: 'text',
            },
          ],
          1,
        ),
        orderedListItem(
          [
            {
              text: 'functions.write_file - Write UTF-8 text content to a file inside the currently open workspace folder.',
              type: 'text',
            },
          ],
          2,
        ),
        orderedListItem(
          [
            {
              text: 'functions.list_files - List direct children (files and folders) for a folder inside the currently open workspace folder.',
              type: 'text',
            },
          ],
          3,
        ),
      ],
      type: 'ordered-list',
    },
    {
      children: [
        {
          text: 'I can also use these tools in parallel when appropriate.',
          type: 'text',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should keep ordered list items together across blank lines', () => {
  const rawMessage = ['1. First item', '', '2. Second item', '', '3. Third item'].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      items: [
        orderedListItem([{ text: 'First item', type: 'text' }], 1),
        orderedListItem([{ text: 'Second item', type: 'text' }], 2),
        orderedListItem([{ text: 'Third item', type: 'text' }], 3),
      ],
      type: 'ordered-list',
    },
  ])
})

test('parseMessageContent should return a text node for empty messages', () => {
  const result = ParseMessageContent.parseMessageContent('')

  expect(result).toEqual([
    {
      children: [
        {
          text: '',
          type: 'text',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should parse markdown links in paragraphs and lists', () => {
  const rawMessage = [
    'Forecast source: [source one](https://example.com/forecast?location=paris)',
    '',
    '1. Climate normals: [source two](https://example.org/climate/paris-march)',
  ].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'Forecast source: ',
          type: 'text',
        },
        {
          href: 'https://example.com/forecast?location=paris',
          text: 'source one',
          type: 'link',
        },
      ],
      type: 'text',
    },
    {
      items: [
        orderedListItem(
          [
            {
              text: 'Climate normals: ',
              type: 'text',
            },
            {
              href: 'https://example.org/climate/paris-march',
              text: 'source two',
              type: 'link',
            },
          ],
          1,
        ),
      ],
      type: 'ordered-list',
    },
  ])
})

test('parseMessageContent should sanitize non-http markdown links', () => {
  const rawMessage = [
    'Unsafe script: [click](javascript:alert(1))',
    'Inline data: [data](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
    'Blob source: [blob](blob:https://example.com/abc-123)',
    'File ref: [index.ts](file:///workspace/src/index.ts)',
    'VS Code ref: [main.ts](vscode-references:///workspace/src/main.ts)',
    'Allowed: [safe](https://example.com/docs)',
  ].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'Unsafe script: ',
          type: 'text',
        },
        {
          href: '#',
          text: 'click',
          type: 'link',
        },
        {
          text: '\nInline data: ',
          type: 'text',
        },
        {
          href: '#',
          text: 'data',
          type: 'link',
        },
        {
          text: '\nBlob source: ',
          type: 'text',
        },
        {
          href: '#',
          text: 'blob',
          type: 'link',
        },
        {
          text: '\nFile ref: ',
          type: 'text',
        },
        {
          href: 'file:///workspace/src/index.ts',
          text: 'index.ts',
          type: 'link',
        },
        {
          text: '\nVS Code ref: ',
          type: 'text',
        },
        {
          href: 'vscode-references:///workspace/src/main.ts',
          text: 'main.ts',
          type: 'link',
        },
        {
          text: '\nAllowed: ',
          type: 'text',
        },
        {
          href: 'https://example.com/docs',
          text: 'safe',
          type: 'link',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should map relative markdown file links to workspace file uris', () => {
  const result = ParseMessageContent.parseMessageContent('Files: [index.ts](src/index.ts), [app.ts](./src/app.ts), [main.ts](src\\\\main.ts)')

  expect(result).toEqual([
    {
      children: [
        {
          text: 'Files: ',
          type: 'text',
        },
        {
          href: 'file:///workspace/src/index.ts',
          text: 'index.ts',
          type: 'link',
        },
        {
          text: ', ',
          type: 'text',
        },
        {
          href: 'file:///workspace/src/app.ts',
          text: 'app.ts',
          type: 'link',
        },
        {
          text: ', ',
          type: 'text',
        },
        {
          href: 'file:///workspace/src/main.ts',
          text: 'main.ts',
          type: 'link',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should sanitize unsafe relative markdown file links', () => {
  const result = ParseMessageContent.parseMessageContent('Unsafe: [p](../secret.ts), [q](/etc/passwd), [r](mailto:user@example.com)')

  expect(result).toEqual([
    {
      children: [
        {
          text: 'Unsafe: ',
          type: 'text',
        },
        {
          href: '#',
          text: 'p',
          type: 'link',
        },
        {
          text: ', ',
          type: 'text',
        },
        {
          href: '#',
          text: 'q',
          type: 'link',
        },
        {
          text: ', ',
          type: 'text',
        },
        {
          href: '#',
          text: 'r',
          type: 'link',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should parse markdown links with parentheses in urls', () => {
  const result = ParseMessageContent.parseMessageContent('Reference: [API](https://example.com/query(arg))')

  expect(result).toEqual([
    {
      children: [
        {
          text: 'Reference: ',
          type: 'text',
        },
        {
          href: 'https://example.com/query(arg)',
          text: 'API',
          type: 'link',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should parse raw https urls followed by quote and parenthesis', () => {
  const result = ParseMessageContent.parseMessageContent('Service notice: https://www.protezionecivile.gov.it")BE AWARE')

  expect(result).toEqual([
    {
      children: [
        {
          text: 'Service notice: ',
          type: 'text',
        },
        {
          href: 'https://www.protezionecivile.gov.it',
          text: 'https://www.protezionecivile.gov.it',
          type: 'link',
        },
        {
          text: '")BE AWARE',
          type: 'text',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should not parse markdown link with empty text', () => {
  const result = ParseMessageContent.parseMessageContent('[](https://example.com)')

  expect(result).toEqual([
    {
      children: [
        {
          text: '[](https://example.com)',
          type: 'text',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should not parse raw url inside unclosed markdown link destination', () => {
  const result = ParseMessageContent.parseMessageContent('See [documentation](https://example.com/docs')

  expect(result).toEqual([
    {
      children: [
        {
          text: 'See [documentation](https://example.com/docs',
          type: 'text',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should parse markdown images', () => {
  const result = ParseMessageContent.parseMessageContent('Preview: ![This is an image](http://invalid-url)')

  expect(result).toEqual([
    {
      children: [
        {
          text: 'Preview: ',
          type: 'text',
        },
        {
          alt: 'This is an image',
          src: 'http://invalid-url',
          type: 'image',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should parse markdown bold text in paragraphs', () => {
  const rawMessage = 'For **Transport Agnostic**: It can work over various transport protocols, including HTTP, WebSocket, and others.'

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'For ',
          type: 'text',
        },
        {
          children: [
            {
              text: 'Transport Agnostic',
              type: 'text',
            },
          ],
          type: 'bold',
        },
        {
          text: ': It can work over various transport protocols, including HTTP, WebSocket, and others.',
          type: 'text',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should parse markdown italic text in paragraphs', () => {
  const rawMessage = 'For *asynchronous*: Supports both synchronous and asynchronous communication.'

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'For ',
          type: 'text',
        },
        {
          children: [
            {
              text: 'asynchronous',
              type: 'text',
            },
          ],
          type: 'italic',
        },
        {
          text: ': Supports both synchronous and asynchronous communication.',
          type: 'text',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should parse markdown italic text across multiple lines in paragraphs', () => {
  const rawMessage = '*line one\nline two*'

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          children: [
            {
              text: 'line one\nline two',
              type: 'text',
            },
          ],
          type: 'italic',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should parse markdown strikethrough text in paragraphs', () => {
  const rawMessage = 'Please use ~~strikethrough~~ formatting.'

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'Please use ',
          type: 'text',
        },
        {
          children: [
            {
              text: 'strikethrough',
              type: 'text',
            },
          ],
          type: 'strikethrough',
        },
        {
          text: ' formatting.',
          type: 'text',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should parse markdown bold nested inside italic', () => {
  const rawMessage = '*italic with **bold** inside*'

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          children: [
            {
              text: 'italic with ',
              type: 'text',
            },
            {
              children: [
                {
                  text: 'bold',
                  type: 'text',
                },
              ],
              type: 'bold',
            },
            {
              text: ' inside',
              type: 'text',
            },
          ],
          type: 'italic',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should parse markdown bold+italic with triple asterisks', () => {
  const rawMessage = 'This should be ***both*** styles'

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'This should be ',
          type: 'text',
        },
        {
          children: [
            {
              children: [
                {
                  text: 'both',
                  type: 'text',
                },
              ],
              type: 'italic',
            },
          ],
          type: 'bold',
        },
        {
          text: ' styles',
          type: 'text',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should parse markdown unordered list blocks', () => {
  const rawMessage = ['I can help with:', '', '- Reading project files', '- Running tests', '- Explaining errors'].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'I can help with:',
          type: 'text',
        },
      ],
      type: 'text',
    },
    {
      items: [
        {
          children: [
            {
              text: 'Reading project files',
              type: 'text',
            },
          ],
          type: 'list-item',
        },
        {
          children: [
            {
              text: 'Running tests',
              type: 'text',
            },
          ],
          type: 'list-item',
        },
        {
          children: [
            {
              text: 'Explaining errors',
              type: 'text',
            },
          ],
          type: 'list-item',
        },
      ],
      type: 'unordered-list',
    },
  ])
})

test('parseMessageContent should nest indented unordered items inside ordered list items', () => {
  const rawMessage = [
    // cspell:ignore Ligurians
    '1. Ancient and Medieval Periods:',
    ' - Inhabited since prehistoric times.',
    ' - Settled by the Ligurians.',
    '2. The Grimaldi Family:',
    ' - Captured the fortress in 1297.',
  ].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      items: [
        {
          children: [
            {
              text: 'Ancient and Medieval Periods:',
              type: 'text',
            },
          ],
          index: 1,
          nestedItems: [
            {
              children: [
                {
                  text: 'Inhabited since prehistoric times.',
                  type: 'text',
                },
              ],
              type: 'list-item',
            },
            {
              children: [
                {
                  text: 'Settled by the Ligurians.',
                  type: 'text',
                },
              ],
              type: 'list-item',
            },
          ],
          nestedListType: 'unordered-list',
          type: 'list-item',
        },
        {
          children: [
            {
              text: 'The Grimaldi Family:',
              type: 'text',
            },
          ],
          index: 2,
          nestedItems: [
            {
              children: [
                {
                  text: 'Captured the fortress in 1297.',
                  type: 'text',
                },
              ],
              type: 'list-item',
            },
          ],
          nestedListType: 'unordered-list',
          type: 'list-item',
        },
      ],
      type: 'ordered-list',
    },
  ])
})

test('parseMessageContent should nest indented ordered items inside ordered list items', () => {
  const rawMessage = ['1. L1', '   1. L2', '      1. L3'].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      items: [
        {
          ...orderedListItem([{ text: 'L1', type: 'text' }], 1, {
            nestedItems: [
              orderedListItem([{ text: 'L2', type: 'text' }], 1, {
                nestedItems: [orderedListItem([{ text: 'L3', type: 'text' }], 1)],
                nestedListType: 'ordered-list',
              }),
            ],
            nestedListType: 'ordered-list',
          }),
        },
      ],
      type: 'ordered-list',
    },
  ])
})

test('parseMessageContent should parse markdown unordered list blocks with star markers', () => {
  const rawMessage = ['I can help with:', '', '* Reading project files', '* Running tests', '* Explaining errors'].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'I can help with:',
          type: 'text',
        },
      ],
      type: 'text',
    },
    {
      items: [
        {
          children: [
            {
              text: 'Reading project files',
              type: 'text',
            },
          ],
          type: 'list-item',
        },
        {
          children: [
            {
              text: 'Running tests',
              type: 'text',
            },
          ],
          type: 'list-item',
        },
        {
          children: [
            {
              text: 'Explaining errors',
              type: 'text',
            },
          ],
          type: 'list-item',
        },
      ],
      type: 'unordered-list',
    },
  ])
})

test('parseMessageContent should parse unordered list blocks from escaped newlines', () => {
  const rawMessage =
    "The Python file is a program to display the Fibonacci sequence up to the n-th term specified by the user.\\n\\nHere's a summary of what it does:\\n- It prompts the user to enter how many terms of the Fibonacci sequence they want to see.\\n- It checks if the input is a positive integer.\\n- If the input is 1, it prints the first term (0).\\n- If the input is greater than 1, it generates and prints the Fibonacci sequence up to the specified number of terms. The sequence starts with 0 and 1, and each subsequent term is the sum of the previous two.\\n\\nWould you like me to explain the code line-by-line?"

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'The Python file is a program to display the Fibonacci sequence up to the n-th term specified by the user.',
          type: 'text',
        },
      ],
      type: 'text',
    },
    {
      children: [
        {
          text: "Here's a summary of what it does:",
          type: 'text',
        },
      ],
      type: 'text',
    },
    {
      items: [
        {
          children: [
            {
              text: 'It prompts the user to enter how many terms of the Fibonacci sequence they want to see.',
              type: 'text',
            },
          ],
          type: 'list-item',
        },
        {
          children: [
            {
              text: 'It checks if the input is a positive integer.',
              type: 'text',
            },
          ],
          type: 'list-item',
        },
        {
          children: [
            {
              text: 'If the input is 1, it prints the first term (0).',
              type: 'text',
            },
          ],
          type: 'list-item',
        },
        {
          children: [
            {
              text: 'If the input is greater than 1, it generates and prints the Fibonacci sequence up to the specified number of terms. The sequence starts with 0 and 1, and each subsequent term is the sum of the previous two.',
              type: 'text',
            },
          ],
          type: 'list-item',
        },
      ],
      type: 'unordered-list',
    },
    {
      children: [
        {
          text: 'Would you like me to explain the code line-by-line?',
          type: 'text',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should parse markdown table blocks', () => {
  const rawMessage = [
    'Here is the latest inventory:',
    '',
    '| Item | Quantity | Price |',
    '|------|----------|-------|',
    '| Apples | 4 | $0.50 |',
    '| Bread | 1 | $2.00 |',
  ].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'Here is the latest inventory:',
          type: 'text',
        },
      ],
      type: 'text',
    },
    {
      headers: [
        {
          children: [
            {
              text: 'Item',
              type: 'text',
            },
          ],
          type: 'table-cell',
        },
        {
          children: [
            {
              text: 'Quantity',
              type: 'text',
            },
          ],
          type: 'table-cell',
        },
        {
          children: [
            {
              text: 'Price',
              type: 'text',
            },
          ],
          type: 'table-cell',
        },
      ],
      rows: [
        {
          cells: [
            {
              children: [
                {
                  text: 'Apples',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
            {
              children: [
                {
                  text: '4',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
            {
              children: [
                {
                  text: '$0.50',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
          ],
          type: 'table-row',
        },
        {
          cells: [
            {
              children: [
                {
                  text: 'Bread',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
            {
              children: [
                {
                  text: '1',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
            {
              children: [
                {
                  text: '$2.00',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
          ],
          type: 'table-row',
        },
      ],
      type: 'table',
    },
  ])
})

test('parseMessageContent should parse single-column markdown table and keep heading marker text in cells', () => {
  const rawMessage = ['| Section |', '|---|', '| ### Nested heading |'].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      headers: [
        {
          children: [
            {
              text: 'Section',
              type: 'text',
            },
          ],
          type: 'table-cell',
        },
      ],
      rows: [
        {
          cells: [
            {
              children: [
                {
                  text: '### Nested heading',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
          ],
          type: 'table-row',
        },
      ],
      type: 'table',
    },
  ])
})

test('parseMessageContent should parse one-line markdown table rows', () => {
  const rawMessage =
    '| Item | Quantity | Price (per unit) | Category | |--------------|----------|------------------|-------------| | Apples | 4 | $0.50 | Fruits | | Bread | 1 | $2.00 | Bakery |'

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      headers: [
        {
          children: [
            {
              text: 'Item',
              type: 'text',
            },
          ],
          type: 'table-cell',
        },
        {
          children: [
            {
              text: 'Quantity',
              type: 'text',
            },
          ],
          type: 'table-cell',
        },
        {
          children: [
            {
              text: 'Price (per unit)',
              type: 'text',
            },
          ],
          type: 'table-cell',
        },
        {
          children: [
            {
              text: 'Category',
              type: 'text',
            },
          ],
          type: 'table-cell',
        },
      ],
      rows: [
        {
          cells: [
            {
              children: [
                {
                  text: 'Apples',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
            {
              children: [
                {
                  text: '4',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
            {
              children: [
                {
                  text: '$0.50',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
            {
              children: [
                {
                  text: 'Fruits',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
          ],
          type: 'table-row',
        },
        {
          cells: [
            {
              children: [
                {
                  text: 'Bread',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
            {
              children: [
                {
                  text: '1',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
            {
              children: [
                {
                  text: '$2.00',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
            {
              children: [
                {
                  text: 'Bakery',
                  type: 'text',
                },
              ],
              type: 'table-cell',
            },
          ],
          type: 'table-row',
        },
      ],
      type: 'table',
    },
  ])
})

test('parseMessageContent should parse fenced code blocks', () => {
  const rawMessage = [
    'Here is JSON-RPC request body:',
    '',
    '```json',
    '{ "jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1 }',
    '```',
  ].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'Here is JSON-RPC request body:',
          type: 'text',
        },
      ],
      type: 'text',
    },
    {
      codeTokens: [
        { className: '', text: '{ ' },
        { className: 'TokenProperty', text: '"jsonrpc"' },
        { className: '', text: ': ' },
        { className: 'TokenString', text: '"2.0"' },
        { className: '', text: ', ' },
        { className: 'TokenProperty', text: '"method"' },
        { className: '', text: ': ' },
        { className: 'TokenString', text: '"subtract"' },
        { className: '', text: ', ' },
        { className: 'TokenProperty', text: '"params"' },
        { className: '', text: ': [' },
        { className: 'TokenNumber', text: '42' },
        { className: '', text: ', ' },
        { className: 'TokenNumber', text: '23' },
        { className: '', text: '], ' },
        { className: 'TokenProperty', text: '"id"' },
        { className: '', text: ': ' },
        { className: 'TokenNumber', text: '1' },
        { className: '', text: ' }' },
      ],
      language: 'json',
      text: '{ "jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1 }',
      type: 'code-block',
    },
  ])
})

test('parseMessageContent should parse markdown heading blocks', () => {
  const rawMessage = ['# Heading 1', '## Heading 2', '### Heading 3', '#### Heading 4', '##### Heading 5', '###### Heading 6'].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'Heading 1',
          type: 'text',
        },
      ],
      level: 1,
      type: 'heading',
    },
    {
      children: [
        {
          text: 'Heading 2',
          type: 'text',
        },
      ],
      level: 2,
      type: 'heading',
    },
    {
      children: [
        {
          text: 'Heading 3',
          type: 'text',
        },
      ],
      level: 3,
      type: 'heading',
    },
    {
      children: [
        {
          text: 'Heading 4',
          type: 'text',
        },
      ],
      level: 4,
      type: 'heading',
    },
    {
      children: [
        {
          text: 'Heading 5',
          type: 'text',
        },
      ],
      level: 5,
      type: 'heading',
    },
    {
      children: [
        {
          text: 'Heading 6',
          type: 'text',
        },
      ],
      level: 6,
      type: 'heading',
    },
  ])
})

// eslint-disable-next-line @cspell/spellchecker
test('parseMessageContent should parse markdown blockquotes with nested list and inline formatting', () => {
  const rawMessage = ['> This is a quote.', '> ', '> - It can contain lists.', '> - **Bold text**', '> - `Inline code`'].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          children: [
            {
              text: 'This is a quote.',
              type: 'text',
            },
          ],
          type: 'text',
        },
        {
          items: [
            {
              children: [
                {
                  text: 'It can contain lists.',
                  type: 'text',
                },
              ],
              type: 'list-item',
            },
            {
              children: [
                {
                  children: [
                    {
                      text: 'Bold text',
                      type: 'text',
                    },
                  ],
                  type: 'bold',
                },
              ],
              type: 'list-item',
            },
            {
              children: [
                {
                  text: 'Inline code',
                  type: 'inline-code',
                },
              ],
              type: 'list-item',
            },
          ],
          type: 'unordered-list',
        },
      ],
      type: 'blockquote',
    },
  ])
})

test('parseMessageContent should parse markdown inline math', () => {
  const result = ParseMessageContent.parseMessageContent('Quadratic roots are $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.')

  expect(result).toEqual([
    {
      children: [
        {
          text: 'Quadratic roots are ',
          type: 'text',
        },
        {
          displayMode: false,
          text: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
          type: 'math-inline',
        },
        {
          text: '.',
          type: 'text',
        },
      ],
      type: 'text',
    },
  ])
})

test('parseMessageContent should parse markdown block math with double dollar delimiters', () => {
  const rawMessage = ['For ax^2 + bx + c = 0:', '', '$$', 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', '$$'].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      children: [
        {
          text: 'For ax^2 + bx + c = 0:',
          type: 'text',
        },
      ],
      type: 'text',
    },
    {
      text: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
      type: 'math-block',
    },
  ])
})

test('parseMessageContent should not parse math inside fenced code blocks', () => {
  const rawMessage = ['```ts', 'const value = "$x$"', '```'].join('\n')

  const result = ParseMessageContent.parseMessageContent(rawMessage)

  expect(result).toEqual([
    {
      codeTokens: [
        { className: 'TokenKeyword', text: 'const' },
        { className: '', text: ' value = ' },
        { className: 'TokenString', text: '"$x$"' },
      ],
      language: 'ts',
      text: 'const value = "$x$"',
      type: 'code-block',
    },
  ])
})
