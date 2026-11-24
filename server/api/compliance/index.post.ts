import { defineEventHandler, readValidatedBody, setResponseStatus } from 'nitro/h3'

import { createTerm, createTermSchema, orgOf, toMeta } from '~/server/utils/terms-store'

export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, createTermSchema)
  const term = await createTerm(orgOf(event), input)
  setResponseStatus(event, 201)
  return { doc: toMeta(term) }
})
