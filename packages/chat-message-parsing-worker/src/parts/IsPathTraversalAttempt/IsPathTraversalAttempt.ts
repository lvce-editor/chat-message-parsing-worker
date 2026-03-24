const windowsAbsolutePathRegex = /^[a-zA-Z]:[\\/]/
const pathSeparatorRegex = /[\\/]/

export const isPathTraversalAttempt = (path: string): boolean => {
  if (!path) {
    return false
  }
  if (path.startsWith('/') || path.startsWith('\\')) {
    return true
  }
  if (path.startsWith('file://')) {
    return true
  }
  if (windowsAbsolutePathRegex.test(path)) {
    return true
  }
  const segments = path.split(pathSeparatorRegex)
  return segments.includes('..')
}
