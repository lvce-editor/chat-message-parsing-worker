import { type VirtualDomNode, VirtualDomElements, text } from '@lvce-editor/virtual-dom-worker'

interface HtmlTextNode {
  readonly type: 'text'
  readonly value: string
}

interface HtmlElementNode {
  readonly attributes: Record<string, string>
  readonly children: HtmlNode[]
  readonly tagName: string
  readonly type: 'element'
}

type HtmlNode = HtmlElementNode | HtmlTextNode

type ReadonlyHtmlElementNode = {
  readonly attributes: Readonly<Record<string, string>>
  readonly children: readonly ReadonlyHtmlNode[]
  readonly tagName: string
  readonly type: 'element'
}

type ReadonlyHtmlNode = ReadonlyHtmlElementNode | HtmlTextNode
type AttributeRecord = Record<string, string>

const maxHtmlLength = 40_000
const tokenRegex = /<!--[\s\S]*?-->|<\/?[a-zA-Z][\w:-]*(?:\s[^<>]*?)?>|[^<]+/g
const scriptTagRegex = /<script\b[\s\S]*?<\/script>/gi
const styleTagRegex = /<style\b[\s\S]*?<\/style>/gi
const headTagRegex = /<head\b[\s\S]*?<\/head>/gi
const metaTagRegex = /<meta\b[^>]*>/gi
const linkTagRegex = /<link\b[^>]*>/gi
const tagPrefixRegex = /^<\/?\s*[a-zA-Z][\w:-]*/
const tagSuffixRegex = /\/?\s*>$/
const openTagNameRegex = /^<\s*([a-zA-Z][\w:-]*)/

const elementTypes: Record<string, number> = {
  a: VirtualDomElements.A,
  abbr: VirtualDomElements.Abbr,
  article: VirtualDomElements.Article,
  aside: VirtualDomElements.Aside,
  audio: VirtualDomElements.Audio,
  br: VirtualDomElements.Br,
  button: VirtualDomElements.Button,
  code: VirtualDomElements.Code,
  col: VirtualDomElements.Col,
  colgroup: VirtualDomElements.ColGroup,
  dd: VirtualDomElements.Dd,
  dl: VirtualDomElements.Dl,
  dt: VirtualDomElements.Dt,
  em: VirtualDomElements.Em,
  figcaption: VirtualDomElements.Figcaption,
  figure: VirtualDomElements.Figure,
  footer: VirtualDomElements.Footer,
  h1: VirtualDomElements.H1,
  h2: VirtualDomElements.H2,
  h3: VirtualDomElements.H3,
  h4: VirtualDomElements.H4,
  h5: VirtualDomElements.H5,
  h6: VirtualDomElements.H6,
  header: VirtualDomElements.Header,
  hr: VirtualDomElements.Hr,
  i: VirtualDomElements.I,
  img: VirtualDomElements.Img,
  input: VirtualDomElements.Input,
  label: VirtualDomElements.Label,
  li: VirtualDomElements.Li,
  main: VirtualDomElements.Main,
  nav: VirtualDomElements.Nav,
  ol: VirtualDomElements.Ol,
  option: VirtualDomElements.Option,
  p: VirtualDomElements.P,
  pre: VirtualDomElements.Pre,
  section: VirtualDomElements.Section,
  select: VirtualDomElements.Select,
  span: VirtualDomElements.Span,
  strong: VirtualDomElements.Strong,
  table: VirtualDomElements.Table,
  tbody: VirtualDomElements.TBody,
  td: VirtualDomElements.Td,
  textarea: VirtualDomElements.TextArea,
  tfoot: VirtualDomElements.Tfoot,
  th: VirtualDomElements.Th,
  thead: VirtualDomElements.THead,
  tr: VirtualDomElements.Tr,
  ul: VirtualDomElements.Ul,
}

const inlineTags = new Set(['a', 'abbr', 'b', 'code', 'em', 'i', 'label', 'small', 'span', 'strong', 'sub', 'sup', 'u'])

const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])

