import * as config from '@lvce-editor/eslint-config'
import * as actions from '@lvce-editor/eslint-plugin-github-actions'
import * as tsconfig from '@lvce-editor/eslint-plugin-tsconfig'

export default [
  ...config.default,
  ...actions.default,
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
]
