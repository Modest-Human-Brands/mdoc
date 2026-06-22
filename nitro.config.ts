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
  runtimeConfig: {
    app: {
      version: '',
      buildTime: '',
    },
    public: {
      siteUrl: '',
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
  },
  routeRules: {
    '/api/document/**/content': { cors: true },
  },
})