const sanitizeHtml = (value: string): string => {
  return value
    .slice(0, maxHtmlLength)
    .replaceAll(scriptTagRegex, '')
    .replaceAll(styleTagRegex, '')
    .replaceAll(headTagRegex, '')
    .replaceAll(metaTagRegex, '')
    .replaceAll(linkTagRegex, '')
}

const decodeEntities = (value: string): string => {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

const createAttributeRecord = (): AttributeRecord => {
  return Object.create(null) as AttributeRecord
}

const isWhitespace = (value: string | undefined): boolean => {
  return value === ' ' || value === '\n' || value === '\r' || value === '\t'
}

const skipWhitespace = (value: string, start: number): number => {
  let index = start
  while (index < value.length && isWhitespace(value[index])) {
    index++
  }
  return index
}

const readAttributeName = (value: string, start: number): { readonly name: string; readonly nextIndex: number } => {
  let index = start
  while (index < value.length) {
    const current = value[index]
    if (isWhitespace(current) || current === '=' || current === '/' || current === '>') {
      break
    }
    index++
  }
  return {
    name: value.slice(start, index),
    nextIndex: index,
  }
}

const readQuotedAttributeValue = (value: string, start: number): { readonly value: string; readonly nextIndex: number } => {
  const quote = value[start]
  let index = start + 1
  while (index < value.length && value[index] !== quote) {
    index++
  }
  return {
    nextIndex: index < value.length ? index + 1 : index,
    value: value.slice(start + 1, index),
  }
}

const readUnquotedAttributeValue = (value: string, start: number): { readonly value: string; readonly nextIndex: number } => {
  let index = start
  while (index < value.length) {
    const current = value[index]
    if (isWhitespace(current) || current === '"' || current === "'" || current === '=' || current === '<' || current === '>' || current === '`') {
      break
    }
    index++
  }
  return {
    nextIndex: index,
    value: value.slice(start, index),
  }
}

const readAttributeValue = (value: string, start: number): { readonly value: string; readonly nextIndex: number } => {
  if (value[start] === '"' || value[start] === "'") {
    return readQuotedAttributeValue(value, start)
  }
  return readUnquotedAttributeValue(value, start)
}

const parseAttributes = (token: string): Record<string, string> => {
  const withoutTag = token.replace(tagPrefixRegex, '').replace(tagSuffixRegex, '').trim()

  if (!withoutTag) {
    return createAttributeRecord()
  }

  const attributes = createAttributeRecord()
  let index = 0

  while (index < withoutTag.length) {
    index = skipWhitespace(withoutTag, index)
    if (index >= withoutTag.length) {
      break
    }
    const nameResult = readAttributeName(withoutTag, index)
    if (!nameResult.name) {
      index++
      continue
    }
    const name = nameResult.name.toLowerCase()
    index = skipWhitespace(withoutTag, nameResult.nextIndex)
    let attributeValue = ''
    if (withoutTag[index] === '=') {
      index = skipWhitespace(withoutTag, index + 1)
      const valueResult = readAttributeValue(withoutTag, index)
      attributeValue = valueResult.value
      index = valueResult.nextIndex
    }
    if (!name.startsWith('on')) {
      attributes[name] = decodeEntities(attributeValue)
    }
  }

  return attributes
}

const createRootNode = (): HtmlElementNode => {
  return {
    attributes: createAttributeRecord(),
    children: [],
    tagName: 'root',
    type: 'element',
  }
}

const popClosedElements = (stack: HtmlElementNode[], closingTagName: string): void => {
  while (stack.length > 1) {
    const top = stack.at(-1)
    if (!top) {
      return
    }
    stack.pop()
    if (top.tagName === closingTagName) {
      return
    }
  }
}

const appendOpenTagNode = (stack: HtmlElementNode[], token: string): void => {
  const openTagNameMatch = openTagNameRegex.exec(token)
  if (!openTagNameMatch) {
    return
  }
  const tagName = openTagNameMatch[1].toLowerCase()
  const parent = stack.at(-1)
  if (!parent) {
    return
  }
  const elementNode: HtmlElementNode = {
    attributes: parseAttributes(token),
    children: [],
    tagName,
    type: 'element',
  }
  parent.children.push(elementNode)
  if (!token.endsWith('/>') && !voidElements.has(tagName)) {
    stack.push(elementNode)
  }
}

const appendTextNode = (stack: HtmlElementNode[], token: string): void => {
  const decoded = decodeEntities(token)
  if (!decoded) {
    return
  }
  const parent = stack.at(-1)
  if (!parent) {
    return
  }
  parent.children.push({
    type: 'text',
    value: decoded,
  })
}

const handleHtmlToken = (stack: HtmlElementNode[], token: string): void => {
  if (token.startsWith('<!--')) {
    return
  }
  if (token.startsWith('</')) {
    popClosedElements(stack, token.slice(2, -1).trim().toLowerCase())
    return
  }
  if (token.startsWith('<')) {
    appendOpenTagNode(stack, token)
    return
  }
  appendTextNode(stack, token)
}

const parseHtml = (value: string): readonly HtmlNode[] => {
  const root = createRootNode()
  const stack: HtmlElementNode[] = [root]

  const matches = sanitizeHtml(value).match(tokenRegex)
  if (!matches) {
    return []
  }

  for (const token of matches) {
    handleHtmlToken(stack, token)
  }

  return root.children
}

const getElementType = (tagName: string): number => {
  return elementTypes[tagName] ?? (inlineTags.has(tagName) ? VirtualDomElements.Span : VirtualDomElements.Div)
}

const isHttpUrl = (url: string): boolean => {
  const normalized = url.trim().toLowerCase()
  return normalized.startsWith('http://') || normalized.startsWith('https://')
}

const normalizeUrl = (url: string): string => {
  return isHttpUrl(url) ? url : '#'
}

const getElementAttributes = (node: ReadonlyHtmlElementNode): Record<string, unknown> => {
  const attributes: Record<string, unknown> = {}
  const className = node.attributes.class || node.attributes.classname
  if (className) {
    attributes.className = className
  }
  if (node.attributes.style) {
    attributes.style = node.attributes.style
  }
  if (node.attributes.id) {
    attributes.id = node.attributes.id
  }
  if (node.attributes.name) {
    attributes.name = node.attributes.name
  }
  if (node.attributes.placeholder) {
    attributes.placeholder = node.attributes.placeholder
  }
  if (node.attributes.title) {
    attributes.title = node.attributes.title
  }
  if (node.attributes.value) {
    attributes.value = node.attributes.value
  }
  if (node.attributes.href) {
    attributes.href = normalizeUrl(node.attributes.href)
  }
  if (node.attributes.src) {
    attributes.src = normalizeUrl(node.attributes.src)
  }
  if (node.attributes.target) {
    attributes.target = node.attributes.target
  }
  if (node.attributes.rel) {
    attributes.rel = node.attributes.rel
  }
  if ('checked' in node.attributes) {
    attributes.checked = node.attributes.checked !== 'false'
  }
  if ('disabled' in node.attributes) {
    attributes.disabled = node.attributes.disabled !== 'false'
  }
  if ('readonly' in node.attributes) {
    attributes.readOnly = node.attributes.readonly !== 'false'
  }
  return attributes
}

const toVirtualDom = (node: ReadonlyHtmlNode): readonly VirtualDomNode[] => {
  if (node.type === 'text') {
    return [text(node.value)]
  }

  const children = node.children.flatMap(toVirtualDom)
  return [
    {
      childCount: node.children.length,
      ...getElementAttributes(node),
      type: getElementType(node.tagName),
    },
    ...children,
  ]
}

export const parseHtmlToVirtualDom = (value: string): readonly VirtualDomNode[] => {
  return parseHtml(value).flatMap(toVirtualDom)
}

export const parseHtmlToVirtualDomWithRootCount = (
  value: string,
): { readonly rootChildCount: number; readonly virtualDom: readonly VirtualDomNode[] } => {
  const rootNodes = parseHtml(value)
  return {
    rootChildCount: rootNodes.length,
    virtualDom: rootNodes.flatMap(toVirtualDom),
  }
}
