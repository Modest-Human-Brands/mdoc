// server/api/decor/builtin/[file].get.ts
import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'

import { getBuiltinDecor, normalizeImage, readBuiltinDecorFile } from '~/server/utils/decor'
import { handleApiError } from '~/server/utils/api-error'

/** Thumbnail / preview of a built-in decor as PNG, e.g. /api/decor/builtin/leaf.png */
export default defineEventHandler(async (event) => {
  try {
    const id = (getRouterParam(event, 'file') || '').replace(/\.png$/, '')
    const decor = getBuiltinDecor(id)
    const file = decor && (await readBuiltinDecorFile(decor.file))
    if (!decor || !file) throw new HTTPError({ statusCode: 404, statusMessage: 'Decor not found' })

    event.res.headers.set('Content-Type', 'image/png')
    event.res.headers.set('Cache-Control', 'public, max-age=86400')
    return await normalizeImage(file)
  } catch (error: unknown) {
    return handleApiError(error, 'decor/builtin')
  }
})
