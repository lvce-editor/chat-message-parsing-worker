export interface ParsedRenderHtmlArguments {
  readonly css: string
  readonly html: string
  readonly title: string
}

export const parseRenderHtmlArguments = (rawArguments: string): ParsedRenderHtmlArguments | undefined => {
  try {
    const parsed = JSON.parse(rawArguments) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined
    }

    const html = typeof Reflect.get(parsed, 'html') === 'string' ? String(Reflect.get(parsed, 'html')) : ''
    if (!html) {
      return undefined
    }

    const css = typeof Reflect.get(parsed, 'css') === 'string' ? String(Reflect.get(parsed, 'css')) : ''
    const title = typeof Reflect.get(parsed, 'title') === 'string' ? String(Reflect.get(parsed, 'title')) : 'visual preview'

    return {
      css,
      html,
      title,
    }
  } catch {
    return undefined
  }
}
