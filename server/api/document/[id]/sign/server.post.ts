import { defineEventHandler, getRouterParam, HTTPError, readBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'
import { z } from 'zod'
import { SignPdf } from '@signpdf/signpdf'
import { P12Signer } from '@signpdf/signer-p12'

import { finalizeAndPersist } from '~/server/utils/document-signing'
import { toRouteError } from '~/server/utils/route-error'
import { deleteSignSession, readSignSession } from '~/server/utils/sign-sessions'

const serverSignSchema = z.object({ sessionId: z.string() })

/** Public: authenticated by the signing session `prepare` created for a magic-link token. */
export default defineEventHandler(async (event) => {
  try {
    const { sessionId } = serverSignSchema.parse(await readBody(event))

    const config = useRuntimeConfig()
    const { session, pdf: pdfWithPlaceholder } = await readSignSession(sessionId)
    if (session.documentId !== getRouterParam(event, 'id')) throw new HTTPError({ statusCode: 403, statusMessage: 'This signing session belongs to a different document.' })

    const certificateBuffer = await useStorage('fs').getItemRaw<Buffer>('certificate.p12')
    if (!certificateBuffer) {
      console.error('[ServerSign] The server signing certificate is not installed.')
      throw new HTTPError({ statusCode: 500, statusMessage: 'Server-side signing is not available.' })
    }

    const signer = new P12Signer(certificateBuffer, { passphrase: config.private.certificateSecret as string })
    const signedPdfBuffer = await new SignPdf().sign(pdfWithPlaceholder, signer)

    const result = await finalizeAndPersist(session, signedPdfBuffer)
    await deleteSignSession(sessionId)

    return result
  } catch (error: unknown) {
    toRouteError(error, '[ServerSign - FATAL ERROR]', 'An error occurred during server-side document signing.')
  }
})
