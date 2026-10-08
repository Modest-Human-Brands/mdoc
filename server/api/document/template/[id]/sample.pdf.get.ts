// server/api/document/template/[id]/sample.pdf.get.ts
import { defineEventHandler, getQuery, getRouterParam, HTTPError } from 'nitro/h3'

import { templateRegistry } from '~/server/utils/template-registry'
import { handleApiError } from '~/server/utils/api-error'
import { buildVariantVariables, renderTemplatePdf } from '~/server/utils/render-template'

import '~/templates/document'

/** `?variant=sample` (default, neutral + tokens) or `?variant=branded` (default organisation + tokens). */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const templateDef = id ? templateRegistry[id] : undefined
    if (!templateDef) {
      throw new HTTPError({ statusCode: 404, statusMessage: 'Template not found' })
    }

    const requested = String(getQuery(event).variant || 'sample')
    const variant = requested === 'branded' ? 'branded' : 'sample'
    const pdf = await renderTemplatePdf(templateDef, buildVariantVariables(templateDef, variant).variables)

    event.res.headers.set('Content-Type', 'application/pdf')
    event.res.headers.set('Content-Disposition', `inline; filename="${templateDef.id}-${variant}.pdf"`)
    event.res.headers.set('Cache-Control', 'public, max-age=3600')

    return pdf
  } catch (error: unknown) {
    return handleApiError(error, 'template/[id]/sample.pdf.get')
  }
})
