import { definePlugin } from 'nitro'
import { useRuntimeConfig } from 'nitro/runtime-config'

/**
 * `nitro.config.ts` inlines the documented `NITRO_MDOC_*` variables when the image is built, but Nitro only
 * maps `NITRO_<KEY>` at runtime. Without this, a container started with the documented names boots with an
 * empty config (production then refuses to start), and the proxy in front answers every browser request
 * without CORS headers. Runs first (file name), before the storage plugin reads the config.
 */
const PRIVATE = {
  jwtSecret: 'JWT_SECRET',
  apiKey: 'API_KEY',
  certificateSecret: 'CERTIFICATE_SECRET',
  documentBucket: 'DOCUMENT_BUCKET',
  documentEndpoint: 'DOCUMENT_ENDPOINT',
  documentRegion: 'DOCUMENT_REGION',
  documentAccessKeyId: 'DOCUMENT_ACCESS_KEY_ID',
  documentSecretAccessKey: 'DOCUMENT_SECRET_ACCESS_KEY',
} as const

export default definePlugin(() => {
  const config = useRuntimeConfig() as { public: Record<string, string>; private: Record<string, string> }

  for (const [key, name] of Object.entries(PRIVATE)) {
    const value = process.env[`NITRO_MDOC_PRIVATE_${name}`]
    // The app-specific name wins over a generic NITRO_PRIVATE_* one: in a shared stack env file the generic name
    // (e.g. NITRO_PRIVATE_API_KEY) belongs to other services and would otherwise silently replace this app's value.
    if (value) config.private[key] = value
  }

  // Read at build time by nitro.config.ts (and so inlined empty in the image): take it from the runtime environment too.
  const notionDbId = process.env.NITRO_MDOC_PRIVATE_NOTION_DB_ID || process.env.NOTION_DB_ID
  if (notionDbId && !config.private.notionDbId) config.private.notionDbId = notionDbId

  const docUrl = process.env.NITRO_MDOC_PUBLIC_DOC_URL
  if (docUrl) config.public.docUrl = docUrl
})
