import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'

import { readSampleImage } from '~/server/utils/sample-manifest'

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
    if (error instanceof Error && 'statusCode' in error) {
      error.stack = undefined
      throw error
    }

    console.error('template/[id]/sample.png.get', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    serverError.stack = undefined
    throw serverError
  }
})
