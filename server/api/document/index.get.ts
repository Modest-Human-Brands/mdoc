import { defineEventHandler, getValidatedQuery, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'

import notion from '~/server/utils/notion'
import notionQueryDb from '~/server/utils/notion-query-db'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import type { NotionContact, NotionDB, NotionDocument, NotionProject } from '~/server/types'

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

    const results = await Promise.all(
      paginatedContent.map(async ({ id, properties, created_time, last_edited_time }) => {
        const name = notionTextStringify(properties.Name.title)

        let projectDetails = { id: null as string | null, name: 'Misc', slug: 'misc', status: 'N/A' }
        let contactDetails = null

        const projectId = properties.Project?.relation?.[0]?.id

        if (projectId) {
          const project = (await notion.pages.retrieve({ page_id: projectId })) as unknown as NotionProject
          const contactId = project.properties.Contact.relation[0].id
          projectDetails = {
            id: projectId,
            slug: project.properties.Slug?.formula?.string || '',
            name: notionTextStringify(project.properties.Name.title),
            status: project.properties.Status?.status?.name || 'N/A',
          }

          if (contactId) {
            const contact = (await notion.pages.retrieve({ page_id: contactId })) as unknown as NotionContact
            contactDetails = {
              index: contact.properties.Index?.number || null,
              name: notionTextStringify(contact.properties.Name.title),
              avatar: contact.icon?.type === 'external' ? contact.icon.external.url : undefined,
            }
          }
        }

        return {
          id,
          templateId: properties['Template ID']?.select?.name,
          name,
          mimeType: properties['Mime Type']?.select?.name,
          sizeBytes: properties.SizeBytes?.number,
          status: properties.Status?.status?.name,
          contact: contactDetails,
          project: projectDetails,
          organizationId: properties.Organization?.relation?.[0]?.id || null,
          previewUrl: `${config.public.docUrl}/api/document/${id}/content`,
          createdAt: created_time,
          updatedAt: last_edited_time,
        }
      })
    )

    return {
      results,
      pagination: {
        total,
        limit,
        offset,
      },
    }
  } catch (error: any) {
    console.error('API /document/index GET', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
