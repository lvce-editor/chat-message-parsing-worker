export const parseToolArguments = (rawArguments: unknown): Record<string, unknown> => {
  if (typeof rawArguments !== 'string') {
    return {}
  }
  try {
    const parsed = JSON.parse(rawArguments) as unknown
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }
    return parsed as Record<string, unknown>
  } catch {
    return {}
  }
}
