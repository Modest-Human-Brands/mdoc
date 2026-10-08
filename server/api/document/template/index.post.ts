// server/api/document/template/index.post.ts
import { h, type Component } from 'vue'
import { renderToFile } from '@ceereals/vue-pdf'
import { defineEventHandler, HTTPError, readBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'
import { z } from 'zod'

import notion from '~/server/utils/notion'
import { templateRegistry } from '~/server/utils/template-registry'
import generatePdfThumbnail from '~/server/utils/generate-pdf-thumbnail'
import { resolveOrganization } from '~/server/utils/organization-store'
import { handleApiError } from '~/server/utils/api-error'
import type { NotionDB } from '~/server/types'

import '~/templates/document'

const createDocSchema = z
  .object({
    name: z.string().min(1, 'name is required'),
    template: z.string().min(1, 'template identifier is required').optional(),
    templateId: z.string().min(1).optional(), // alias of `template`, matches the preview payload
    contactId: z.string().min(1, 'contactId is required'),
    userId: z.string().min(1, 'userId is required'),
    orgId: z.string().optional(),
    organizationId: z.string().optional(),
    projectId: z.string().optional(),
    data: z.record(z.string(), z.any()).default({}),
    variables: z.record(z.string(), z.any()).optional(), // alias of `data`, matches the preview payload
  })
  .refine((body) => body.template || body.templateId, { message: 'template identifier is required', path: ['template'] })

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const notionDbId = config.private.notionDbId ? (JSON.parse(config.private.notionDbId) as NotionDB) : ({ document: 'mock-doc-db' } as NotionDB)
    const fsStorage = useStorage('fs')

    const body = await readBody(event)
    const parsed = createDocSchema.parse(body)

    const { name: fileName, template, templateId: templateIdAlias, data, variables, orgId, organizationId, projectId, contactId, userId } = parsed

    const templateId = (template || templateIdAlias)!
    const rawData = { ...data, ...variables }

    const targetTemplate = templateRegistry[templateId]
    if (!targetTemplate) {
      throw new HTTPError({
        statusCode: 400,
        statusMessage: `Template target identifier "${templateId}" is unrecognized.`,
      })
    }

    // Resolve organization from preset or template placeholder
    const effectiveOrgId = organizationId || orgId || rawData.organizationId || rawData.organization
    const resolvedOrg = resolveOrganization(effectiveOrgId, targetTemplate.placeholders?.organization)

    const enrichedData = {
      ...targetTemplate.placeholders,
      ...rawData,
      organization: resolvedOrg,
    }

    // Validate payload against template schema
    if (targetTemplate.schema) {
      const validationResult = targetTemplate.schema.safeParse(enrichedData)
      if (!validationResult.success) {
        return handleApiError(validationResult.error, 'document/template/index.post/schema')
      }
    }

    const outputPath = `./static/${fileName}.pdf`
    const transformedPayload = await targetTemplate.transformPayload(enrichedData)

    await renderToFile(h(targetTemplate.component as Component, transformedPayload), outputPath)

    const file = await fsStorage.getItemRaw<Buffer>(`${fileName}.pdf`)
    if (!file) {
      throw new Error('Generated PDF file could not be persisted.')
    }

    const pngBuffer = await generatePdfThumbnail(file)
    await fsStorage.setItemRaw(`${fileName}.png`, pngBuffer)

    const notionProperties: any = {
      Name: { title: [{ text: { content: fileName } }] },
      'Template ID': { select: { name: templateId } },
      'Mime Type': { select: { name: 'application/pdf' } },
      SizeBytes: { number: file?.byteLength || 0 },
      Status: { status: { name: 'Draft' } },
      Contact: { relation: [{ id: contactId }] },
      User: { relation: [{ id: userId }] },
    }

    if (orgId || organizationId) {
      notionProperties.Organization = { relation: [{ id: orgId || organizationId }] }
    }

    if (projectId) {
      notionProperties.Project = { relation: [{ id: projectId }] }
    }

    const rawDataString = JSON.stringify(enrichedData)
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
    return handleApiError(error, 'document/template/index.post')
  }
})
