// server/api/document/numbering/next.get.ts
import { defineEventHandler, getValidatedQuery } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'

import notion from '~/server/utils/notion'
import notionQueryDb from '~/server/utils/notion-query-db'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import { resolveOrganization } from '~/server/utils/organization-store'
import { templateRegistry } from '~/server/utils/template-registry'
import { handleApiError } from '~/server/utils/api-error'
import type { NotionDB, NotionDocument } from '~/server/types'

import '~/templates/document'

const TYPE_LETTER: Record<string, string> = {
  invoice: 'I',
  quotation: 'Q',
  'retainer-contract': 'R',
  'shoot-contract': 'S',
  'internship-completion-certificate': 'C',
}

const querySchema = z.object({
  templateId: z.string().min(1, 'templateId is required'),
  orgId: z.string().optional(),
  organizationId: z.string().optional(),
  organizationName: z.string().optional(),
})

function orgCode(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase())
    .join('')
  return letters || 'DOC'
}

/**
 * Peek the next document number, e.g. `MHB-I-26-014` (org code - type - 2-digit year - sequence).
 * Nothing is reserved; creating the document is the source of truth.
 */
export default defineEventHandler(async (event) => {
  try {
    const query = await getValidatedQuery(event, querySchema)

    if (!templateRegistry[query.templateId]) {
      return handleApiError(Object.assign(new Error('Template not found'), { statusCode: 404, statusMessage: 'Template not found' }), 'numbering/next')
    }

    const orgName = query.organizationName || resolveOrganization(query.organizationId || query.orgId).name
    const prefix = `${orgCode(orgName)}-${TYPE_LETTER[query.templateId] ?? 'D'}-${String(new Date().getFullYear()).slice(-2)}`

    const config = useRuntimeConfig()
    const notionDbId = config.private.notionDbId ? (JSON.parse(config.private.notionDbId) as NotionDB) : ({ document: 'mock-doc-db' } as NotionDB)
    const documents = await notionQueryDb<NotionDocument>(notion, notionDbId.document)

    const pattern = new RegExp(`^${prefix}-([0-9]+)`)
    let max = 0
    for (const { properties } of documents) {
      if (properties['Template ID']?.select?.name !== query.templateId) continue
      const match = pattern.exec(notionTextStringify(properties.Name.title))
      if (match) max = Math.max(max, Number(match[1]))
    }

    const sequence = max + 1
    return { templateId: query.templateId, prefix, sequence, number: `${prefix}-${String(sequence).padStart(3, '0')}` }
  } catch (error: unknown) {
    return handleApiError(error, 'numbering/next')
  }
})
