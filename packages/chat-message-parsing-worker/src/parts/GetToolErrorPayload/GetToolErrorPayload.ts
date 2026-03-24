export const getToolErrorPayload = (error: unknown): { readonly error: string; readonly errorStack?: string; readonly stack?: string } => {
  const rawStack = error && typeof error === 'object' ? Reflect.get(error, 'stack') : undefined
  return {
    error: String(error),
    ...(typeof rawStack === 'string' && rawStack.trim()
      ? {
          errorStack: rawStack,
          stack: rawStack,
        }
      : {}),
  }
}
