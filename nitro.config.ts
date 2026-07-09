import { defineConfig } from 'nitro'
import vue from 'unplugin-vue/rollup'

export default defineConfig({
  serverDir: './server',
  rollupConfig: {
    plugins: [vue()],
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
