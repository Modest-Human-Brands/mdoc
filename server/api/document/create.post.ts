import { h, type Component } from 'vue'
import { renderToFile } from '@ceereals/vue-pdf'
import { defineEventHandler, HTTPError, readBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'

import notion from '~/server/utils/notion'
import type { NotionDB } from '~/server/types'
import { templateRegistry } from '~/server/utils/template-registry'
import { TEMPLATES, type RequestBody } from '~/server/types/templates'

import '~/templates/document'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB
    const fsStorage = useStorage('fs')

    const { name: fileName, template: templateId, data: rawData, orgId, projectId, contactId } = (await readBody<RequestBody & { projectId?: string; contactId?: string; orgId?: string }>(event))!

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

    await fsStorage.setItem(`${fileName}.json`, rawData)

    const notionProperties: any = {
      Name: { title: [{ text: { content: fileName } }] },
      'Template ID': { select: { name: templateId } },
      'Mime Type': { select: { name: 'application/pdf' } },
      SizeBytes: { number: file?.byteLength || 0 },
      Status: { status: { name: 'Draft' } },
    }

    if (orgId) {
      notionProperties.Organization = { relation: [{ id: orgId }] }
    }

    if (projectId) {
      notionProperties.Project = { relation: [{ id: projectId }] }
    }

    if (contactId) {
      notionProperties.Contact = { relation: [{ id: contactId }] }
    }

    const record = await notion.pages.create({
      parent: { data_source_id: notionDbId.document },
      properties: notionProperties,
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
