import { defineEventHandler, getRouterParam, HTTPError, readBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'

import type { NotionDocument } from '~/server/types'
import { assertDocumentAccess } from '~/server/utils/document-access'
import notion from '~/server/utils/notion'
import { normalizeEmail, readQueue, sameEmail } from '~/server/utils/routing-queue'
import { toRouteError } from '~/server/utils/route-error'
import { issueSessionToken, tokenLifetimeSeconds } from '~/server/utils/session-token'

const sessionSchema = z.object({
  signerEmail: z.email().transform(normalizeEmail),
  /** Optional absolute expiry. Defaults to 7 days; at most 30 days ahead. */
  expiresIn: z
    .string()
    .nullish()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), { message: 'Invalid date format for expiresIn' }),
})

export default defineEventHandler(async (event) => {
  try {
    const envelopeId = getRouterParam(event, 'id')
    if (!envelopeId) throw new HTTPError({ statusCode: 400, statusMessage: 'Document ID is required' })

    const config = useRuntimeConfig()
    const { signerEmail, expiresIn } = sessionSchema.parse(await readBody(event))

    const document = (await notion.pages.retrieve({ page_id: envelopeId })) as unknown as NotionDocument

    assertDocumentAccess(event, document)
    const currentStatus = document.properties.Status.status.name

    if (!['Sent', 'Partially Signed'].includes(currentStatus)) {
      throw new HTTPError({ statusCode: 403, statusMessage: `Document is not accepting signatures (Status: ${currentStatus})` })
    }

    const signers = readQueue(document)
    if (signers.length === 0) {
      throw new HTTPError({ statusCode: 500, statusMessage: 'Document envelope is corrupted or missing routing data.' })
    }

    const targetSigner = signers.find((signer) => sameEmail(signer.email, signerEmail))
    if (!targetSigner) {
      throw new HTTPError({ statusCode: 403, statusMessage: 'Email address is not part of this document envelope.' })
    }

    if (targetSigner.status === 'SIGNED') {
      throw new HTTPError({ statusCode: 409, statusMessage: 'This user has already signed the document.' })
    }

    if (document.properties['Routing Type'].select.name === 'SEQUENTIAL' && !sameEmail(document.properties['Next Signer'].email, signerEmail)) {
      throw new HTTPError({ statusCode: 403, statusMessage: `It is not ${signerEmail}'s turn to sign yet.` })
    }

    const lifetime = tokenLifetimeSeconds(expiresIn)
    const sessionToken = issueSessionToken({ documentId: envelopeId, signerEmail: targetSigner.email, role: targetSigner.role }, config.private.jwtSecret as string, lifetime)

    return {
      signer: targetSigner.email,
      expiresAt: new Date(Date.now() + lifetime * 1000).toISOString(),
      sessionToken,
    }
  } catch (error: unknown) {
    toRouteError(error, 'document/id/session POST')
  }
})
