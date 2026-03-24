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

const maxHtmlLength = 40_000
const tokenRegex = /<!--[\s\S]*?-->|<\/?[a-zA-Z][\w:-]*(?:\s[^<>]*?)?>|[^<]+/g
const attributeRegex = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

const inlineTags = new Set(['a', 'abbr', 'b', 'code', 'em', 'i', 'label', 'small', 'span', 'strong', 'sub', 'sup', 'u'])

const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])

const sanitizeHtml = (value: string): string => {
  return value
    .slice(0, maxHtmlLength)
    .replaceAll(/<script\b[\s\S]*?<\/script>/gi, '')
    .replaceAll(/<style\b[\s\S]*?<\/style>/gi, '')
    .replaceAll(/<head\b[\s\S]*?<\/head>/gi, '')
    .replaceAll(/<meta\b[^>]*>/gi, '')
    .replaceAll(/<link\b[^>]*>/gi, '')
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

const parseAttributes = (token: string): Record<string, string> => {
  const withoutTag = token
    .replace(/^<\/?\s*[a-zA-Z][\w:-]*/, '')
    .replace(/\/?\s*>$/, '')
    .trim()

  if (!withoutTag) {
    return Object.create(null) as Record<string, string>
  }

  const attributes: Record<string, string> = Object.create(null) as Record<string, string>
  const matches = withoutTag.matchAll(attributeRegex)

  for (const match of matches) {
    const name = String(match[1] || '').toLowerCase()
    if (!name || name.startsWith('on')) {
      continue
    }
    const value = String(match[2] ?? match[3] ?? match[4] ?? '')
    attributes[name] = decodeEntities(value)
  }

  return attributes
}

const parseHtml = (value: string): readonly HtmlNode[] => {
  const root: HtmlElementNode = {
    attributes: Object.create(null) as Record<string, string>,
    children: [],
    tagName: 'root',
    type: 'element',
  }

  const stack: HtmlElementNode[] = [root]

  const matches = sanitizeHtml(value).match(tokenRegex)
  if (!matches) {
    return []
  }

  for (const token of matches) {
    if (token.startsWith('<!--')) {
      continue
    }

    if (token.startsWith('</')) {
      const closingTagName = token.slice(2, -1).trim().toLowerCase()
      while (stack.length > 1) {
        const top = stack.at(-1)
        if (!top) {
          break
        }
        stack.pop()
        if (top.tagName === closingTagName) {
          break
        }
      }
      continue
    }

    if (token.startsWith('<')) {
      const openTagNameMatch = /^<\s*([a-zA-Z][\w:-]*)/.exec(token)
      if (!openTagNameMatch) {
        continue
      }
      const tagName = openTagNameMatch[1].toLowerCase()
      const elementNode: HtmlElementNode = {
        attributes: parseAttributes(token),
        children: [],
        tagName,
        type: 'element',
      }

      const parent = stack.at(-1)
      if (!parent) {
        continue
      }
      parent.children.push(elementNode)

      const selfClosing = token.endsWith('/>') || voidElements.has(tagName)
      if (!selfClosing) {
        stack.push(elementNode)
      }
      continue
    }

    const decoded = decodeEntities(token)
    if (!decoded) {
      continue
    }
    const parent = stack.at(-1)
    if (!parent) {
      continue
    }
    parent.children.push({
      type: 'text',
      value: decoded,
    })
  }

  return root.children
}

const getElementType = (tagName: string): number => {
  switch (tagName) {
    case 'a':
      return VirtualDomElements.A
    case 'abbr':
      return VirtualDomElements.Abbr
    case 'article':
      return VirtualDomElements.Article
    case 'aside':
      return VirtualDomElements.Aside
    case 'audio':
      return VirtualDomElements.Audio
    case 'br':
      return VirtualDomElements.Br
    case 'button':
      return VirtualDomElements.Button
    case 'code':
      return VirtualDomElements.Code
    case 'col':
      return VirtualDomElements.Col
    case 'colgroup':
      return VirtualDomElements.ColGroup
    case 'dd':
      return VirtualDomElements.Dd
    case 'dl':
      return VirtualDomElements.Dl
    case 'dt':
      return VirtualDomElements.Dt
    case 'em':
      return VirtualDomElements.Em
    case 'figcaption':
      return VirtualDomElements.Figcaption
    case 'figure':
      return VirtualDomElements.Figure
    case 'footer':
      return VirtualDomElements.Footer
    case 'h1':
      return VirtualDomElements.H1
    case 'h2':
      return VirtualDomElements.H2
    case 'h3':
      return VirtualDomElements.H3
    case 'h4':
      return VirtualDomElements.H4
    case 'h5':
      return VirtualDomElements.H5
    case 'h6':
      return VirtualDomElements.H6
    case 'header':
      return VirtualDomElements.Header
    case 'hr':
      return VirtualDomElements.Hr
    case 'i':
      return VirtualDomElements.I
    case 'img':
      return VirtualDomElements.Img
    case 'input':
      return VirtualDomElements.Input
    case 'label':
      return VirtualDomElements.Label
    case 'li':
      return VirtualDomElements.Li
    case 'main':
      return VirtualDomElements.Main
    case 'nav':
      return VirtualDomElements.Nav
    case 'ol':
      return VirtualDomElements.Ol
    case 'option':
      return VirtualDomElements.Option
    case 'p':
      return VirtualDomElements.P
    case 'pre':
      return VirtualDomElements.Pre
    case 'section':
      return VirtualDomElements.Section
    case 'select':
      return VirtualDomElements.Select
    case 'span':
      return VirtualDomElements.Span
    case 'strong':
      return VirtualDomElements.Strong
    case 'table':
      return VirtualDomElements.Table
    case 'tbody':
      return VirtualDomElements.TBody
    case 'td':
      return VirtualDomElements.Td
    case 'textarea':
      return VirtualDomElements.TextArea
    case 'tfoot':
      return VirtualDomElements.Tfoot
    case 'th':
      return VirtualDomElements.Th
    case 'thead':
      return VirtualDomElements.THead
    case 'tr':
      return VirtualDomElements.Tr
    case 'ul':
      return VirtualDomElements.Ul
    default:
      return inlineTags.has(tagName) ? VirtualDomElements.Span : VirtualDomElements.Div
  }
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
