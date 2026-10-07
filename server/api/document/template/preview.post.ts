// server/api/document/template/preview.post.ts
import { defineEventHandler, readBody, HTTPError } from 'nitro/h3'
import { h } from 'vue'
import { renderToBuffer } from '@ceereals/vue-pdf'
import { z } from 'zod'

import { templateRegistry } from '~/server/utils/template-registry'
import { resolveOrganization } from '~/server/utils/organization-store'
import { handleApiError } from '~/server/utils/api-error'

import '~/templates/document'

const previewRequestSchema = z.object({
  templateId: z.string().min(1, 'templateId is required'),
  variables: z.record(z.string(), z.any()).default({}),
})

export default defineEventHandler(async (event) => {
  try {
    const rawBody = await readBody(event)
    const { templateId, variables } = previewRequestSchema.parse(rawBody)

    const templateDef = templateRegistry[templateId]
    if (!templateDef) {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: `Template '${templateId}' not found.`,
      })
    }

    // Resolve organization profile from ID preset or fallback placeholder
    const orgInput = variables.organizationId || variables.organization || variables.orgId
    const resolvedOrg = resolveOrganization(orgInput, templateDef.placeholders?.organization)

    const mergedVariables = {
      ...templateDef.placeholders,
      ...variables,
      organization: resolvedOrg,
    }

    // Pre-flight validation against template schema
    if (templateDef.schema) {
      const validationResult = templateDef.schema.safeParse(mergedVariables)
      if (!validationResult.success) {
        return handleApiError(validationResult.error, 'preview.post/schema')
      }
    }

    const compiledProps = await templateDef.transformPayload(mergedVariables)
    const pdfBuffer = await renderToBuffer(h(templateDef.component, compiledProps))

    const pdfBase64 = Buffer.isBuffer(pdfBuffer) ? pdfBuffer.toString('base64') : Buffer.from(pdfBuffer).toString('base64')

    return { pdfBase64 }
  } catch (error: any) {
    return handleApiError(error, 'preview.post')
  }
})
