import { defineEventHandler, getRouterParam, HTTPError, readBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'

import type { NotionDocument } from '~/server/types'
import notion from '~/server/utils/notion'
import { readQueue, sameEmail } from '~/server/utils/routing-queue'
import { toRouteError } from '~/server/utils/route-error'
import { readSessionToken } from '~/server/utils/session-token'

const bodySchema = z.object({ sessionToken: z.string().min(1, 'Session token is required') })

/** Public: the signer's browser calls this with only the magic-link token, which is the credential. */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw new HTTPError({ statusCode: 400, statusMessage: 'Document ID is required' })

    const { sessionToken } = bodySchema.parse(await readBody(event))
    const token = readSessionToken(sessionToken, id, useRuntimeConfig().private.jwtSecret as string)

    const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument
    const signers = readQueue(document)
    if (signers.length === 0) throw new HTTPError({ statusCode: 500, statusMessage: 'Document envelope is corrupted or missing routing data.' })

    const targetSigner = signers.find((signer) => sameEmail(signer.email, token.signerEmail))
    if (!targetSigner) throw new HTTPError({ statusCode: 403, statusMessage: 'Signer not found in the routing queue.' })

    return {
      isValid: true,
      signerEmail: targetSigner.email,
      role: targetSigner.role,
      order: targetSigner.order,
      status: targetSigner.status,
    }
  } catch (error: unknown) {
    toRouteError(error, 'document/[id]/session/verify POST')
  }
})
