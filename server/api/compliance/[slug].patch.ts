import { defineEventHandler, getRouterParam, readValidatedBody } from 'nitro/h3'

import { orgOf, toMeta, updateTermMeta, updateTermSchema } from '~/server/utils/terms-store'

export default defineEventHandler(async (event) => {
  const patch = await readValidatedBody(event, updateTermSchema)
  return toMeta(await updateTermMeta(orgOf(event), getRouterParam(event, 'slug') ?? '', patch))
})
