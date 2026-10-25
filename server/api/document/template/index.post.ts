import { defineEventHandler, getHeader, HTTPError, readBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z, ZodError } from 'zod'

import notion from '~/server/utils/notion'
import { templateRegistry } from '~/server/utils/template-registry'
import generatePdfThumbnail from '~/server/utils/generate-pdf-thumbnail'
import { organizationFrom } from '~/server/utils/organization-store'
import { NOTION_ID, toRelationFieldError } from '~/server/utils/notion-errors'
import { mergeTemplateVariables, renderTemplatePdf } from '~/server/utils/render-template'
import type { NotionDB } from '~/server/types'

import '~/templates/document'
import { writeDocument } from '~/server/utils/documents'

const notionId = z.string().regex(NOTION_ID, 'must be a Notion page ID')

const createDocSchema = z
  .object({
    name: z.string().min(1, 'name is required'),
    template: z.string().min(1).optional(),
    templateId: z.string().min(1).optional(),
    contactId: notionId,
    userId: notionId,
    organizationId: z.string().optional(),
    projectId: notionId.optional(),
    data: z.record(z.string(), z.any()).default({}),
    variables: z.record(z.string(), z.any()).optional(),
  })
  .refine((body) => body.template || body.templateId, { message: 'template identifier is required', path: ['template'] })

const toJsonBlocks = (value: unknown) => {
  const chunks = JSON.stringify(value).match(/[\s\S]{1,2000}/g) ?? []
  return Array.from({ length: Math.ceil(chunks.length / 100) }, (_, index) => ({
    object: 'block' as const,
    type: 'code' as const,
    code: { language: 'json' as const, rich_text: chunks.slice(index * 100, index * 100 + 100).map((chunk) => ({ text: { content: chunk } })) },
  }))
}

export default defineEventHandler(async (event) => {
  try {
    const body = createDocSchema.parse(await readBody(event))
    const { name: fileName, contactId, userId, projectId } = body
    const templateId = (body.template || body.templateId)!
    const rawData = { ...body.data, ...body.variables }

    const templateDef = templateRegistry[templateId]
    if (!templateDef) {
      throw new HTTPError({ statusCode: 400, statusMessage: `Template target identifier "${templateId}" is unrecognized.` })
    }

    const organizationSlug = getHeader(event, 'x-org-id')?.trim() || body.organizationId
    const organizationRelationId = body.organizationId && NOTION_ID.test(body.organizationId) ? body.organizationId : undefined
    const enrichedData = {
      ...mergeTemplateVariables(templateDef, rawData),
      organization: organizationFrom({ ...rawData, organizationId: organizationSlug }, templateDef.placeholders.organization),
    }

    const validation = templateDef.schema.safeParse(enrichedData)
    if (!validation.success) throw validation.error

    const pdf = await renderTemplatePdf(templateDef, enrichedData)
    await writeDocument(`${fileName}.pdf`, pdf)
    await writeDocument(`${fileName}.png`, await generatePdfThumbnail(pdf))

    const config = useRuntimeConfig()
    const notionDbId = config.private.notionDbId ? (JSON.parse(config.private.notionDbId) as NotionDB) : ({ document: 'mock-doc-db' } as NotionDB)

    const record = await notion.pages
      .create({
        parent: { data_source_id: notionDbId.document },
        properties: {
          Name: { title: [{ text: { content: fileName } }] },
          'Template ID': { select: { name: templateId } },
          'Mime Type': { select: { name: 'application/pdf' } },
          SizeBytes: { number: pdf.byteLength },
          Status: { status: { name: 'Draft' } },
          Contact: { relation: [{ id: contactId }] },
          User: { relation: [{ id: userId }] },
          ...(organizationRelationId && { Organization: { relation: [{ id: organizationRelationId }] } }),
          ...(projectId && { Project: { relation: [{ id: projectId }] } }),
        },
        children: toJsonBlocks(enrichedData),
      })
      .catch((error: unknown) => {
        throw toRelationFieldError(error, { contactId, userId, organizationId: organizationRelationId, projectId })
      })

    return { id: record.id, templateId, name: fileName, sizeBytes: pdf.byteLength }
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const validationError = new HTTPError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { errors: error.issues.map(({ path, message, code }) => ({ field: path.join('.'), message, code })) },
      })
      validationError.stack = undefined
      throw validationError
    }
    if (error instanceof Error && 'statusCode' in error) {
      error.stack = undefined
      throw error
    }

    console.error('document/template/index.post', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    serverError.stack = undefined
    throw serverError
  }
})
