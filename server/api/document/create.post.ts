import { h, type Component } from 'vue'
import { renderToFile } from '@ceereals/vue-pdf'
import { defineEventHandler, HTTPError, readBody } from 'nitro/h3'
import { templateRegistry } from '~/server/utils/template-registry'
import { TEMPLATES, type RequestBody } from '~/server/types/templates'

import '~/templates/document'

export default defineEventHandler(async (event) => {
  try {
    const { data: rawData, template: templateId } = (await readBody<RequestBody>(event))!

    if (!(TEMPLATES as readonly string[]).includes(templateId)) {
      throw new HTTPError({
        statusCode: 400,
        statusMessage: `Unknown template "${templateId}"`,
      })
    }

    const targetTemplate = templateRegistry[templateId]
    if (!targetTemplate) {
      throw new HTTPError({
        statusCode: 400,
        statusMessage: `Template target identifier "${templateId}" is unrecognized by renderer engine.`,
      })
    }

    const finalizedInputProps = targetTemplate.transformPayload(rawData)

    const outFileName = `${templateId}_${Date.now()}.pdf`
    const outputPath = `./static/${outFileName}`

    await renderToFile(h(targetTemplate.component as Component, finalizedInputProps), outputPath)

    return {
      success: true,
      message: 'Document cleanly rendered and stored using registry configurations.',
      fileName: outFileName,
      path: outputPath,
    }
  } catch (error: unknown) {
    console.error('Document Generation Pipeline Failure:', error)
    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to process document template pipeline calculations.',
    })
  }
})
