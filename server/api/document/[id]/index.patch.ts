import { defineEventHandler, getRouterParam, readBody, HTTPError } from 'nitro/h3'
import { z } from 'zod'
import notion from '~/server/utils/notion'

const updateSchema = z.object({
  name: z.string().optional(),
  status: z.enum(['Plan', 'Draft', 'Ready', 'Delivered']).optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw new HTTPError({ statusCode: 400, statusMessage: 'Document ID is required' })
    }

    const body = await readBody(event)
    const parsedBody = updateSchema.parse(body)

    const document = (await notion.pages.retrieve({ page_id: id })) as any
    const currentStatus = document.properties.Status?.status?.name

    if (currentStatus !== 'DRAFT' && !parsedBody.status) {
      throw new HTTPError({
        statusCode: 403,
        statusMessage: `Document is locked. Cannot modify a document with status: ${currentStatus}`,
      })
    }

    const properties: Record<string, any> = {}

    if (parsedBody.name) {
      properties['Name'] = {
        title: [{ text: { content: parsedBody.name } }],
      }
    }

    if (parsedBody.status) {
      properties['Status'] = {
        status: { name: parsedBody.status },
      }
    }

    if (Object.keys(properties).length === 0) {
      return { success: true, message: 'No changes provided' }
    }

    const updatedPage = await notion.pages.update({
      page_id: id,
      properties,
    })

    return {
      success: true,
      message: 'Document updated successfully',
      id: updatedPage.id,
    }
  } catch (error: any) {
    console.error(`API /document/${getRouterParam(event, 'id')} PATCH`, error)

    if (error.code === 'object_not_found' || error.status === 404 || error.code === 'validation_error') {
      throw new HTTPError({ statusCode: 404, statusMessage: 'Document not found' })
    }

    if (error instanceof z.ZodError) {
      throw new HTTPError({ statusCode: 400, statusMessage: 'Invalid update payload' })
    }

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({ statusCode: 500, statusMessage: 'Failed to update document' })
  }
})
