import { defineEventHandler, getQuery, readBody, HTTPError } from 'nitro/h3'
import { z, ZodError } from 'zod'

import { templateRegistry } from '~/server/utils/template-registry'
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
      ;({ variables: renderVariables, warnings } = buildVariantVariables(templateDef, variant, variables))
    } else {
      renderVariables = mergeTemplateVariables(templateDef, variables)
      if (templateDef.schema) {
        const validationResult = templateDef.schema.safeParse(renderVariables)
        if (!validationResult.success) {
          throw validationResult.error
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
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const validationError = new HTTPError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { errors: error.issues.map(({ path, message, code }) => ({ field: path.join('.'), message, code })) },
      })
      validationError.stack = undefined
      throw validationError
    }
    if (error instanceof Error && 'statusCode' in error) {
      error.stack = undefined
      throw error
    }

    console.error('preview.post', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    serverError.stack = undefined
    throw serverError
  }
})
