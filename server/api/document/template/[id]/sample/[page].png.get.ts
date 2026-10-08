// server/api/document/template/[id]/sample/[page].png.get.ts
import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'

import { handleApiError } from '~/server/utils/api-error'
import { readSampleImage } from '~/server/utils/sample-manifest'

/** Static sample image of a template page, e.g. /api/document/template/invoice/sample/1.png (cache-busted with ?v=<hash>). */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id') || ''
    const page = Number.parseInt(getRouterParam(event, 'page') || '', 10)
    const image = /^[a-z0-9-]+$/.test(id) && page > 0 ? await readSampleImage(id, page) : undefined
    if (!image) throw new HTTPError({ statusCode: 404, statusMessage: 'Sample image not found. Run the templates:sample-images task.' })

    event.res.headers.set('Content-Type', 'image/png')
    event.res.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return image
  } catch (error: unknown) {
    return handleApiError(error, 'template/[id]/sample.png.get')
  }
})
