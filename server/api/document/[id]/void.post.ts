import { defineEventHandler, getRouterParam, HTTPError, readBody } from 'nitro/h3'
import { z } from 'zod'

import notion from '~/server/utils/notion'
import type { NotionDocument } from '~/server/types'
import { assertDocumentAccess } from '~/server/utils/document-access'
import { documentFiles } from '~/server/utils/document-file'
import { readDocument, removeDocument, writeDocument } from '~/server/utils/documents'
import { readQueue, toRichText, withDocumentLock } from '~/server/utils/routing-queue'
import { toRouteError } from '~/server/utils/route-error'
import { stampVoid } from '~/server/utils/void-stamp'
import generatePdfThumbnail from '~/server/utils/generate-pdf-thumbnail'

const voidSchema = z.object({
  reason: z.string().trim().min(5, 'A reason must be provided to void the document.').max(500),
})

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw new HTTPError({ statusCode: 400, statusMessage: 'Document ID is required' })

    const { reason } = voidSchema.parse(await readBody(event))

    // The same lock as signing: a signature cannot complete between reading the state and saving it as void.
    return await withDocumentLock(id, async () => {
      const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument

      assertDocumentAccess(event, document)
      const currentStatus = document.properties.Status.status.name
      if (['Completed', 'Void'].includes(currentStatus)) {
        throw new HTTPError({ statusCode: 403, statusMessage: `Cannot void a document that is already ${currentStatus}.` })
      }

      // A draft has no signer queue yet and can still be voided.
      const signers = readQueue(document)
      const files = await documentFiles(document)

      const source = await readDocument(files.latestSigned)
      if (!source) throw new HTTPError({ statusCode: 404, statusMessage: 'Original PDF file missing from storage.' })

      // The earlier copies are kept as the record of what was signed; only the voided copy is served from now on.
      const voided = await stampVoid(source, reason)
      await writeDocument(files.voided, voided)

      try {
        const queue = signers.map((signer) => (signer.status === 'PENDING' ? { ...signer, status: 'CANCELLED' } : signer))
        await notion.pages.update({
          page_id: id,
          properties: {
            Status: { status: { name: 'Void' } },
            ...(queue.length > 0 && { 'Routing Queue': { rich_text: toRichText(queue) } }),
            'Next Signer': { email: null },
          },
        })
      } catch (error) {
        await removeDocument(files.voided).catch(() => {})
        throw error
      }

      // The thumbnail is a convenience: if it fails, it is drawn from the voided copy when first requested.
      try {
        await writeDocument(files.voidedImage, await generatePdfThumbnail(voided))
      } catch (error) {
        console.warn('document/[id]/void POST: could not store the voided thumbnail', error)
      }

      return { documentStatus: 'Void', fileName: files.displayName(files.voided) }
    })
  } catch (error: unknown) {
    toRouteError(error, 'document/[id]/void POST')
  }
})
