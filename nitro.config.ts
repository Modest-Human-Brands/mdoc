import { fileURLToPath } from 'node:url'
import { defineConfig } from 'nitro'
import vue from 'unplugin-vue/rollup'
import mcp from 'nitro-mcp-toolkit/module'

export default defineConfig({
  modules: [mcp()],
  serverDir: './server',

  alias: { '~': fileURLToPath(new URL('.', import.meta.url)) },
  rollupConfig: {
    plugins: [vue()],
    external: ['mupdf', '@napi-rs/canvas', 'css-tree', 'mdn-data', 'source-map-js'],
  },

  features: {
    websocket: true,
  },

  serverAssets: [
    { baseName: 'decor', dir: './public/decor' },
    { baseName: 'templates', dir: './public/templates' },
  ],
  experimental: {
    tasks: true,
  },
  runtimeConfig: {
    app: {
      version: '',
      buildTime: '',
    },
    public: {
      docUrl: '',
    },
    private: {
      notionDbId: '',
      jwtSecret: '',
      certificateSecret: '',
    },
  },
  storage: {
    fs: {
      driver: 'fs',
      base: './static',
    },
    data: {
      driver: 'fs',
      base: './.data',
    },
  },
  routeRules: {
    '/api/**': { cors: true },
  },
})
