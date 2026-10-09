import { cp } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { root } from './root.ts'

const sharedProcessPath = join(root, 'node_modules', '@lvce-editor', 'shared-process', 'index.js')
const sharedProcess = await import(pathToFileURL(sharedProcessPath).toString())

process.env.PATH_PREFIX = '/chat-message-parsing-worker'
const { commitHash } = await sharedProcess.exportStatic({
  root,
  extensionPath: '',
  testPath: 'packages/e2e',
})

await cp(
  join(root, '.tmp', 'dist-chat-message-parsing-worker', 'dist'),
  join(root, 'dist', commitHash, 'packages', 'chat-message-parsing-worker', 'dist'),
  { recursive: true },
)
await cp(join(root, 'dist'), join(root, '.tmp', 'static'), { recursive: true })
