import { defineEventHandler, getRouterParam, HTTPError, readBody } from 'nitro/h3'
import { z } from 'zod'

import type { NotionDocument } from '~/server/types'
import notion from '~/server/utils/notion'
import normalizeId from '~/server/utils/notion-normalize-id'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import { NOTION_ID, toRelationFieldError } from '~/server/utils/notion-errors'
import { assertDocumentAccess, type AuthContext } from '~/server/utils/document-access'
import { contentRevision, readDataBlockIds, readDocumentData, writeDocumentData } from '~/server/utils/document-data'
import { moveToIdLayout, storageBaseOf } from '~/server/utils/document-file'
import { readDocument, removeDocument, writeDocument } from '~/server/utils/documents'
import { comparableName, withUniqueName } from '~/server/utils/document-names'
import { documentViewUrl } from '~/server/utils/document-link'
import { loadOrganization } from '~/server/utils/organization-notion'
import { withDocumentLock } from '~/server/utils/routing-queue'
import { toRouteError } from '~/server/utils/route-error'
import { applyTermSelection, orgOf } from '~/server/utils/terms-store'
import { templateRegistry } from '~/server/utils/template-registry'
import { mergeTemplateVariables, renderTemplatePdf } from '~/server/utils/render-template'
import generatePdfThumbnail from '~/server/utils/generate-pdf-thumbnail'

import '~/templates/document'

const notionId = z.string().regex(NOTION_ID, 'must be a Notion page ID')

/** The same input as creating a document, minus the template and the owner, which never change. */
const editSchema = z.strictObject({
  revision: z.string().min(1, 'revision is required'),
  name: z.string().trim().min(1, 'name is required').max(200).optional(),
  data: z.record(z.string(), z.any()),
  contactId: notionId.optional(),
  /** `null` removes the project. */
  projectId: notionId.nullable().optional(),
})

const fail = (statusCode: number, statusMessage: string, field: string, message: string, code: string) => {
  const error = new HTTPError({ statusCode, statusMessage, data: { errors: [{ field, message, code }] } })
  error.stack = undefined
  return error
}

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw new HTTPError({ statusCode: 400, statusMessage: 'Document ID is required' })

    const raw = ((await readBody(event)) ?? {}) as Record<string, unknown>
    for (const field of ['template', 'templateId']) {
      if (field in raw) throw fail(400, 'Bad Request', field, 'The template of a document cannot be changed. Create a new document instead.', 'template_immutable')
    }
    const body = editSchema.parse(raw)
    const auth = event.context.auth as AuthContext

    // The same lock as sending, status changes, voiding and signing: the status cannot change under an edit.
    return await withDocumentLock(id, async () => {
      const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument
      assertDocumentAccess(event, document)

      const properties = document.properties as unknown as Record<string, any>
      const status = properties.Status?.status?.name
      if (status !== 'Draft') throw fail(403, 'Forbidden', 'status', `Only a Draft can be edited. This document is ${status}.`, 'not_draft')

      const templateId: string = properties['Template ID']?.select?.name
      const templateDef = templateRegistry[templateId]
      if (!templateDef) throw fail(409, 'Conflict', 'templateId', `Template "${templateId}" no longer exists.`, 'unknown_template')

      const stored = await readDocumentData(id)
      if (contentRevision(document, stored.data) !== body.revision) {
        throw fail(409, 'Conflict', 'revision', 'This document changed after you opened it. Reload and apply your changes again.', 'stale_revision')
      }

      const { pageId: organizationPageId, organization } = await loadOrganization(auth.orgId, auth.userId)
      const owner: string | undefined = properties.Organization?.relation?.[0]?.id
      // Rendering uses the caller's branding, so another organisation's document must never be re-rendered with it.
      if (owner && normalizeId(owner).toLowerCase() !== normalizeId(organizationPageId).toLowerCase()) {
        throw fail(403, 'Forbidden', 'x-org-id', 'This document belongs to another organisation.', 'forbidden')
      }

      const selection = await applyTermSelection(orgOf(event), templateDef, body.data)
      const data = { ...mergeTemplateVariables(templateDef, { ...selection, organization }), organization }
      const validation = templateDef.schema.safeParse(data)
      if (!validation.success) throw validation.error

      const oldName = notionTextStringify(properties.Name.title)
      const name = body.name ?? oldName

      const save = async () => {
        // Everything that can fail on bad input happens before anything stored is touched.
        const pdf = await renderTemplatePdf(templateDef, data, { documentUrl: documentViewUrl(id, event.url.origin) })
        const thumbnail = await generatePdfThumbnail(pdf)

        await moveToIdLayout(document)
        const base = storageBaseOf(document.id)
        const keys = [`${base}.png`, `${base}.pdf`]
        const previous = await Promise.all(keys.map((key) => readDocument(key)))

        try {
          await writeDocument(keys[0]!, thumbnail)
          await writeDocument(keys[1]!, pdf)
          await writeDocumentData(id, stored.blockIds, data)
          await notion.pages
            .update({
              page_id: id,
              properties: {
                Name: { title: [{ text: { content: name } }] },
                SizeBytes: { number: pdf.byteLength },
                Organization: { relation: [{ id: organizationPageId }] },
                ...(body.contactId && { Contact: { relation: [{ id: body.contactId }] } }),
                ...(body.projectId !== undefined && { Project: { relation: body.projectId ? [{ id: body.projectId }] : [] } }),
              },
            })
            .catch((error: unknown) => {
              throw toRelationFieldError(error, { contactId: body.contactId, projectId: body.projectId ?? undefined })
            })
        } catch (error) {
          // Put the previous version back, so the file and the form data never disagree.
          await Promise.allSettled([
            ...keys.map((key, index) => (previous[index] ? writeDocument(key, previous[index]!) : removeDocument(key))),
            ...(stored.data ? [readDataBlockIds(id).then((blockIds) => writeDocumentData(id, blockIds, stored.data))] : []),
          ])
          throw error
        }

        const saved = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument
        return { id: document.id, templateId, name, sizeBytes: pdf.byteLength, shareUrl: documentViewUrl(id, event.url.origin), revision: contentRevision(saved, (await readDocumentData(id)).data) }
      }

      return comparableName(name) === comparableName(oldName) ? await save() : await withUniqueName(name, save, document.id)
    })
  } catch (error: unknown) {
    return toRouteError(error, 'document/[id]/index PUT')
  }
})
