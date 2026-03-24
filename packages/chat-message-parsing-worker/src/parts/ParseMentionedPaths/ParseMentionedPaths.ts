import { isPathTraversalAttempt } from '../IsPathTraversalAttempt/IsPathTraversalAttempt.ts'
import { normalizeRelativePath } from '../NormalizeRelativePath/NormalizeRelativePath.ts'

const mentionRegex = /(^|\s)@([^\s]+)/g
const maxMentionCount = 5

export const parseMentionedPaths = (value: string): readonly string[] => {
  const matches = value.matchAll(mentionRegex)
  const paths: string[] = []
  for (const match of matches) {
    const rawPath = match[2] || ''
    const cleanedPath = rawPath.replaceAll(/[),.;:!?]+$/g, '')
    if (!cleanedPath || isPathTraversalAttempt(cleanedPath)) {
      continue
    }
    const normalizedPath = normalizeRelativePath(cleanedPath)
    if (paths.includes(normalizedPath)) {
      continue
    }
    paths.push(normalizedPath)
    if (paths.length >= maxMentionCount) {
      break
    }
  }
  return paths
}
