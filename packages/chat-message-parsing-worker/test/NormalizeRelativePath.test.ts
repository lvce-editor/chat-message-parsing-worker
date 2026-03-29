import { expect, test } from '@jest/globals'
import { normalizeRelativePath } from '../src/parts/NormalizeRelativePath/NormalizeRelativePath.ts'

test('normalizeRelativePath should normalize separators and remove current directory segments', () => {
  expect(normalizeRelativePath('./src//parts\\Parse.ts')).toBe('src/parts/Parse.ts')
})

test('normalizeRelativePath should return dot when path becomes empty', () => {
  expect(normalizeRelativePath('././')).toBe('.')
  expect(normalizeRelativePath('///')).toBe('.')
})
