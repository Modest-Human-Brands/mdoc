import { defineEventHandler, readBody, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'
import { z, ZodError } from 'zod'
import { SignPdf } from '@signpdf/signpdf'
import { P12Signer } from '@signpdf/signer-p12'

import { type SignSession, type SignerDetails, finalizeAndPersist } from '~/server/utils/document-signing'

const serverSignSchema = z.object({
  sessionId: z.string(),
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { sessionId } = serverSignSchema.parse(body)

    const config = useRuntimeConfig()
    const fsStorage = useStorage('fs')
    const signStorage = useStorage<SignSession>('data:sign')

    const session = await signStorage.getItem(`session:${sessionId}`)
    if (!session) {
      throw new HTTPError({ statusCode: 400, statusMessage: 'Signing session expired or invalid.' })
    }

    const pdfWithPlaceholder = Buffer.from(session.patchedPdfHex, 'hex')

    const certificateBuffer = await fsStorage.getItemRaw<Buffer>('certificate.p12')
    if (!certificateBuffer) {
      throw new HTTPError({ statusCode: 500, statusMessage: 'Server signing certificate (certificate.p12) not found.' })
    }

    const signer = new P12Signer(certificateBuffer, {
      passphrase: config.private.certificateSecret as string,
    })

    const signedPdfBuffer = await new SignPdf().sign(pdfWithPlaceholder, signer)

    const { ctx, telemetry } = session
    const pendingSigners = ctx.signers.filter((s: SignerDetails) => s.status === 'PENDING')
    const isCompleted = pendingSigners.length === 1
    const targetFileName = isCompleted ? ctx.signedFileName : ctx.currentFileName

    const result = await finalizeAndPersist(fsStorage, session.documentId, targetFileName, signedPdfBuffer, ctx.signers, ctx.currentSigner, telemetry)

    await signStorage.removeItem(`session:${sessionId}`)

    return result
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

    console.error('[ServerSign - FATAL ERROR]', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'An error occurred during server-side document signing.' })
    serverError.stack = undefined
    throw serverError
  }
})
