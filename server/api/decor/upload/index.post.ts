import { defineEventHandler, HTTPError } from 'nitro/h3'

import { MAX_DECOR_BYTES, storeUpload } from '~/server/utils/decor'

const fieldError = (field: string, message: string, code: string, statusCode = 400) => new HTTPError({ statusCode, statusMessage: 'Bad Request', data: { errors: [{ field, message, code }] } })

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
    if (error instanceof Error && 'statusCode' in error) {
      error.stack = undefined
      throw error
    }

    console.error('decor/upload.post', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    serverError.stack = undefined
    throw serverError
  }
})
