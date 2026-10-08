// server/api/document/template/preview.post.ts
import { defineEventHandler, getQuery, readBody, HTTPError } from 'nitro/h3'
import { z } from 'zod'

import { templateRegistry } from '~/server/utils/template-registry'
import { handleApiError } from '~/server/utils/api-error'
import { buildVariantVariables, countPdfPages, mergeTemplateVariables, renderTemplatePdf } from '~/server/utils/render-template'

import '~/templates/document'

const previewRequestSchema = z.object({
  templateId: z.string().min(1, 'templateId is required'),
  variant: z.enum(['sample', 'branded', 'filled']).default('filled'),
  variables: z.record(z.string(), z.any()).default({}),
})

export default defineEventHandler(async (event) => {
  try {
    const rawBody = await readBody(event)
    const { templateId, variant, variables } = previewRequestSchema.parse(rawBody)
    const draft = ['1', 'true'].includes(String(getQuery(event).draft))

    const templateDef = templateRegistry[templateId]
    if (!templateDef) {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: `Template '${templateId}' not found.`,
      })
    }

    let renderVariables: Record<string, any>
    let warnings: { field: string; message: string; code: string }[] = []

    if (variant !== 'filled' || draft) {
      // Sample / branded / live typing: never rejects; unfilled fields show their `{{Field Label}}` token
      ;({ variables: renderVariables, warnings } = buildVariantVariables(templateDef, variant, variables))
    } else {
      // Strict (final review): placeholders backfill missing fields and invalid input is a 400
      renderVariables = mergeTemplateVariables(templateDef, variables)
      if (templateDef.schema) {
        const validationResult = templateDef.schema.safeParse(renderVariables)
        if (!validationResult.success) {
          return handleApiError(validationResult.error, 'preview.post/schema')
        }
      }
    }

    const pdfBuffer = await renderTemplatePdf(templateDef, renderVariables)

    return {
      pdfBase64: pdfBuffer.toString('base64'),
      pageCount: countPdfPages(pdfBuffer),
      variant,
      ...(draft || variant !== 'filled' ? { warnings } : {}),
    }
  } catch (error: any) {
    return handleApiError(error, 'preview.post')
  }
})
