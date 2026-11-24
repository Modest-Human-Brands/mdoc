import { defineEventHandler, getRouterParam, readValidatedBody } from 'nitro/h3'

import { contentSchema, orgOf, saveTermContent } from '~/server/utils/terms-store'

export default defineEventHandler(async (event) => {
  const { content } = await readValidatedBody(event, contentSchema)
  const term = await saveTermContent(orgOf(event), getRouterParam(event, 'slug') ?? '', content)
  return { success: true, version: term.version, updatedAt: term.updatedAt }
})
