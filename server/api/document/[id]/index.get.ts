import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'

import notion from '~/server/utils/notion'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import type { NotionDocument, NotionProject, NotionContact } from '~/server/types'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw new HTTPError({
        statusCode: 400,
        statusMessage: 'Document ID is required',
      })
    }
    const fsStorage = useStorage('fs')

    const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument

    const { properties, created_time, last_edited_time } = document

    const name = notionTextStringify(properties.Name.title)
    const projectId = properties.Project?.relation?.[0]?.id || null
    let projectData = null

    if (projectId) {
      try {
        const project = (await notion.pages.retrieve({ page_id: projectId })) as unknown as NotionProject
        let contactData = null
        const contactId = project.properties.Contact?.relation?.[0]?.id

        if (contactId) {
          const contact = (await notion.pages.retrieve({ page_id: contactId })) as unknown as NotionContact
          contactData = {
            id: contact.id,
            name: notionTextStringify(contact.properties.Name.title),
            email: contact.properties.Email?.email || null,
          }
        }

        projectData = {
          id: project.id,
          slug: project.properties.Slug.formula.string,
          name: notionTextStringify(project.properties.Name.title),
          contact: contactData,
        }
      } catch (error) {
        console.error(`Failed to fetch nested project/contact for document ${id}`, error)
      }
    }

    const routingQueueRaw = notionTextStringify(properties['Routing Queue']?.rich_text)
    let routingQueue = []
    if (routingQueueRaw) {
      try {
        routingQueue = JSON.parse(routingQueueRaw)
      } catch {
        //
      }
    }

    let rawData = null
    try {
      rawData = await fsStorage.getItem(`${name}.json`)
    } catch {
      // Silently fail if JSON doesn't exist (e.g. for older documents)
    }

    return {
      id: document.id,
      templateId: properties['Template ID']?.select?.name,
      name,
      mimeType: properties['Mime Type']?.select?.name,
      sizeBytes: properties.SizeBytes?.number,
      status: properties.Status?.status?.name,
      organizationId: properties.Organization?.relation?.[0]?.id || null,
      project: projectData,
      routingType: properties['Routing Type']?.select?.name || null,
      nextSigner: properties['Next Signer']?.email || null,
      routingQueue,
      categories: properties.Category?.multi_select?.map((c: any) => c.name) || [],
      previewUrl: `/api/document/${document.id}/content`,
      createdAt: created_time,
      updatedAt: last_edited_time,
      rawData,
    }
  } catch (error: any) {
    console.error(`API /document/[id]/index GET`, error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
