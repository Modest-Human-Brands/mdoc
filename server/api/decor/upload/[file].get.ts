// server/api/decor/upload/[file].get.ts
import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'

import { handleApiError } from '~/server/utils/api-error'

/** Serves a previously uploaded decor (content-addressed, so it can be cached forever). */
export default defineEventHandler(async (event) => {
  try {
    const hash = (getRouterParam(event, 'file') || '').replace(/\.png$/, '')
    const stored = /^[a-f0-9]{40}$/.test(hash) ? await useStorage('data').getItemRaw<Buffer>(`decor-uploads:${hash}.png`) : undefined
    if (!stored) throw new HTTPError({ statusCode: 404, statusMessage: 'Decor not found' })

    event.res.headers.set('Content-Type', 'image/png')
    event.res.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return Buffer.from(stored)
  } catch (error: unknown) {
    return handleApiError(error, 'decor/upload.get')
  }
})
