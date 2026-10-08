// server/api/decor/index.get.ts
import { defineEventHandler, getQuery } from 'nitro/h3'

import { builtinDecors } from '~/server/utils/decor'
import { handleApiError } from '~/server/utils/api-error'

/** Built-in decor catalogue for the picker. Optional `?slot=` filters to decors that fit a template slot. */
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
    return handleApiError(error, 'decor/index.get')
  }
})
