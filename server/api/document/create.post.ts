import { h, type Component } from 'vue'
import { renderToFile } from '@ceereals/vue-pdf'
import { defineEventHandler, HTTPError, readBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

import notion from '~/server/utils/notion'
import type { NotionDB } from '~/server/types'
import { templateRegistry } from '~/server/utils/template-registry'
import { TEMPLATES, type RequestBody } from '~/server/types/templates'

import '~/templates/document'
import { useStorage } from 'nitro/storage'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB
    const fsStorage = useStorage('fs')

    const { data: rawData, template: templateId, name: fileName, orgId } = (await readBody<RequestBody>(event))!

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

    const outputPath = `./static/${fileName}.pdf`

    await renderToFile(h(targetTemplate.component as Component, finalizedInputProps), outputPath)

    const file = await fsStorage.getItemRaw<Buffer<ArrayBufferLike>>(`${fileName}.pdf`)

    const record = await notion.pages.create({
      parent: { data_source_id: notionDbId.document },
      properties: {
        Name: { title: [{ text: { content: fileName } }] },
        'Template ID': { select: { name: templateId } },
        'Mime Type': { select: { name: 'application/pdf' } },
        SizeBytes: { number: file?.byteLength || 0 },
        Status: { status: { name: 'Draft' } },
      },
    })

    return {
      id: record.id,
      templateId,
      name: fileName,
      sizeBytes: file?.byteLength || 0,
    }
  } catch (error: unknown) {
    console.error('Document Generation Pipeline Failure:', error)
    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to process document template pipeline calculations.',
    })
  }
})
