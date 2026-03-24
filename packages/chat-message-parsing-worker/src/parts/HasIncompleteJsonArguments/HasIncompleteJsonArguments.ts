export const hasIncompleteJsonArguments = (rawArguments: string): boolean => {
  try {
    JSON.parse(rawArguments)
    return false
  } catch {
    return true
  }
}
