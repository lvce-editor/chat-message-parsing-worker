import * as ClassNames from '../ClassNames/ClassNames.ts'

export interface CodeToken {
  readonly className: string
  readonly text: string
}

interface TokenRule {
  readonly className: string
  readonly regex: RegExp
}

const jsRules: readonly TokenRule[] = [
  { className: ClassNames.TokenComment, regex: /\/\/[^\n]*/ },
  { className: ClassNames.TokenComment, regex: /\/\*[\s\S]*?\*\// },
  { className: ClassNames.TokenString, regex: /"[^"\\]*(?:\\.[^"\\]*)*"/ },
  { className: ClassNames.TokenString, regex: /'[^'\\]*(?:\\.[^'\\]*)*'/ },
  { className: ClassNames.TokenString, regex: /`[^`\\]*(?:\\.[^`\\]*)*`/ },
  { className: ClassNames.TokenNumber, regex: /\b\d+\.?\d*\b/ },
  {
    className: ClassNames.TokenKeyword,
    regex:
      /\b(?:const|let|var|function|return|if|else|for|while|class|new|typeof|instanceof|import|export|from|default|async|await|try|catch|finally|throw|this|true|false|null|undefined)\b/,
  },
]

const tsRules: readonly TokenRule[] = [
  { className: ClassNames.TokenComment, regex: /\/\/[^\n]*/ },
  { className: ClassNames.TokenComment, regex: /\/\*[\s\S]*?\*\// },
  { className: ClassNames.TokenString, regex: /"[^"\\]*(?:\\.[^"\\]*)*"/ },
  { className: ClassNames.TokenString, regex: /'[^'\\]*(?:\\.[^'\\]*)*'/ },
  { className: ClassNames.TokenString, regex: /`[^`\\]*(?:\\.[^`\\]*)*`/ },
  { className: ClassNames.TokenNumber, regex: /\b\d+\.?\d*\b/ },
  {
    className: ClassNames.TokenKeyword,
    regex:
      /\b(?:abstract|any|as|asserts|async|await|boolean|class|const|constructor|declare|default|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|infer|instanceof|interface|is|keyof|let|module|namespace|never|new|null|number|object|override|private|protected|public|readonly|return|satisfies|set|static|string|super|switch|symbol|this|throw|true|try|type|typeof|undefined|unknown|var|void|while)\b/,
  },
]

const htmlRules: readonly TokenRule[] = [
  { className: ClassNames.TokenComment, regex: /<!--[\s\S]*?-->/ },
  { className: ClassNames.TokenTag, regex: /<\/[a-zA-Z][a-zA-Z0-9-]*\s*>/ },
  { className: ClassNames.TokenTag, regex: /<[a-zA-Z][a-zA-Z0-9-]*/ },
  { className: ClassNames.TokenTag, regex: /\/?>/ },
  { className: ClassNames.TokenString, regex: /"[^"]*"/ },
  { className: ClassNames.TokenString, regex: /'[^']*'/ },
  { className: ClassNames.TokenAttribute, regex: /[a-zA-Z-]+(?=\s*=)/ },
]

const cssRules: readonly TokenRule[] = [
  { className: ClassNames.TokenComment, regex: /\/\*[\s\S]*?\*\// },
  { className: ClassNames.TokenString, regex: /"[^"]*"/ },
  { className: ClassNames.TokenString, regex: /'[^']*'/ },
  { className: ClassNames.TokenValue, regex: /#[0-9a-fA-F]{3,8}/ },
  { className: ClassNames.TokenValue, regex: /\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|pt|s|ms|fr)?\b/ },
  { className: ClassNames.TokenProperty, regex: /[a-zA-Z-]+(?=\s*:)/ },
]

const pythonRules: readonly TokenRule[] = [
  { className: ClassNames.TokenComment, regex: /#[^\n]*/ },
  { className: ClassNames.TokenString, regex: /"[^"\\]*(?:\\.[^"\\]*)*"/ },
  { className: ClassNames.TokenString, regex: /'[^'\\]*(?:\\.[^'\\]*)*'/ },
  { className: ClassNames.TokenNumber, regex: /\b\d+\.?\d*\b/ },
  {
    className: ClassNames.TokenKeyword,
    regex:
      /\b(?:def|class|return|if|elif|else|for|while|in|import|from|as|with|try|except|finally|raise|lambda|yield|pass|break|continue|True|False|None|and|or|not|is)\b/,
  },
]

const jsonRules: readonly TokenRule[] = [
  { className: ClassNames.TokenProperty, regex: /"[^"\\]*(?:\\.[^"\\]*)*"(?=\s*:)/ },
  { className: ClassNames.TokenString, regex: /"[^"\\]*(?:\\.[^"\\]*)*"/ },
  { className: ClassNames.TokenNumber, regex: /-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/ },
  { className: ClassNames.TokenKeyword, regex: /\b(?:true|false|null)\b/ },
]

const tokenize = (code: string, rules: readonly TokenRule[]): readonly CodeToken[] => {
  const tokens: CodeToken[] = []
  let pos = 0

  while (pos < code.length) {
    let matched = false
    for (const rule of rules) {
      const match = rule.regex.exec(code.slice(pos))
      if (match && match.index === 0) {
        tokens.push({ className: rule.className, text: match[0] })
        pos += match[0].length
        matched = true
        break
      }
    }
    if (!matched) {
      const last = tokens.at(-1)
      if (last && last.className === '') {
        tokens.pop()
        tokens.push({ className: '', text: last.text + code[pos] })
      } else {
        tokens.push({ className: '', text: code[pos] })
      }
      pos++
    }
  }

  return tokens
}

export const highlightCode = (code: string, language: string | undefined): readonly CodeToken[] => {
  if (!language) {
    return [{ className: '', text: code }]
  }
  const normalized = language.toLowerCase()
  if (normalized === 'html') {
    return tokenize(code, htmlRules)
  }
  if (normalized === 'css') {
    return tokenize(code, cssRules)
  }
  if (normalized === 'js' || normalized === 'javascript') {
    return tokenize(code, jsRules)
  }
  if (normalized === 'ts' || normalized === 'typescript') {
    return tokenize(code, tsRules)
  }
  if (normalized === 'py' || normalized === 'python') {
    return tokenize(code, pythonRules)
  }
  if (normalized === 'json') {
    return tokenize(code, jsonRules)
  }
  return [{ className: '', text: code }]
}
