import { defineEventHandler, getRouterParam } from 'nitro/h3'

import { getTerm, orgOf, toMeta } from '~/server/utils/terms-store'

export default defineEventHandler(async (event) => {
  const term = await getTerm(orgOf(event), getRouterParam(event, 'slug') ?? '')
  return { ...toMeta(term), content: term.content, markdown: term.markdown }
})
