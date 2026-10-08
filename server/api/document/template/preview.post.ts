// server/api/document/template/preview.post.ts
import { defineEventHandler, getQuery, readBody, HTTPError } from 'nitro/h3'
import { z } from 'zod'

import { templateRegistry } from '~/server/utils/template-registry'
import { handleApiError } from '~/server/utils/api-error'
import { applyDraftFallbacks, countPdfPages, mergeTemplateVariables, renderTemplatePdf } from '~/server/utils/render-template'

import '~/templates/document'

const previewRequestSchema = z.object({
  templateId: z.string().min(1, 'templateId is required'),
  variables: z.record(z.string(), z.any()).default({}),
})

export default defineEventHandler(async (event) => {
  try {
    const rawBody = await readBody(event)
    const { templateId, variables } = previewRequestSchema.parse(rawBody)
    const draft = ['1', 'true'].includes(String(getQuery(event).draft))

    const templateDef = templateRegistry[templateId]
    if (!templateDef) {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: `Template '${templateId}' not found.`,
      })
    }

    let mergedVariables: Record<string, any> = mergeTemplateVariables(templateDef, variables)
    let warnings: { field: string; message: string; code: string }[] = []

    if (draft) {
      // Live typing: never reject; invalid fields fall back to placeholders and are reported as warnings
      ;({ variables: mergedVariables, warnings } = applyDraftFallbacks(templateDef, mergedVariables))
    } else if (templateDef.schema) {
      const validationResult = templateDef.schema.safeParse(mergedVariables)
      if (!validationResult.success) {
        return handleApiError(validationResult.error, 'preview.post/schema')
      }
    }

    const pdfBuffer = await renderTemplatePdf(templateDef, mergedVariables)

    return {
      pdfBase64: pdfBuffer.toString('base64'),
      pageCount: countPdfPages(pdfBuffer),
      ...(draft ? { warnings } : {}),
    }
  } catch (error: any) {
    return handleApiError(error, 'preview.post')
  }
})
