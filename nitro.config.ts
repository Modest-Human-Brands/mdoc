import { defineConfig } from 'nitro'
import Vue from 'unplugin-vue/rollup'

export default defineConfig({
  compatibilityDate: '2026-04-17',
  rollupConfig: {
    plugins: [Vue()],
  },
  serverDir: './server',
  runtimeConfig: {
    app: {
      version: '',
      buildTime: '',
    },
  },
})
