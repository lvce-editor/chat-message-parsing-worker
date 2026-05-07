import type { MessageInlineNode } from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'
import { isPathTraversalAttempt } from '../IsPathTraversalAttempt/IsPathTraversalAttempt.ts'
import { normalizeRelativePath } from '../NormalizeRelativePath/NormalizeRelativePath.ts'

const windowsAbsolutePathRegex = /^[a-zA-Z]:[\\/]/
const trailingPathSeparatorRegex = /[\\/]+$/
const windowsDriveSegmentRegex = /^[a-zA-Z]:$/

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

const decodeUriComponentSafely = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const getPathBaseName = (value: string): string => {
  const trimmedValue = value.replace(trailingPathSeparatorRegex, '')
  const normalizedValue = trimmedValue.replaceAll('\\', '/')
  const lastSeparatorIndex = normalizedValue.lastIndexOf('/')
  const baseName = lastSeparatorIndex === -1 ? normalizedValue : normalizedValue.slice(lastSeparatorIndex + 1)
  return decodeUriComponentSafely(baseName)
}

const encodeFilePath = (value: string): string => {
  const segments = value.split('/')
  return segments
    .map((segment, index) => {
      if (segment === '' && index === 0) {
        return ''
      }
      if (windowsDriveSegmentRegex.test(segment)) {
        return segment
      }
      return encodeURIComponent(segment)
    })
    .join('/')
}

const toFileUri = (value: string): string => {
  const normalizedValue = value.replaceAll('\\', '/')
  if (windowsAbsolutePathRegex.test(value)) {
    return `file:///${encodeFilePath(normalizedValue)}`
  }
  return `file://${encodeFilePath(normalizedValue)}`
}

const shouldConvertAbsolutePathToFileUri = (url: string, linkText: string | undefined): boolean => {
  if (!linkText) {
    return false
  }
  if (!url.startsWith('/') && !windowsAbsolutePathRegex.test(url)) {
    return false
  }
  const normalizedText = linkText.trim()
  if (!normalizedText) {
    return false
  }
  return getPathBaseName(url) === normalizedText
}

const sanitizeLinkUrl = (url: string, linkText?: string): string => {
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
  if (shouldConvertAbsolutePathToFileUri(trimmedUrl, linkText)) {
    return toFileUri(trimmedUrl)
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

const trailingRawUrlPunctuation = new Set(['.', ',', ':', ';', '!', '?'])

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
    if (trailingRawUrlPunctuation.has(current)) {
      end--
      continue
    }
    if (isCloseBracket(current) && hasBalancedOrExtraClosingBrackets(url.slice(0, end - 1))) {
      end--
      continue
    }
    break
  }
  return url.slice(0, end)
}

const hasBalancedOrExtraClosingBrackets = (value: string): boolean => {
  let openCount = 0
  let closeCount = 0
  for (const current of value) {
    if (isOpenBracket(current)) {
      openCount++
      continue
    }
    if (isCloseBracket(current)) {
      closeCount++
    }
  }
  return closeCount >= openCount
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

const findMarkdownTargetEnd = (value: string, start: number): number => {
  let depth = 1
  let index = start
  while (index < value.length) {
    const current = value[index]
    if (current === '\n') {
      return -1
    }
    if (current === '(') {
      depth++
    } else if (current === ')') {
      depth--
      if (depth === 0) {
        return index
      }
    }
    index++
  }
  return -1
}

const parseBracketedTargetToken = (
  value: string,
  start: number,
  offset: number,
): { readonly label: string; readonly length: number; readonly target: string } | undefined => {
  const textEnd = value.indexOf(']', start + offset)
  if (textEnd === -1 || value[textEnd + 1] !== '(') {
    return undefined
  }
  const targetEnd = findMarkdownTargetEnd(value, textEnd + 2)
  if (targetEnd === -1) {
    return undefined
  }
  const label = value.slice(start + offset, textEnd)
  const target = value.slice(textEnd + 2, targetEnd)
  if (!target) {
    return undefined
  }
  return {
    label,
    length: targetEnd - start + 1,
    target,
  }
}

const parseLinkToken = (value: string, start: number): ParsedInlineToken | undefined => {
  if (value[start] !== '[') {
    return undefined
  }
  const parsed = parseBracketedTargetToken(value, start, 1)
  if (!parsed || !parsed.label) {
    return undefined
  }
  return {
    length: parsed.length,
    node: {
      href: sanitizeLinkUrl(parsed.target, parsed.label),
      text: parsed.label,
      type: 'link',
    },
  }
}

const parseImageToken = (value: string, start: number): ParsedInlineToken | undefined => {
  if (value[start] !== '!' || value[start + 1] !== '[') {
    return undefined
  }
  const parsed = parseBracketedTargetToken(value, start, 2)
  if (!parsed) {
    return undefined
  }
  return {
    length: parsed.length,
    node: {
      alt: parsed.label,
      src: sanitizeImageUrl(parsed.target),
      type: 'image',
    },
  }
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
  if (hasInvalidMathOpening(value, start, delimiterLength)) {
    return undefined
  }
  const closingIndex = findMathClosingIndex(value, start + delimiterLength, delimiterLength)
  if (closingIndex === -1) {
    return undefined
  }
  const body = value.slice(start + delimiterLength, closingIndex)
  const following = value[closingIndex + delimiterLength]
  if (!body || isAlphaNumeric(following)) {
    return undefined
  }
  return {
    length: closingIndex - start + delimiterLength,
    node: {
      displayMode: delimiterLength === 2,
      text: body.trim(),
      type: 'math-inline',
    },
  }
}

const hasInvalidMathOpening = (value: string, start: number, delimiterLength: number): boolean => {
  const previous = value[start - 1]
  if (isAlphaNumeric(previous)) {
    return true
  }
  const next = value[start + delimiterLength]
  if (!next || next === '.') {
    return true
  }
  return next === '(' && (value[start + delimiterLength + 1] === '"' || value[start + delimiterLength + 1] === "'")
}

const findMathClosingIndex = (value: string, start: number, delimiterLength: number): number => {
  let index = start
  while (index < value.length) {
    if (value[index] === '\n') {
      return -1
    }
    if (delimiterLength === 2 ? value.startsWith('$$', index) : value[index] === '$') {
      return index
    }
    if (value[index] === '\\') {
      index += 2
      continue
    }
    index++
  }
  return -1
}

const parseInlineToken = (value: string, start: number): ParsedInlineToken | undefined => {
  return (
    parseImageToken(value, start) ||
    parseLinkToken(value, start) ||
    parseRawLinkToken(value, start) ||
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
