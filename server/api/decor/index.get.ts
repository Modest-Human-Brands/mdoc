import { defineEventHandler, getQuery, HTTPError } from 'nitro/h3'

import { builtinDecors } from '~/server/utils/decor'

export default defineEventHandler((event) => {
  try {
    const slot = getQuery(event).slot
    return builtinDecors
      .filter((decor) => !slot || decor.slots.includes(String(slot)))
      .map(({ id, label, kind, tintable, slots }) => ({
        id: `builtin:${id}`,
        label,
        kind,
        tintable,
        slots,
        thumbUrl: `/api/decor/builtin/${id}.png`,
      }))
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      error.stack = undefined
      throw error
    }

    console.error('decor/index.get', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    serverError.stack = undefined
    throw serverError
  }
})
