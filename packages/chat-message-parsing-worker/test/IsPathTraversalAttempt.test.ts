import { expect, test } from '@jest/globals'
import { isPathTraversalAttempt } from '../src/parts/IsPathTraversalAttempt/IsPathTraversalAttempt.ts'

test('isPathTraversalAttempt should return false for safe relative paths', () => {
  expect(isPathTraversalAttempt('src/index.ts')).toBe(false)
  expect(isPathTraversalAttempt('folder\\nested\\file.txt')).toBe(false)
})

test('isPathTraversalAttempt should reject absolute and file paths', () => {
  expect(isPathTraversalAttempt('/etc/passwd')).toBe(true)
  expect(isPathTraversalAttempt('\\server\\share')).toBe(true)
  expect(isPathTraversalAttempt('file:///workspace/src/index.ts')).toBe(true)
  expect(isPathTraversalAttempt('C:\\Windows\\System32')).toBe(true)
})

test('isPathTraversalAttempt should reject parent directory traversal and empty input', () => {
  expect(isPathTraversalAttempt('../secret.txt')).toBe(true)
  expect(isPathTraversalAttempt('nested/../secret.txt')).toBe(true)
  expect(isPathTraversalAttempt('')).toBe(false)
})
