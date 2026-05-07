export type BlockToken =
  | BlockBlankToken
  | BlockBlockQuoteLineToken
  | BlockCodeToken
  | BlockHeadingLineToken
  | BlockMathToken
  | BlockOrderedListItemLineToken
  | BlockParagraphLineToken
  | BlockThematicBreakToken
  | BlockTableRowLineToken
  | BlockUnorderedListItemLineToken

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

interface BlockBlankToken {
  readonly type: 'blank-line'
}

interface BlockParagraphLineToken {
  readonly text: string
  readonly type: 'paragraph-line'
}

interface BlockBlockQuoteLineToken {
  readonly text: string
  readonly type: 'blockquote-line'
}

interface BlockHeadingLineToken {
  readonly level: HeadingLevel
  readonly text: string
  readonly type: 'heading-line'
}

interface BlockOrderedListItemLineToken {
  readonly indentation: number
  readonly text: string
  readonly type: 'ordered-list-item-line'
}

interface BlockUnorderedListItemLineToken {
  readonly indentation: number
  readonly text: string
  readonly type: 'unordered-list-item-line'
}

interface BlockTableRowLineToken {
  readonly cells: readonly string[]
  readonly line: string
  readonly type: 'table-row-line'
}

interface BlockCodeToken {
  readonly language?: string
  readonly text: string
  readonly type: 'code-block'
}

interface BlockMathToken {
  readonly text: string
  readonly type: 'math-block'
}

interface BlockThematicBreakToken {
  readonly type: 'thematic-break'
}

interface ParsedHeadingLine {
  readonly level: HeadingLevel
  readonly text: string
}

interface ParsedOrderedListItemLine {
  readonly indentation: number
  readonly text: string
}

interface ParsedUnorderedListItemLine {
  readonly indentation: number
  readonly text: string
}

interface ScanResult {
  readonly nextIndex: number
  readonly token: BlockToken
}

const markdownMathBlockDelimiter = '$$'
const escapedNewlineRegex = /\\r\\n|\\n/g
const lineBreakRegex = /\r?\n/
const tableDelimiterRegex = /\|\s*[-:]{3,}/
const inlineTableCellRegex = /\|\s+\|/g

const normalizeEscapedNewlines = (value: string): string => {
  if (value.includes('\\n')) {
    return value.replaceAll(escapedNewlineRegex, '\n')
  }
  return value
}

const normalizeInlineTables = (value: string): string => {
  return value
    .split(lineBreakRegex)
    .map((line) => {
      if (!line.includes('|')) {
        return line
      }
      if (!tableDelimiterRegex.test(line)) {
        return line
      }
      return line.replaceAll(inlineTableCellRegex, '|\n|')
    })
    .join('\n')
}

const parseHeadingLine = (line: string): ParsedHeadingLine | undefined => {
  const trimmedStart = line.trimStart()
  let index = 0
  while (index < trimmedStart.length && trimmedStart[index] === '#') {
    index++
  }
  if (index === 0 || index > 6) {
    return undefined
  }
  if (trimmedStart[index] !== ' ') {
    return undefined
  }
  return {
    level: index as HeadingLevel,
    text: trimmedStart.slice(index).trimStart(),
  }
}

const parseOrderedListItemLine = (line: string): ParsedOrderedListItemLine | undefined => {
  let indentation = 0
  while (indentation < line.length && line[indentation] === ' ') {
    indentation++
  }
  let index = indentation
  const firstDigit = index
  while (index < line.length && line[index] >= '0' && line[index] <= '9') {
    index++
  }
  if (index === firstDigit || line[index] !== '.') {
    return undefined
  }
  index++
  if (line[index] !== ' ') {
    return undefined
  }
  while (index < line.length && line[index] === ' ') {
    index++
  }
  return {
    indentation,
    text: line.slice(index),
  }
}

const parseUnorderedListItemLine = (line: string): ParsedUnorderedListItemLine | undefined => {
  let indentation = 0
  while (indentation < line.length && line[indentation] === ' ') {
    indentation++
  }
  const marker = line[indentation]
  if (marker !== '-' && marker !== '*') {
    return undefined
  }
  let index = indentation + 1
  if (line[index] !== ' ') {
    return undefined
  }
  while (index < line.length && line[index] === ' ') {
    index++
  }
  return {
    indentation,
    text: line.slice(index),
  }
}

