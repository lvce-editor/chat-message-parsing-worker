import type { MessageInlineNode } from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'

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

const sanitizeUrl = (url: string): string => {
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
            href: sanitizeUrl(href),
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

const findItalicEnd = (value: string, start: number): number => {
  let index = start + 1
  while (index < value.length) {
    if (value[index] === '\n') {
      return -1
    }
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
  if (!text || text.includes('\n')) {
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
  return parseLinkToken(value, start) || parseBoldToken(value, start) || parseItalicToken(value, start) || parseMathToken(value, start)
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
