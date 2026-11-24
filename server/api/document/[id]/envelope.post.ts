import { defineEventHandler, getRouterParam, HTTPError, readBody } from 'nitro/h3'
import { z } from 'zod'

import type { NotionDocument } from '~/server/types'
import { assertDocumentAccess } from '~/server/utils/document-access'
import notion from '~/server/utils/notion'
import { normalizeEmail, readQueue, toRichText } from '~/server/utils/routing-queue'
import { toRouteError } from '~/server/utils/route-error'
import { getTemplateOrThrow, validateEnvelopeSigners } from '~/server/utils/signer-requirements'

import '~/templates/document'

const envelopeSchema = z.object({
  // Signers are always created pending: a client can neither pre-sign nor decline on someone else's behalf.
  routingType: z
    .enum(['SEQUENTIAL', 'PARALLEL'])
    .default('SEQUENTIAL')
    .refine((value) => value === 'SEQUENTIAL', { message: "PARALLEL routing is not supported yet: each signature builds on the previous signer's file." }),
  signers: z
    .array(
      z.object({
        order: z.number(),
        name: z.string().trim().min(1),
        email: z.email().transform(normalizeEmail),
        role: z.string().default('Signer'),
      })
    )
    .min(1, 'At least one signer is required'),
})

/** An envelope can be (re)sent while drafting, or before anyone has signed; never once signing has started or ended. */
const SENDABLE = new Set(['Draft', 'Ready'])

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw new HTTPError({ statusCode: 400, statusMessage: 'Document ID is required' })

    const { signers, routingType } = envelopeSchema.parse(await readBody(event))

    const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument

    assertDocumentAccess(event, document)

    const status = document.properties.Status.status.name
    const untouched = status === 'Sent' && !readQueue(document).some((signer) => signer.status !== 'PENDING')
    if (!SENDABLE.has(status) && !untouched) {
      throw new HTTPError({ statusCode: 409, statusMessage: `Cannot send a document for signing while it is ${status}.` })
    }

    const templateDef = getTemplateOrThrow(document.properties['Template ID']?.select?.name)
    const signerErrors = validateEnvelopeSigners(templateDef, signers)
    const emails = signers.map((signer) => signer.email)
    for (const [index, email] of emails.entries()) {
      if (emails.indexOf(email) !== index) signerErrors.push({ field: `signers.${index}.email`, message: `${email} is listed more than once.`, code: 'duplicate_signer_email' })
    }
    if (signerErrors.length > 0) {
      throw new HTTPError({ statusCode: 400, statusMessage: 'Bad Request', data: { errors: signerErrors } })
    }

    const sortedSigners = signers.map((signer) => ({ ...signer, status: 'PENDING' })).sort((a, b) => a.order - b.order)
    const nextSigner = sortedSigners[0]!

    await notion.pages.update({
      page_id: id,
      properties: {
        Status: { status: { name: 'Sent' } },
        'Routing Queue': { rich_text: toRichText(sortedSigners) },
        'Routing Type': { select: { name: routingType } },
        'Next Signer': { email: nextSigner.email },
      },
    })

    return {
      status: 'Sent',
      nextSigner: nextSigner.email,
      queueSize: sortedSigners.length,
    }
  } catch (error: unknown) {
    toRouteError(error, 'document/[id]/envelope.post')
  }
})
