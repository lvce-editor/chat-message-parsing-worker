import { defineConfig } from 'eslint/config'
import * as config from '@lvce-editor/eslint-config'
import * as tsconfig from '@lvce-editor/eslint-plugin-tsconfig'

export default defineConfig([
  ...config.default,
  ...config.recommendedVirtualDom,
  ...config.recommendedActions,
  ...tsconfig.default,
  {
    rules: {
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
    },
  },
  {
    files: ['packages/chat-message-parsing-worker/{src,test}/**/*.ts'],
    rules: {
      'sonarjs/super-linear-regex': 'off',
      'unicorn/max-nested-calls': 'off',
      'unicorn/no-break-in-nested-loop': 'off',
      'unicorn/prefer-includes-over-repeated-comparisons': 'off',
    },
  },
  {
    files: ['packages/chat-message-parsing-worker/test/**/*.ts'],
    rules: {
      'virtual-dom/no-inline-style': 'off',
      'virtual-dom/no-object-attribute-values': 'off',
    },
  },
  {
    files: [
      'packages/chat-message-parsing-worker/src/parts/ParseHtmlToVirtualDom/ParseHtmlToVirtualDom.ts',
      'packages/chat-message-parsing-worker/src/parts/ParseMessageContent/ParseBlockTokens.ts',
      'packages/chat-message-parsing-worker/src/parts/ParseMessageContent/ParseInlineNodes.ts',
    ],
    rules: {
      'virtual-dom/no-object-attribute-values': 'off',
    },
  },
  {
    files: ['packages/chat-message-parsing-worker/src/parts/ParseMessageContent/ParseBlockTokens.ts'],
    rules: {
      'virtual-dom/prefer-state-destructuring': 'off',
    },
  },
])
