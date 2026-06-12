import { defineEventHandler, getValidatedQuery, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'

import notion from '~/server/utils/notion'
import notionQueryDb from '~/server/utils/notion-query-db'
import type { NotionDB, NotionDocument } from '~/server/types'
import notionTextStringify from '~/server/utils/notion-text-stringify'

const queryParamsSchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const query = await getValidatedQuery(event, queryParamsSchema)

    const limit = query.limit ? Number(query.limit) : 50
    const offset = query.offset ? Number(query.offset) : 0

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

    const documents = await notionQueryDb<NotionDocument>(notion, notionDbId.document)

    const total = documents.length
    const paginatedContent = documents.slice(offset, offset + limit)

    const results = paginatedContent.map(({ id, properties, created_time, last_edited_time }) => {
      const name = notionTextStringify(properties.Name.title)
      return {
        id,
        templateId: properties['Template ID'].select.name,
        name,
        mimeType: properties['Mime Type'].select.name,
        sizeBytes: properties.SizeBytes.number,
        status: properties.Status.status.name,
        organizationId: properties.Organization?.relation?.[0]?.id || null,
        projectId: properties.Project?.relation?.[0]?.id || null,
        categories: properties.Category?.multi_select?.map((c) => c.name) || [],
        previewUrl: `/api/document/${name}/content`,
        createdAt: created_time,
        updatedAt: last_edited_time,
      }
    })

    return {
      results,
      pagination: {
        total,
        limit,
        offset,
      },
    }
  } catch (error: any) {
    console.error('API /document GET', error)

    const { code: errorCode } = error as { code?: string }

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
