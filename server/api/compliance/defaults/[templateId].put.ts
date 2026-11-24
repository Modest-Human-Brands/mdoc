import { defineEventHandler, getRouterParam, HTTPError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'

import { templateRegistry } from '~/server/utils/template-registry'
import { orgOf, setTemplateDefaults } from '~/server/utils/terms-store'

import '~/templates/document'

const bodySchema = z.object({ slugs: z.array(z.string().min(1)).max(200) })

export default defineEventHandler(async (event) => {
  const templateId = getRouterParam(event, 'templateId') ?? ''
  if (!templateRegistry[templateId]?.terms) throw new HTTPError({ statusCode: 404, statusMessage: `Template '${templateId}' does not use terms.` })

  const { slugs } = await readValidatedBody(event, bodySchema)
  return setTemplateDefaults(orgOf(event), templateId, slugs)
})
