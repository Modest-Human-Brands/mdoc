import { defineEventHandler, getQuery, getRouterParam, HTTPError } from 'nitro/h3'

import { templateRegistry } from '~/server/utils/template-registry'
import { buildVariantVariables, renderTemplatePdf } from '~/server/utils/render-template'

import '~/templates/document'

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
    if (error instanceof Error && 'statusCode' in error) {
      error.stack = undefined
      throw error
    }

    console.error('template/[id]/sample.pdf.get', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    serverError.stack = undefined
    throw serverError
  }
})
