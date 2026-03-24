export const getFetchErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return 'request failed'
}
