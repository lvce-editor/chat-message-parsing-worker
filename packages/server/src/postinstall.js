import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const staticPath = join(root, 'node_modules', '@lvce-editor', 'static-server', 'static')
const commitHash = (await readdir(staticPath)).find((name) => /^[a-z\d]{7}$/.test(name))
if (!commitHash) {
  throw new Error('Server static commit not found')
}
const rendererPath = join(staticPath, commitHash, 'packages', 'renderer-worker', 'dist')
const workerPath = join(root, '.tmp', 'dist-chat-message-parsing-worker', 'dist', 'chatMessageParsingWorkerMain.js')
const workerUrl = `/remote/${pathToFileURL(workerPath).pathname.slice(1)}`
const occurrence = '`${assetDir}/packages/renderer-worker/node_modules/@lvce-editor/chat-message-parsing-worker/dist/chatMessageParsingWorkerMain.js`'
const replacement = JSON.stringify(workerUrl)
let found = false
for (const name of await readdir(rendererPath)) {
  if (!name.endsWith('.js')) {
    continue
  }
  const path = join(rendererPath, name)
  const content = await readFile(path, 'utf8')
  if (content.includes(occurrence)) {
    await writeFile(path, content.replaceAll(occurrence, replacement))
    found = true
  } else if (content.includes(replacement)) {
    found = true
  }
}
if (!found) {
  throw new Error('Chat message parsing worker URL not found')
}
