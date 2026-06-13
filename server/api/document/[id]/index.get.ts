import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'

import notion from '~/server/utils/notion'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import type { NotionDocument } from '~/server/types'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw new HTTPError({
        statusCode: 400,
        statusMessage: 'Document ID is required',
      })
    }

    const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument

    const { properties, created_time, last_edited_time } = document

    const name = notionTextStringify(properties.Name.title)

    return {
      id: document.id,
      templateId: properties['Template ID']?.select?.name,
      name,
      mimeType: properties['Mime Type']?.select?.name,
      sizeBytes: properties.SizeBytes?.number,
      status: properties.Status?.status?.name,
      organizationId: properties.Organization?.relation?.[0]?.id || null,
      projectId: properties.Project?.relation?.[0]?.id || null,
      categories: properties.Category?.multi_select?.map((c: any) => c.name) || [],
      previewUrl: `/api/document/${document.id}/content`,
      createdAt: created_time,
      updatedAt: last_edited_time,
    }
  } catch (error: any) {
    console.error(`API /document/[id] GET`, error)

    if (error.code === 'object_not_found' || error.status === 404 || error.code === 'validation_error') {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: 'Document not found',
      })
    }

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve document details',
    })
  }
})
