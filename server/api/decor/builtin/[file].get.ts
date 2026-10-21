import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'

import { getBuiltinDecor, normalizeImage, readBuiltinDecorFile } from '~/server/utils/decor'

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
    if (error instanceof Error && 'statusCode' in error) {
      error.stack = undefined
      throw error
    }

    console.error('decor/builtin', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    serverError.stack = undefined
    throw serverError
  }
})
