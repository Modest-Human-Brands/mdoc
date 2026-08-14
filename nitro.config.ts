import { defineConfig } from 'nitro'
import vue from 'unplugin-vue/rollup'
import mcp from 'nitro-mcp-toolkit/module'

export default defineConfig({
  modules: [mcp()],
  serverDir: './server',
  rollupConfig: {
    plugins: [vue()],
    external: ['mupdf', '@napi-rs/canvas'],
  },
  // imports: {},
  features: {
    websocket: true,
  },
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
    '/api/document/**/content': { cors: true },
  },
})
