import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'

export default defineEventHandler(async (event) => {
  try {
    const hash = (getRouterParam(event, 'file') || '').replace(/\.png$/, '')
    const stored = /^[a-f0-9]{40}$/.test(hash) ? await useStorage('data').getItemRaw<Buffer>(`decor-uploads:${hash}.png`) : undefined
    if (!stored) throw new HTTPError({ statusCode: 404, statusMessage: 'Decor not found' })

    event.res.headers.set('Content-Type', 'image/png')
    event.res.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return Buffer.from(stored)
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      error.stack = undefined
      throw error
    }

    console.error('decor/upload.get', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    serverError.stack = undefined
    throw serverError
  }
})
