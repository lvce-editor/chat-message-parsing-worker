import pluginTypeScript from '@babel/preset-typescript'
import { babel } from '@rollup/plugin-babel'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { join } from 'path'
import { rollup } from 'rollup'
import type { RollupOptions } from 'rollup'
import { root } from './root.ts'

const getOptions = (input: string, outputFile: string, external: string[] = []): RollupOptions => {
  return {
    input,
    preserveEntrySignatures: 'strict',
    treeshake: {
      propertyReadSideEffects: false,
    },
    output: {
      file: outputFile,
      format: 'es',
      freeze: false,
      generatedCode: {
        constBindings: true,
        objectShorthand: true,
      },
    },
    external,
    plugins: [
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        presets: [pluginTypeScript],
      }),
      nodeResolve(),
    ],
  }
}

const bundle = async (options: RollupOptions) => {
  const input = await rollup(options)
  // @ts-ignore
  await input.write(options.output)
}

export const bundleDebugViewJs = async () => {
  const options = getOptions(
    join(root, 'packages/chat-network-worker/src/chatNetworkWorkerMain.ts'),
    join(root, '.tmp/dist-chat-network-worker/dist/chatNetworkWorkerMain.js'),
    ['ws', 'electron'],
  )
  await bundle(options)
}
