export const parseWriteFileLineCounts = (rawResult: string | undefined): { readonly linesAdded: number; readonly linesDeleted: number } => {
  if (!rawResult) {
    return {
      linesAdded: 0,
      linesDeleted: 0,
    }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(rawResult)
  } catch {
    return {
      linesAdded: 0,
      linesDeleted: 0,
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return {
      linesAdded: 0,
      linesDeleted: 0,
    }
  }
  const linesAdded = Reflect.get(parsed, 'linesAdded')
  const linesDeleted = Reflect.get(parsed, 'linesDeleted')
  return {
    linesAdded: typeof linesAdded === 'number' ? Math.max(0, linesAdded) : 0,
    linesDeleted: typeof linesDeleted === 'number' ? Math.max(0, linesDeleted) : 0,
  }
}
