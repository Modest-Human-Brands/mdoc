import { defineEventHandler, HTTPError, readBody } from 'nitro/h3'
import { h } from 'vue'
import { renderToBuffer } from '@ceereals/vue-pdf'

import { templateRegistry } from '~/server/utils/template-registry'

import '~/templates/document'

export default defineEventHandler(async (event) => {
  try {
    const { templateId, variables } = await readBody<{ templateId: string; variables: Record<string, any> }>(event)

    if (!templateId) {
      event.res.status = 400
      event.res.statusText = 'Missing templateId in request body.'
      return { error: 'Missing templateId in request body.' }
    }

    const templateDef = templateRegistry[templateId]
    if (!templateDef) {
      event.res.status = 404
      event.res.statusText = `Template '${templateId}' not found.`
      return { error: `Template '${templateId}' not found.` }
    }

    const pdfBuffer = await renderToBuffer(h(templateDef.component, await templateDef.transformPayload(variables || {})))

    const pdfBase64 = Buffer.isBuffer(pdfBuffer) ? pdfBuffer.toString('base64') : Buffer.from(pdfBuffer).toString('base64')

    return { pdfBase64 }
  } catch (error: any) {
    console.error('API /document/template/preview POST', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
