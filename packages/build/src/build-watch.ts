import { execa } from 'execa'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { root } from './root.ts'

const esbuild = join(root, 'packages', 'build', 'node_modules', '.bin', 'esbuild')

const commonArgs = ['--format=esm', '--bundle', '--platform=node', '--watch']

const tasks = [
  {
    input: 'packages/chat-network-worker/src/chatNetworkWorkerMain.ts',
    outputDir: '.tmp/dist-chat-network-worker/dist',
    outputFile: '.tmp/dist-chat-network-worker/dist/chatNetworkWorkerMain.js',
    external: ['electron', 'ws'],
  },
]

const main = async () => {
  for (const task of tasks) {
    await mkdir(join(root, task.outputDir), { recursive: true })
    const args = [...commonArgs, ...task.external.map((item) => `--external:${item}`), task.input, `--outfile=${task.outputFile}`]
    execa(esbuild, args, {
      cwd: root,
      stdio: 'inherit',
    })
  }
}

main()