const parseBlockQuoteLine = (line: string): string | undefined => {
  const trimmedStart = line.trimStart()
  if (!trimmedStart.startsWith('>')) {
    return undefined
  }
  const content = trimmedStart.slice(1)
  if (!content) {
    return ''
  }
  if (content.startsWith(' ')) {
    return content.slice(1)
  }
  return content
}

const isThematicBreakLine = (line: string): boolean => {
  const trimmedStart = line.trimStart()
  const leadingSpaces = line.length - trimmedStart.length
  if (leadingSpaces > 3) {
    return false
  }
  const trimmed = trimmedStart.trimEnd()
  if (!trimmed) {
    return false
  }
  const marker = trimmed[0]
  if (marker !== '-' && marker !== '_' && marker !== '*') {
    return false
  }
  let markerCount = 0
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]
    if (char === marker) {
      markerCount++
      continue
    }
    if (char !== ' ') {
      return false
    }
  }
  return markerCount >= 3
}

const isTableRow = (line: string): boolean => {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return false
  }
  return trimmed.length > 2
}

const getTableCells = (line: string): readonly string[] => {
  const trimmed = line.trim()
  return trimmed
    .slice(1, -1)
    .split('|')
    .map((part) => part.trim())
}

const scanCodeBlock = (lines: readonly string[], start: number, trimmed: string): ScanResult | undefined => {
  if (!trimmed.startsWith('```')) {
    return undefined
  }
  const language = trimmed.slice(3).trim()
  const codeLines: string[] = []
  let index = start + 1
  while (index < lines.length && !lines[index].trim().startsWith('```')) {
    codeLines.push(lines[index])
    index++
  }
  return {
    nextIndex: Math.min(index + 1, lines.length),
    token: language
      ? {
          language,
          text: codeLines.join('\n'),
          type: 'code-block',
        }
      : {
          text: codeLines.join('\n'),
          type: 'code-block',
        },
  }
}

const scanMathBlock = (lines: readonly string[], start: number, trimmed: string): ScanResult | undefined => {
  if (trimmed !== markdownMathBlockDelimiter) {
    return undefined
  }
  let endIndex = start + 1
  while (endIndex < lines.length && lines[endIndex].trim() !== markdownMathBlockDelimiter) {
    endIndex++
  }
  if (endIndex >= lines.length) {
    return undefined
  }
  return {
    nextIndex: endIndex + 1,
    token: {
      text: lines
        .slice(start + 1, endIndex)
        .join('\n')
        .trim(),
      type: 'math-block',
    },
  }
}

const getSingleLineToken = (line: string): BlockToken => {
  const blockQuoteLine = parseBlockQuoteLine(line)
  if (blockQuoteLine !== undefined) {
    return {
      text: blockQuoteLine,
      type: 'blockquote-line',
    }
  }

  const heading = parseHeadingLine(line)
  if (heading) {
    return {
      level: heading.level,
      text: heading.text,
      type: 'heading-line',
    }
  }

  if (isThematicBreakLine(line)) {
    return {
      type: 'thematic-break',
    }
  }

  const ordered = parseOrderedListItemLine(line)
  if (ordered) {
    return {
      indentation: ordered.indentation,
      text: ordered.text,
      type: 'ordered-list-item-line',
    }
  }

  const unordered = parseUnorderedListItemLine(line)
  if (unordered) {
    return {
      indentation: unordered.indentation,
      text: unordered.text,
      type: 'unordered-list-item-line',
    }
  }

  if (isTableRow(line)) {
    return {
      cells: getTableCells(line),
      line,
      type: 'table-row-line',
    }
  }

  return {
    text: line,
    type: 'paragraph-line',
  }
}

export const scanBlockTokens = (rawMessage: string): readonly BlockToken[] => {
  const normalizedMessage = normalizeInlineTables(normalizeEscapedNewlines(rawMessage))
  const lines = normalizedMessage.split(lineBreakRegex)
  const tokens: BlockToken[] = []

  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      tokens.push({
        type: 'blank-line',
      })
      index++
      continue
    }

    const codeBlock = scanCodeBlock(lines, index, trimmed)
    if (codeBlock) {
      tokens.push(codeBlock.token)
      index = codeBlock.nextIndex
      continue
    }

    const mathBlock = scanMathBlock(lines, index, trimmed)
    if (mathBlock) {
      tokens.push(mathBlock.token)
      index = mathBlock.nextIndex
      continue
    }

    tokens.push(getSingleLineToken(line))
    index++
  }

  return tokens
}
export type BlockToken =
  | BlockBlankToken
  | BlockBlockQuoteLineToken
  | BlockCodeToken
  | BlockHeadingLineToken
  | BlockMathToken
  | BlockOrderedListItemLineToken
  | BlockParagraphLineToken
  | BlockThematicBreakToken
  | BlockTableRowLineToken
  | BlockUnorderedListItemLineToken

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

