import type { MessageInlineNode } from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'
import { isPathTraversalAttempt } from '../IsPathTraversalAttempt/IsPathTraversalAttempt.ts'
import { normalizeRelativePath } from '../NormalizeRelativePath/NormalizeRelativePath.ts'

const isAlphaNumeric = (value: string | undefined): boolean => {
  if (!value) {
    return false
  }
  const code = value.codePointAt(0) ?? 0
  if (code >= 48 && code <= 57) {
    return true
  }
  if (code >= 65 && code <= 90) {
    return true
  }
  return code >= 97 && code <= 122
}

const sanitizeLinkUrl = (url: string): string => {
  const trimmedUrl = url.trim()
  const normalized = url.trim().toLowerCase()
  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('file://') ||
    normalized.startsWith('vscode-references://')
  ) {
    return trimmedUrl
  }
  if (!trimmedUrl || trimmedUrl.startsWith('#') || trimmedUrl.startsWith('?') || trimmedUrl.startsWith('/') || trimmedUrl.startsWith('\\')) {
    return '#'
  }
  if (trimmedUrl.includes('://') || trimmedUrl.includes(':')) {
    return '#'
  }
  if (isPathTraversalAttempt(trimmedUrl)) {
    return '#'
  }
  const normalizedPath = normalizeRelativePath(trimmedUrl)
  if (normalizedPath === '.') {
    return '#'
  }
  return `file:///workspace/${normalizedPath}`
}

const sanitizeImageUrl = (url: string): string => {
  const normalized = url.trim().toLowerCase()
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return url
  }
  return '#'
}

interface ParsedInlineToken {
  readonly length: number
  readonly node: MessageInlineNode
}

const isOpenBracket = (value: string): boolean => {
  return value === '(' || value === '[' || value === '{'
}

const isCloseBracket = (value: string): boolean => {
  return value === ')' || value === ']' || value === '}'
}

const findRawUrlEnd = (value: string, start: number): number => {
  let index = start
  while (index < value.length) {
    const current = value[index]
    if (
      current === ' ' ||
      current === '\n' ||
      current === '\r' ||
      current === '\t' ||
      current === '"' ||
      current === "'" ||
      current === '`' ||
      current === '<' ||
      current === '>'
    ) {
      break
    }
    index++
  }
  return index
}

const trimRawUrlEnd = (url: string): string => {
  let end = url.length
  while (end > 0) {
    const current = url[end - 1]
    if (current === '.' || current === ',' || current === ':' || current === ';' || current === '!' || current === '?') {
      end--
      continue
    }
    if (isCloseBracket(current)) {
      const inner = url.slice(0, end - 1)
      let openCount = 0
      let closeCount = 0
      for (let i = 0; i < inner.length; i++) {
        if (isOpenBracket(inner[i])) {
          openCount++
        } else if (isCloseBracket(inner[i])) {
          closeCount++
        }
      }
      if (closeCount >= openCount) {
        end--
        continue
      }
    }
    break
  }
  return url.slice(0, end)
}

const parseRawLinkToken = (value: string, start: number): ParsedInlineToken | undefined => {
  if (!value.startsWith('https://', start) && !value.startsWith('http://', start)) {
    return undefined
  }
  if (start >= 2 && value[start - 1] === '(' && value[start - 2] === ']') {
    return undefined
  }
  const end = findRawUrlEnd(value, start)
  const rawUrl = value.slice(start, end)
  const href = trimRawUrlEnd(rawUrl)
  if (!href) {
    return undefined
  }
  return {
    length: href.length,
    node: {
      href: sanitizeLinkUrl(href),
      text: href,
      type: 'link',
    },
  }
}

const parseLinkToken = (value: string, start: number): ParsedInlineToken | undefined => {
  if (value[start] !== '[') {
    return undefined
  }
  const textEnd = value.indexOf(']', start + 1)
  if (textEnd === -1) {
    return undefined
  }
  if (value[textEnd + 1] !== '(') {
    return undefined
  }
  let depth = 1
  let index = textEnd + 2
  while (index < value.length) {
    const current = value[index]
    if (current === '\n') {
      return undefined
    }
    if (current === '(') {
      depth++
    } else if (current === ')') {
      depth--
      if (depth === 0) {
        const text = value.slice(start + 1, textEnd)
        const href = value.slice(textEnd + 2, index)
        if (!text || !href) {
          return undefined
        }
        return {
          length: index - start + 1,
          node: {
            href: sanitizeLinkUrl(href),
            text,
            type: 'link',
          },
        }
      }
    }
    index++
  }
  return undefined
}

const parseImageToken = (value: string, start: number): ParsedInlineToken | undefined => {
  if (value[start] !== '!' || value[start + 1] !== '[') {
    return undefined
  }
  const textEnd = value.indexOf(']', start + 2)
  if (textEnd === -1) {
    return undefined
  }
  if (value[textEnd + 1] !== '(') {
    return undefined
  }
  let depth = 1
  let index = textEnd + 2
  while (index < value.length) {
    const current = value[index]
    if (current === '\n') {
      return undefined
    }
    if (current === '(') {
      depth++
    } else if (current === ')') {
      depth--
      if (depth === 0) {
        const alt = value.slice(start + 2, textEnd)
        const src = value.slice(textEnd + 2, index)
        if (!src) {
          return undefined
        }
        return {
          length: index - start + 1,
          node: {
            alt,
            src: sanitizeImageUrl(src),
            type: 'image',
          },
        }
      }
    }
    index++
  }
  return undefined
}

