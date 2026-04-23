// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt([
  {
    ignores: ['static'],
  },
  {
    rules: {
      'vue/html-self-closing': 'off',
    },
  },
])
