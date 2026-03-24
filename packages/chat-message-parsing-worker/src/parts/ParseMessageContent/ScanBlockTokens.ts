export type BlockToken =
  | BlockBlankToken
  | BlockCodeToken
  | BlockHeadingLineToken
  | BlockMathToken
  | BlockOrderedListItemLineToken
  | BlockParagraphLineToken
  | BlockTableRowLineToken
  | BlockUnorderedListItemLineToken

interface BlockBlankToken {
  readonly type: 'blank-line'
}

interface BlockParagraphLineToken {
  readonly text: string
  readonly type: 'paragraph-line'
}

interface BlockHeadingLineToken {
  readonly level: 1 | 2 | 3 | 4 | 5 | 6
  readonly text: string
  readonly type: 'heading-line'
}

interface BlockOrderedListItemLineToken {
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

interface ParsedHeadingLine {
  readonly level: 1 | 2 | 3 | 4 | 5 | 6
  readonly text: string
}

interface ParsedOrderedListItemLine {
  readonly text: string
}

interface ParsedUnorderedListItemLine {
  readonly indentation: number
  readonly text: string
}

const markdownMathBlockDelimiter = '$$'

const normalizeEscapedNewlines = (value: string): string => {
  if (value.includes('\\n')) {
    return value.replaceAll(/\\r\\n|\\n/g, '\n')
  }
  return value
}

const normalizeInlineTables = (value: string): string => {
  return value
    .split(/\r?\n/)
    .map((line) => {
      if (!line.includes('|')) {
        return line
      }
      if (!/\|\s*[-:]{3,}/.test(line)) {
        return line
      }
      return line.replaceAll(/\|\s+\|/g, '|\n|')
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
  let index = 0
  while (index < line.length && line[index] === ' ') {
    index++
  }
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

const isTableRow = (line: string): boolean => {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return false
  }
  return trimmed.length > 2 && trimmed.slice(1, -1).includes('|')
}

const getTableCells = (line: string): readonly string[] => {
  const trimmed = line.trim()
  return trimmed
    .slice(1, -1)
    .split('|')
    .map((part) => part.trim())
}

export const scanBlockTokens = (rawMessage: string): readonly BlockToken[] => {
  const normalizedMessage = normalizeInlineTables(normalizeEscapedNewlines(rawMessage))
  const lines = normalizedMessage.split(/\r?\n/)
  const tokens: BlockToken[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      tokens.push({
        type: 'blank-line',
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

    const ordered = parseOrderedListItemLine(line)
    if (ordered) {
      tokens.push({
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