const parseBoldToken = (value: string, start: number): ParsedInlineToken | undefined => {
  if (value[start] !== '*' || value[start + 1] !== '*') {
    return undefined
  }
  const end = value.indexOf('**', start + 2)
  if (end === -1) {
    return undefined
  }
  const text = value.slice(start + 2, end)
  if (!text || text.includes('\n')) {
    return undefined
  }
  return {
    length: end - start + 2,
    node: {
      children: parseInlineNodes(text),
      type: 'bold',
    },
  }
}

const parseBoldItalicToken = (value: string, start: number): ParsedInlineToken | undefined => {
  if (value[start] !== '*' || value[start + 1] !== '*' || value[start + 2] !== '*') {
    return undefined
  }
  const end = value.indexOf('***', start + 3)
  if (end === -1) {
    return undefined
  }
  const text = value.slice(start + 3, end)
  if (!text || text.includes('\n')) {
    return undefined
  }
  return {
    length: end - start + 3,
    node: {
      children: [
        {
          children: parseInlineNodes(text),
          type: 'italic',
        },
      ],
      type: 'bold',
    },
  }
}

const findItalicEnd = (value: string, start: number): number => {
  let index = start + 1
  while (index < value.length) {
    if (value[index] !== '*') {
      index++
      continue
    }
    if (value[index + 1] !== '*') {
      return index
    }
    const boldEnd = value.indexOf('**', index + 2)
    if (boldEnd === -1) {
      return -1
    }
    index = boldEnd + 2
  }
  return -1
}

const parseItalicToken = (value: string, start: number): ParsedInlineToken | undefined => {
  if (value[start] !== '*' || value[start + 1] === '*') {
    return undefined
  }
  const end = findItalicEnd(value, start)
  if (end === -1) {
    return undefined
  }
  const text = value.slice(start + 1, end)
  if (!text) {
    return undefined
  }
  return {
    length: end - start + 1,
    node: {
      children: parseInlineNodes(text),
      type: 'italic',
    },
  }
}

const parseStrikethroughToken = (value: string, start: number): ParsedInlineToken | undefined => {
  if (value[start] !== '~' || value[start + 1] !== '~') {
    return undefined
  }
  const end = value.indexOf('~~', start + 2)
  if (end === -1) {
    return undefined
  }
  const text = value.slice(start + 2, end)
  if (!text || text.includes('\n')) {
    return undefined
  }
  return {
    length: end - start + 2,
    node: {
      children: parseInlineNodes(text),
      type: 'strikethrough',
    },
  }
}

const parseInlineCodeToken = (value: string, start: number): ParsedInlineToken | undefined => {
  if (value[start] !== '`') {
    return undefined
  }
  const end = value.indexOf('`', start + 1)
  if (end === -1) {
    return undefined
  }
  const codeText = value.slice(start + 1, end)
  if (!codeText || codeText.includes('\n')) {
    return undefined
  }
  return {
    length: end - start + 1,
    node: {
      text: codeText,
      type: 'inline-code',
    },
  }
}

const parseMathToken = (value: string, start: number): ParsedInlineToken | undefined => {
  if (value[start] !== '$') {
    return undefined
  }
  const delimiterLength = value[start + 1] === '$' ? 2 : 1
  const previous = value[start - 1]
  if (isAlphaNumeric(previous)) {
    return undefined
  }
  const next = value[start + delimiterLength]
  if (!next || next === '.') {
    return undefined
  }
  if (next === '(' && (value[start + delimiterLength + 1] === '"' || value[start + delimiterLength + 1] === "'")) {
    return undefined
  }

  let index = start + delimiterLength
  while (index < value.length) {
    if (value[index] === '\n') {
      return undefined
    }
    const isClosed = delimiterLength === 2 ? value.startsWith('$$', index) : value[index] === '$'
    if (isClosed) {
      const body = value.slice(start + delimiterLength, index)
      const following = value[index + delimiterLength]
      if (!body || isAlphaNumeric(following)) {
        return undefined
      }
      return {
        length: index - start + delimiterLength,
        node: {
          displayMode: delimiterLength === 2,
          text: body.trim(),
          type: 'math-inline',
        },
      }
    }
    if (value[index] === '\\') {
      index += 2
      continue
    }
    index++
  }
  return undefined
}

const parseInlineToken = (value: string, start: number): ParsedInlineToken | undefined => {
  return (
    parseImageToken(value, start) ||
    parseLinkToken(value, start) ||
    parseRawLinkToken(value, start) ||
    parseBoldItalicToken(value, start) ||
    parseBoldToken(value, start) ||
    parseItalicToken(value, start) ||
    parseLinkToken(value, start) ||
    parseBoldItalicToken(value, start) ||
    parseBoldToken(value, start) ||
    parseItalicToken(value, start) ||
    parseStrikethroughToken(value, start) ||
    parseInlineCodeToken(value, start) ||
    parseMathToken(value, start)
  )
}

export const parseInlineNodes = (value: string): readonly MessageInlineNode[] => {
  const nodes: MessageInlineNode[] = []
  let textStart = 0
  let index = 0

  const pushText = (end: number): void => {
    if (end <= textStart) {
      return
    }
    nodes.push({
      text: value.slice(textStart, end),
      type: 'text',
    })
  }

  while (index < value.length) {
    const parsed = parseInlineToken(value, index)
    if (!parsed) {
      index++
      continue
    }
    pushText(index)
    nodes.push(parsed.node)
    index += parsed.length
    textStart = index
  }

  pushText(value.length)

  if (nodes.length === 0) {
    return [
      {
        text: value,
        type: 'text',
      },
    ]
  }

  return nodes
}