interface BlockBlankToken {
  readonly type: 'blank-line'
}

interface BlockParagraphLineToken {
  readonly text: string
  readonly type: 'paragraph-line'
}

interface BlockBlockQuoteLineToken {
  readonly text: string
  readonly type: 'blockquote-line'
}

interface BlockHeadingLineToken {
  readonly level: HeadingLevel
  readonly text: string
  readonly type: 'heading-line'
}

interface BlockOrderedListItemLineToken {
  readonly indentation: number
  readonly text: string
  readonly type: 'ordered-list-item-line'
}

interface BlockUnorderedListItemLineToken {
  readonly indentation: number
  readonly text: string
  readonly type: 'unordered-list-item-line'
}

interface BlockTableRowLineToken {
  readonly cells: readonly string[]
  readonly line: string
  readonly type: 'table-row-line'
}

interface BlockCodeToken {
  readonly language?: string
  readonly text: string
  readonly type: 'code-block'
}

interface BlockMathToken {
  readonly text: string
  readonly type: 'math-block'
}

interface BlockThematicBreakToken {
  readonly type: 'thematic-break'
}

interface ParsedHeadingLine {
  readonly level: HeadingLevel
  readonly text: string
}

interface ScanResult {
  readonly nextIndex: number
  readonly token: BlockToken
}

interface ParsedOrderedListItemLine {
  readonly indentation: number
  readonly text: string
}

interface ParsedUnorderedListItemLine {
  readonly indentation: number
  readonly text: string
}

const markdownMathBlockDelimiter = '$$'
const escapedNewlineRegex = /\\r\\n|\\n/g
const lineBreakRegex = /\r?\n/
const tableDelimiterRegex = /\|\s*[-:]{3,}/
const inlineTableCellRegex = /\|\s+\|/g

const normalizeEscapedNewlines = (value: string): string => {
  if (value.includes('\\n')) {
    return value.replaceAll(escapedNewlineRegex, '\n')
  }
  return value
}

const normalizeInlineTables = (value: string): string => {
  return value
    .split(lineBreakRegex)
    .map((line) => {
      if (!line.includes('|')) {
        return line
      }
      if (!tableDelimiterRegex.test(line)) {
        return line
      }
      return line.replaceAll(inlineTableCellRegex, '|\n|')
    })
    .join('\n')
}

const parseHeadingLine = (line: string): ParsedHeadingLine | undefined => {
  const trimmedStart = line.trimStart()
  let index = 0
  while (index < trimmedStart.length && trimmedStart[index] === '#') {
    index++
  }
  if (index === 0 || index > 6) {
    return undefined
  }
  if (trimmedStart[index] !== ' ') {
    return undefined
  }
  const text = trimmedStart.slice(index).trimStart()
  return {
    level: index as 1 | 2 | 3 | 4 | 5 | 6,
    text,
  }
}

