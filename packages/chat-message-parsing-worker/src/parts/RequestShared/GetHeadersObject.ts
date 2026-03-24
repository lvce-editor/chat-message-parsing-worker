export const getHeadersObject = (headers: Readonly<Headers>): Record<string, string> => {
  const result: Record<string, string> = {}
  for (const [key, value] of headers) {
    result[key] = value
  }
  return result
}
