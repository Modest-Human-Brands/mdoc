import { defineEventHandler, readBody, HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import { z } from 'zod'
import { finalizeSignedData } from '~/server/utils/cms-signer'
import { type SignSession, type SignerDetails, finalizeAndPersist } from '~/server/utils/document-signing'
import { embedSignature } from '~/server/utils/pdf-byte-range'

const clientSignSchema = z.object({
  sessionId: z.string(),
  signatureHex: z.string(),
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { sessionId, signatureHex } = clientSignSchema.parse(body)

    const fsStorage = useStorage('fs')
    const signStorage = useStorage<SignSession>('data:sign')

    const session = await signStorage.getItem(`session:${sessionId}`)
    if (!session) throw new HTTPError({ statusCode: 400, statusMessage: 'Signing session expired or invalid. Please refresh and try again.' })

    const patchedBytes = Buffer.from(session.patchedPdfHex, 'hex')
    const signerInfoDer = Buffer.from(session.signerInfoDerHex, 'hex')
    const signatureBytes = Buffer.from(signatureHex, 'hex')
    const certDer = Buffer.from(session.certificateDerHex, 'hex')
    const certChainDer = session.certificateChainDerHex.map((h) => {
      const b = Buffer.from(h, 'hex')
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
    })

    const cmsDer = finalizeSignedData({
      signerInfoDer,
      signatureBytes,
      certDer: certDer.buffer.slice(certDer.byteOffset, certDer.byteOffset + certDer.byteLength),
      certChainDer,
    })

    const signedPdfBuffer = embedSignature(patchedBytes, cmsDer, session.ltIdx, session.gtIdx)

    const { ctx, telemetry } = session
    const pendingSigners = ctx.signers.filter((s: SignerDetails) => s.status === 'PENDING')
    const isCompleted = pendingSigners.length === 1
    const targetFileName = isCompleted ? ctx.signedFileName : ctx.currentFileName

    const result = await finalizeAndPersist(fsStorage, session.documentId, targetFileName, signedPdfBuffer, ctx.signers, ctx.currentSigner, telemetry)
    await signStorage.removeItem(`session:${sessionId}`)

    return result
  } catch (error: any) {
    console.error(`API /document/[id]/client POST`, error)
    if (error instanceof Error && 'statusCode' in error) throw error
    throw new HTTPError({ statusCode: 500, statusMessage: 'An error occurred while injecting the hardware signature.' })
  }
})
