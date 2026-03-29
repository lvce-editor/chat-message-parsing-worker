import { expect, test } from '@jest/globals'
import { VirtualDomElements } from '@lvce-editor/virtual-dom-worker'
import * as ParseHtmlToVirtualDom from '../src/parts/ParseHtmlToVirtualDom/ParseHtmlToVirtualDom.ts'

test('parseHtmlToVirtualDom should parse block and inline nodes', () => {
  const result = ParseHtmlToVirtualDom.parseHtmlToVirtualDom('<div class="card"><p>Hello <strong>World</strong></p></div>')

  expect(result).toEqual([
    {
      childCount: 1,
      className: 'card',
      type: VirtualDomElements.Div,
    },
    {
      childCount: 2,
      type: VirtualDomElements.P,
    },
    expect.objectContaining({
      text: 'Hello ',
    }),
    {
      childCount: 1,
      type: VirtualDomElements.Strong,
    },
    expect.objectContaining({
      text: 'World',
    }),
  ])
})

test('parseHtmlToVirtualDom should sanitize non-http href', () => {
  const result = ParseHtmlToVirtualDom.parseHtmlToVirtualDom('<a href="javascript:alert(1)">Open</a>')

  expect(result[0]).toEqual({
    childCount: 1,
    href: '#',
    type: VirtualDomElements.A,
  })
})

test('parseHtmlToVirtualDom should sanitize data href', () => {
  const result = ParseHtmlToVirtualDom.parseHtmlToVirtualDom('<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Open</a>')

  expect(result[0]).toEqual({
    childCount: 1,
    href: '#',
    type: VirtualDomElements.A,
  })
})

test('parseHtmlToVirtualDom should keep img src attribute', () => {
  const result = ParseHtmlToVirtualDom.parseHtmlToVirtualDom('<img src="https://example.com/image.png" alt="Preview" />')

  expect(result[0]).toEqual({
    childCount: 0,
    src: 'https://example.com/image.png',
    type: VirtualDomElements.Img,
  })
})

test('parseHtmlToVirtualDom should sanitize javascript img src', () => {
  const result = ParseHtmlToVirtualDom.parseHtmlToVirtualDom('<img src="javascript:alert(1)" />')

  expect(result[0]).toEqual({
    childCount: 0,
    src: '#',
    type: VirtualDomElements.Img,
  })
})

test('parseHtmlToVirtualDom should sanitize data img src', () => {
  // eslint-disable-next-line @cspell/spellchecker
  const result = ParseHtmlToVirtualDom.parseHtmlToVirtualDom('<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==" />')

  expect(result[0]).toEqual({
    childCount: 0,
    src: '#',
    type: VirtualDomElements.Img,
  })
})

test('parseHtmlToVirtualDom should sanitize blob img src', () => {
  const result = ParseHtmlToVirtualDom.parseHtmlToVirtualDom('<img src="blob:https://example.com/abc-123" />')

  expect(result[0]).toEqual({
    childCount: 0,
    src: '#',
    type: VirtualDomElements.Img,
  })
})

test('parseHtmlToVirtualDomWithRootCount should report root child count', () => {
  const result = ParseHtmlToVirtualDom.parseHtmlToVirtualDomWithRootCount('<div>One</div><div>Two</div>')

  expect(result.rootChildCount).toBe(2)
  expect(result.virtualDom).toHaveLength(4)
})

test('parseHtmlToVirtualDom should map table elements to virtual dom table types', () => {
  const result = ParseHtmlToVirtualDom.parseHtmlToVirtualDom(
    '<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>C</td></tr></tbody><tfoot><tr><td>F</td></tr></tfoot></table>',
  )

  expect(result).toEqual([
    {
      childCount: 3,
      type: VirtualDomElements.Table,
    },
    {
      childCount: 1,
      type: VirtualDomElements.THead,
    },
    {
      childCount: 1,
      type: VirtualDomElements.Tr,
    },
    {
      childCount: 1,
      type: VirtualDomElements.Th,
    },
    expect.objectContaining({
      text: 'H',
    }),
    {
      childCount: 1,
      type: VirtualDomElements.TBody,
    },
    {
      childCount: 1,
      type: VirtualDomElements.Tr,
    },
    {
      childCount: 1,
      type: VirtualDomElements.Td,
    },
    expect.objectContaining({
      text: 'C',
    }),
    {
      childCount: 1,
      type: VirtualDomElements.Tfoot,
    },
    {
      childCount: 1,
      type: VirtualDomElements.Tr,
    },
    {
      childCount: 1,
      type: VirtualDomElements.Td,
    },
    expect.objectContaining({
      text: 'F',
    }),
  ])
})

test('parseHtmlToVirtualDom should map ul to ul type', () => {
  const result = ParseHtmlToVirtualDom.parseHtmlToVirtualDom('<ul><li>Item</li></ul>')

  expect(result).toEqual([
    {
      childCount: 1,
      type: VirtualDomElements.Ul,
    },
    {
      childCount: 1,
      type: VirtualDomElements.Li,
    },
    expect.objectContaining({
      text: 'Item',
    }),
  ])
})

test('parseHtmlToVirtualDom should remove dangerous tags and inline event attributes', () => {
  const result = ParseHtmlToVirtualDom.parseHtmlToVirtualDom(
    '<head><title>ignored</title></head><!-- comment --><p onclick="alert(1)">Hi</p><script>alert(1)</script><style>p{}</style><meta charset="utf-8"><link rel="stylesheet" href="/x.css">',
  )

  expect(result).toEqual([
    {
      childCount: 1,
      type: VirtualDomElements.P,
    },
    expect.objectContaining({
      text: 'Hi',
    }),
  ])
})

test('parseHtmlToVirtualDom should preserve safe element attributes and boolean flags', () => {
  const result = ParseHtmlToVirtualDom.parseHtmlToVirtualDom(
    '<input checked disabled readonly value="1" placeholder="Type here" title="Title" name="field" id="input-id" class="field" style="color:red" />',
  )

  expect(result[0]).toEqual({
    checked: true,
    childCount: 0,
    className: 'field',
    disabled: true,
    id: 'input-id',
    name: 'field',
    placeholder: 'Type here',
    readOnly: true,
    style: 'color:red',
    title: 'Title',
    type: VirtualDomElements.Input,
    value: '1',
  })
})

test('parseHtmlToVirtualDom should parse explicit false boolean attributes', () => {
  const result = ParseHtmlToVirtualDom.parseHtmlToVirtualDom('<input checked="false" disabled="false" readonly="false" />')

  expect(result[0]).toEqual({
    checked: false,
    childCount: 0,
    disabled: false,
    readOnly: false,
    type: VirtualDomElements.Input,
  })
})

test('parseHtmlToVirtualDom should map unknown inline and block tags and decode entities', () => {
  const result = ParseHtmlToVirtualDom.parseHtmlToVirtualDom('<u title="Fish &amp; Chips">Tom &amp; Jerry</u><custom-box>Block</custom-box>')

  expect(result).toEqual([
    {
      childCount: 1,
      title: 'Fish & Chips',
      type: VirtualDomElements.Span,
    },
    expect.objectContaining({
      text: 'Tom & Jerry',
    }),
    {
      childCount: 1,
      type: VirtualDomElements.Div,
    },
    expect.objectContaining({
      text: 'Block',
    }),
  ])
})
