// server/api/document/template/[id]/sample.pdf.get.ts
import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'

import { templateRegistry } from '~/server/utils/template-registry'
import { handleApiError } from '~/server/utils/api-error'
import { mergeTemplateVariables, renderTemplatePdf } from '~/server/utils/render-template'

import '~/templates/document'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const templateDef = id ? templateRegistry[id] : undefined

    if (!templateDef) {
      throw new HTTPError({ statusCode: 404, statusMessage: 'Template not found' })
    }

    const pdf = await renderTemplatePdf(templateDef, mergeTemplateVariables(templateDef))

    event.res.headers.set('Content-Type', 'application/pdf')
    event.res.headers.set('Content-Disposition', `inline; filename="${templateDef.id}-sample.pdf"`)
    event.res.headers.set('Cache-Control', 'public, max-age=3600')

    return pdf
  } catch (error: unknown) {
    return handleApiError(error, 'template/[id]/sample.pdf.get')
  }
})