const parseOrderedListItemLine = (line: string): ParsedOrderedListItemLine | undefined => {
  let indentation = 0
  while (indentation < line.length && line[indentation] === ' ') {
    indentation++
  }
      level: index as HeadingLevel,
  const firstDigit = index
  while (index < line.length && line[index] >= '0' && line[index] <= '9') {
    index++

  const scanCodeBlock = (lines: readonly string[], start: number, trimmed: string): ScanResult | undefined => {
    if (!trimmed.startsWith('```')) {
      return undefined
    }
    const language = trimmed.slice(3).trim()
    const codeLines: string[] = []
    let index = start + 1
    while (index < lines.length && !lines[index].trim().startsWith('```')) {
      codeLines.push(lines[index])
      index++
    }
    return {
      nextIndex: Math.min(index + 1, lines.length),
      token: language
        ? {
            language,
            text: codeLines.join('\n'),
            type: 'code-block',
          }
        : {
            text: codeLines.join('\n'),
            type: 'code-block',
          },
    }
  }

  const scanMathBlock = (lines: readonly string[], start: number, trimmed: string): ScanResult | undefined => {
    if (trimmed !== markdownMathBlockDelimiter) {
      return undefined
    }
    let endIndex = start + 1
    while (endIndex < lines.length && lines[endIndex].trim() !== markdownMathBlockDelimiter) {
      endIndex++
    }
    if (endIndex >= lines.length) {
      return undefined
    }
    return {
      nextIndex: endIndex + 1,
      token: {
        text: lines
          .slice(start + 1, endIndex)
          .join('\n')
          .trim(),
        type: 'math-block',
      },
    }
  }

  const getSingleLineToken = (line: string): BlockToken => {
    const blockQuoteLine = parseBlockQuoteLine(line)
    if (blockQuoteLine !== undefined) {
      return {
        text: blockQuoteLine,
        type: 'blockquote-line',
      }
    }

    const heading = parseHeadingLine(line)
    if (heading) {
      return {
        level: heading.level,
        text: heading.text,
        type: 'heading-line',
      }
    }

    if (isThematicBreakLine(line)) {
      return {
        type: 'thematic-break',
      }
    }

    const ordered = parseOrderedListItemLine(line)
    if (ordered) {
      return {
        indentation: ordered.indentation,
        text: ordered.text,
        type: 'ordered-list-item-line',
      }
    }

    const unordered = parseUnorderedListItemLine(line)
    if (unordered) {
      return {
        indentation: unordered.indentation,
        text: unordered.text,
        type: 'unordered-list-item-line',
      }
    }

    if (isTableRow(line)) {
      return {
        cells: getTableCells(line),
        line,
        type: 'table-row-line',
      }
    }

    return {
      text: line,
      type: 'paragraph-line',
    }
  }
  }
  if (index === firstDigit || line[index] !== '.') {
    return undefined
  }
  index++
  if (line[index] !== ' ') {
    let index = 0
    while (index < lines.length) {
      const line = lines[index]
  while (index < line.length && line[index] === ' ') {
    index++
  }
  return {
    indentation,
    text: line.slice(index),
        index++
  }
}

      const codeBlock = scanCodeBlock(lines, index, trimmed)
      if (codeBlock) {
        tokens.push(codeBlock.token)
        index = codeBlock.nextIndex
  if (marker !== '-' && marker !== '*') {
    return undefined
  }
      const mathBlock = scanMathBlock(lines, index, trimmed)
      if (mathBlock) {
        tokens.push(mathBlock.token)
        index = mathBlock.nextIndex
    return ''
  }
  if (content.startsWith(' ')) {
      tokens.push(getSingleLineToken(line))
      index++
      })
      continue
    }

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      if (language) {
        tokens.push({
          language,
          text: codeLines.join('\n'),
          type: 'code-block',
        })
      } else {
        tokens.push({
          text: codeLines.join('\n'),
          type: 'code-block',
        })
      }
      continue
    }

    if (trimmed === markdownMathBlockDelimiter) {
      const endIndex = lines.findIndex((candidate, index) => {
        if (index <= i) {
          return false
        }
        return candidate.trim() === markdownMathBlockDelimiter
      })
      if (endIndex !== -1) {
        tokens.push({
          text: lines
            .slice(i + 1, endIndex)
            .join('\n')
            .trim(),
          type: 'math-block',
        })
        i = endIndex
        continue
      }
    }

    const heading = parseHeadingLine(line)
    if (heading) {
      tokens.push({
        level: heading.level,
        text: heading.text,
        type: 'heading-line',
      })
      continue
    }

    if (isThematicBreakLine(line)) {
      tokens.push({
        type: 'thematic-break',
      })
      continue
    }

    const ordered = parseOrderedListItemLine(line)
    if (ordered) {
      tokens.push({
        indentation: ordered.indentation,
        text: ordered.text,
        type: 'ordered-list-item-line',
      })
      continue
    }

    const unordered = parseUnorderedListItemLine(line)
    if (unordered) {
      tokens.push({
        indentation: unordered.indentation,
        text: unordered.text,
        type: 'unordered-list-item-line',
      })
      continue
    }

    if (isTableRow(line)) {
      tokens.push({
        cells: getTableCells(line),
        line,
        type: 'table-row-line',
      })
      continue
    }

    tokens.push({
      text: line,
      type: 'paragraph-line',
    })
  }

  return tokens
}
