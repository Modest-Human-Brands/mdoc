import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'

import notion from '~/server/utils/notion'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import type { NotionDocument, NotionProject, NotionContact, NotionUser } from '~/server/types'
import { useRuntimeConfig } from 'nitro/runtime-config'

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
    const config = useRuntimeConfig()

    const { id: docId, properties, created_time, last_edited_time } = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument

    const name = notionTextStringify(properties.Name.title)
    const projectId = properties.Project?.relation?.[0]?.id || null
    let projectData = null

    if (projectId) {
      try {
        const project = (await notion.pages.retrieve({ page_id: projectId })) as unknown as NotionProject
        projectData = {
          id: project.id,
          slug: project.properties.Slug.formula.string,
          name: notionTextStringify(project.properties.Name.title),
        }
      } catch (error) {
        console.error(`Failed to fetch project for document ${id}`, error)
      }
    }

    // Contact list is sourced from the document's Contact relation, which aggregates the
    // contacts linked through the project relation.
    const contact: { id: string; name: string; email: string | null }[] = []
    if (properties.Contact?.relation) {
      for (const relation of properties.Contact.relation) {
        try {
          const contactPage = (await notion.pages.retrieve({ page_id: relation.id })) as unknown as NotionContact
          contact.push({
            id: contactPage.id,
            name: notionTextStringify(contactPage.properties.Name.title),
            email: contactPage.properties.Email?.email || null,
          })
        } catch (error) {
          console.error(`Failed to fetch contact for document ${id}`, error)
        }
      }
    }

    // User is sourced from the document's User relation (renamed from "Created by").
    let user = null
    if (properties.User?.relation) {
      try {
        const userPage = (await notion.pages.retrieve({ page_id: properties.User.relation[0].id })) as unknown as NotionUser
        user = {
          id: userPage.id,
          name: notionTextStringify(userPage.properties.Name.title),
          email: userPage.properties.Email?.email || null,
        }
      } catch (error) {
        console.error(`Failed to fetch user for document ${id}`, error)
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

    // Fetch rawData from Notion children blocks (code blocks with JSON)
    let rawData = null
    try {
      const children = await notion.blocks.children.list({ block_id: id, page_size: 100 })
      let jsonChunk = null
      for (const child of children.results || []) {
        // Use type assertion to bypass missing type guards in @notionhq/client
        if ((child as any).type === 'code' && (child as any).code?.rich_text) {
          jsonChunk = notionTextStringify((child as any).code.rich_text)
          break
        }
      }
      if (jsonChunk) {
        rawData = JSON.parse(jsonChunk)
      }
    } catch {
      // Silently fail if children blocks don't exist or parsing fails
    }

    return {
      id: docId,
      templateId: properties['Template ID']?.select?.name,
      name,
      mimeType: properties['Mime Type']?.select?.name,
      sizeBytes: properties.SizeBytes?.number,
      status: properties.Status?.status?.name,
      organizationId: properties.Organization?.relation?.[0]?.id || null,
      project: projectData,
      contact,
      user,
      routingType: properties['Routing Type']?.select?.name || null,
      nextSigner: properties['Next Signer']?.email || null,
      routingQueue,
      categories: properties.Category?.multi_select?.map((c: any) => c.name) || [],
      previewUrl: `${config.public.docUrl}/api/document/${docId}/content`,
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
