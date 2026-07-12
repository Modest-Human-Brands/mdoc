import { h, type Component } from 'vue'
import { renderToFile } from '@ceereals/vue-pdf'
import { defineEventHandler, HTTPError, readBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'

import notion from '~/server/utils/notion'
import { templateRegistry } from '~/server/utils/template-registry'
import generatePdfThumbnail from '~/server/utils/generate-pdf-thumbnail'
import type { NotionDB } from '~/server/types'
import type { RequestBody } from '~/server/types/templates'

import '~/templates/document'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB
    const fsStorage = useStorage('fs')

    const { name: fileName, template: templateId, data: rawData, orgId, projectId, contactId } = (await readBody<RequestBody & { projectId?: string; contactId?: string; orgId?: string }>(event))!

    const targetTemplate = templateRegistry[templateId]
    if (!targetTemplate) {
      throw new HTTPError({
        statusCode: 400,
        statusMessage: `Template target identifier "${templateId}" is unrecognized.`,
      })
    }

    const outputPath = `./static/${fileName}.pdf`

    await renderToFile(h(targetTemplate.component as Component, await targetTemplate.transformPayload(rawData)), outputPath)

    const file = await fsStorage.getItemRaw<Buffer>(`${fileName}.pdf`)
    if (!file) {
      throw new Error('Generated PDF could not be found.')
    }

    const pngBuffer = await generatePdfThumbnail(file)

    await fsStorage.setItemRaw(`${fileName}.png`, pngBuffer)

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

    const rawDataString = JSON.stringify(rawData)
    const chunks = rawDataString.match(/[\s\S]{1,2000}/g) || []

    const childrenBlocks: any[] = []
    for (let i = 0; i < chunks.length; i += 100) {
      childrenBlocks.push({
        object: 'block',
        type: 'code',
        code: {
          language: 'json',
          rich_text: chunks.slice(i, i + 100).map((chunk) => ({ text: { content: chunk } })),
        },
      })
    }

    const record = await notion.pages.create({
      parent: { data_source_id: notionDbId.document },
      properties: notionProperties,
      children: childrenBlocks,
    })

    return {
      id: record.id,
      templateId,
      name: fileName,
      sizeBytes: file?.byteLength || 0,
    }
  } catch (error: unknown) {
    console.error('API /document/template/index POST', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
