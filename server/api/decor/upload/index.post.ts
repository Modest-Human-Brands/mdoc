// server/api/decor/upload/index.post.ts
import { defineEventHandler, HTTPError } from 'nitro/h3'

import { MAX_DECOR_BYTES, storeUpload } from '~/server/utils/decor'
import { handleApiError } from '~/server/utils/api-error'

const fieldError = (field: string, message: string, code: string, statusCode = 400) => new HTTPError({ statusCode, statusMessage: 'Bad Request', data: { errors: [{ field, message, code }] } })

/** multipart/form-data with a `file` field (PNG, JPG, WebP or SVG up to 2 MB). Returns the decor reference to put in the payload. */
export default defineEventHandler(async (event) => {
  try {
    const form = await event.req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) throw fieldError('file', 'file is required', 'invalid_type')
    if (file.size > MAX_DECOR_BYTES) throw fieldError('file', 'Image is larger than 2 MB', 'too_big', 413)

    try {
      const { id, hash } = await storeUpload(Buffer.from(await file.arrayBuffer()))
      return { id, url: `/api/decor/upload/${hash}.png` }
    } catch (error) {
      throw fieldError('file', (error as Error).message || 'Not a valid image', 'invalid_value')
    }
  } catch (error: unknown) {
    return handleApiError(error, 'decor/upload.post')
  }
})
