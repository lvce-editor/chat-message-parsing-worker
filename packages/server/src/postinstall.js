import { cp, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const root = join(__dirname, '..', '..', '..')

export const getRemoteUrl = (path) => {
  const url = pathToFileURL(path).toString().slice(8)
  return `/remote/${url}`
}

const nodeModulesPath = join(root, 'packages', 'server', 'node_modules')

const serverStaticPath = join(nodeModulesPath, '@lvce-editor', 'static-server', 'static')

const RE_COMMIT_HASH = /^[a-z\d]+$/
const isCommitHash = (dirent) => {
  return dirent.length === 7 && dirent.match(RE_COMMIT_HASH)
}

const dirents = await readdir(serverStaticPath)
const commitHash = dirents.find(isCommitHash) || ''
const rendererWorkerMainPath = join(serverStaticPath, commitHash, 'packages', 'renderer-worker', 'dist', 'rendererWorkerMain.js')

const content = await readFile(rendererWorkerMainPath, 'utf-8')

const chatViewWorkerPath = join(root, '.tmp/dist/dist/chatMessageParsingWorker.js')
const chatMessageParsingWorkerPath = join(root, '.tmp/dist-chat-message-parsing-worker/dist/chatMessageParsingWorkerMain.js')

const replaceWorkerUrl = (currentContent, variableName, packageName, workerMainName, localPath) => {
  const remoteUrl = getRemoteUrl(localPath)
  const occurrence = `const ${variableName} = \`\${assetDir}/packages/${packageName}/dist/${workerMainName}\``
  const replacement = `// const ${variableName} = \`\${assetDir}/packages/${packageName}/dist/${workerMainName}\`
const ${variableName} = \`${remoteUrl}\``
  if (!currentContent.includes(occurrence)) {
    return currentContent
  }
  return currentContent.replace(occurrence, replacement)
}

let newContent = content
newContent = replaceWorkerUrl(
  newContent,
  'chatMessageParsingWorkerUrl',
  'chat-message-parsing-worker',
  'chatMessageParsingWorker.js',
  chatViewWorkerPath,
)
newContent = replaceWorkerUrl(
  newContent,
  'chatMessageParsingWorkerUrl',
  'chat-message-parsing-worker',
  'chatMessageParsingWorkerMain.js',
  chatMessageParsingWorkerPath,
)

if (newContent !== content) {
  await cp(rendererWorkerMainPath, rendererWorkerMainPath + '.original')
  await writeFile(rendererWorkerMainPath, newContent)
}
