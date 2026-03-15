import { execa } from 'execa'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { bundleDebugViewJs } from './bundleJs.ts'
import { root } from './root.ts'

const dist = join(root, '.tmp', 'dist')
const debugViewDist = join(root, '.tmp', 'dist-chat-network-worker')
const networkWorkerDist = join(root, '.tmp', 'dist-chat-network-worker')
const toolWorkerDist = join(root, '.tmp', 'dist-chat-tool-worker')

const readJson = async (path) => {
  const content = await readFile(path, 'utf8')
  return JSON.parse(content)
}

const writeJson = async (path, json) => {
  await writeFile(path, JSON.stringify(json, null, 2) + '\n')
}

const getGitTagFromGit = async () => {
  const { stdout, stderr, exitCode } = await execa('git', ['describe', '--exact-match', '--tags'], {
    reject: false,
  })
  if (exitCode) {
    if (exitCode === 128 && stderr.startsWith('fatal: no tag exactly matches')) {
      return '0.0.0-dev'
    }
    return '0.0.0-dev'
  }
  if (stdout.startsWith('v')) {
    return stdout.slice(1)
  }
  return stdout
}

const getVersion = async () => {
  const { env } = process
  const { RG_VERSION, GIT_TAG } = env
  if (RG_VERSION) {
    if (RG_VERSION.startsWith('v')) {
      return RG_VERSION.slice(1)
    }
    return RG_VERSION
  }
  if (GIT_TAG) {
    if (GIT_TAG.startsWith('v')) {
      return GIT_TAG.slice(1)
    }
    return GIT_TAG
  }
  return getGitTagFromGit()
}

await rm(dist, { recursive: true, force: true })
await rm(debugViewDist, { recursive: true, force: true })
await rm(networkWorkerDist, { recursive: true, force: true })
await rm(toolWorkerDist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
await mkdir(debugViewDist, { recursive: true })
await mkdir(networkWorkerDist, { recursive: true })
await mkdir(toolWorkerDist, { recursive: true })

await bundleDebugViewJs()

const version = await getVersion()

await cp(join(root, 'README.md'), join(dist, 'README.md'))
await cp(join(root, 'LICENSE'), join(dist, 'LICENSE'))

const debugViewPackageJson = await readJson(join(root, 'packages', 'chat-network-worker', 'package.json'))

delete debugViewPackageJson.scripts
delete debugViewPackageJson.dependencies
delete debugViewPackageJson.devDependencies
delete debugViewPackageJson.prettier
delete debugViewPackageJson.jest
delete debugViewPackageJson.xo
delete debugViewPackageJson.directories
delete debugViewPackageJson.nodemonConfig
debugViewPackageJson.version = version
debugViewPackageJson.main = 'dist/chatNetworkWorkerMain.js'

await writeJson(join(debugViewDist, 'package.json'), debugViewPackageJson)
await cp(join(root, 'README.md'), join(debugViewDist, 'README.md'))
await cp(join(root, 'LICENSE'), join(debugViewDist, 'LICENSE'))
