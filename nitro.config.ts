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
      docUrl: process.env.NITRO_MDOC_PUBLIC_DOC_URL || '',
    },
    private: {
      notionDbId: process.env.NOTION_DB_ID || '',
      jwtSecret: process.env.NITRO_MDOC_PRIVATE_JWT_SECRET || '',
      apiKey: process.env.NITRO_MDOC_PRIVATE_API_KEY || '',
      certificateSecret: process.env.NITRO_MDOC_PRIVATE_CERTIFICATE_SECRET || '',
      documentBucket: process.env.NITRO_MDOC_PRIVATE_DOCUMENT_BUCKET || '',
      documentEndpoint: process.env.NITRO_MDOC_PRIVATE_DOCUMENT_ENDPOINT || '',
      documentRegion: process.env.NITRO_MDOC_PRIVATE_DOCUMENT_REGION || 'auto',
      documentAccessKeyId: process.env.NITRO_MDOC_PRIVATE_DOCUMENT_ACCESS_KEY_ID || '',
      documentSecretAccessKey: process.env.NITRO_MDOC_PRIVATE_DOCUMENT_SECRET_ACCESS_KEY || '',
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
