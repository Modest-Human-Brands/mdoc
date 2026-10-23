import { defineEventHandler, getRouterParam, readBody, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z, ZodError } from 'zod'
import crypto from 'node:crypto'
import { plainAddPlaceholder } from '@signpdf/placeholder-plain'

import '~/templates/document'

import { templateRegistry } from '~/server/utils/template-registry'
import { buildPreparedSignerInfo } from '~/server/utils/cms-signer'
import { type SignSession, resolveSigningContext, applyFieldStamps } from '~/server/utils/document-signing'
import { patchByteRange, extractSigningContent } from '~/server/utils/pdf-byte-range'
import { readDocument } from '~/server/utils/documents'

const prepareSchema = z.object({
  sessionToken: z.string(),
  fields: z.record(z.string(), z.union([z.string(), z.boolean()])).default({}),
  certificateDerHex: z.string().optional(),
  certificateChainDerHex: z.array(z.string()).default([]),
  telemetry: z.object({ ipAddress: z.string().optional(), userAgent: z.string().optional() }).optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw new HTTPError({ statusCode: 400, statusMessage: 'Document ID is required' })

    const config = useRuntimeConfig()
    const signStorage = useStorage<SignSession>('data:sign')

    const body = await readBody(event)
    const { sessionToken, fields: inputFields, certificateDerHex, certificateChainDerHex, telemetry } = prepareSchema.parse(body)

    const ctx = await resolveSigningContext(id, sessionToken, config.private.jwtSecret)

    const pdfBuffer = await readDocument(ctx.fileName)
    if (!pdfBuffer) throw new HTTPError({ statusCode: 404, statusMessage: `PDF file missing for document "${ctx.fileName}"` })

    const targetTemplate = templateRegistry[ctx.document.properties['Template ID'].select.name]
    const signatureFields = (targetTemplate?.signerFields || []).filter((f: any) => Number(f.signerOrder) === Number(ctx.currentSigner.order))

    const isFirstSigner = ctx.document.properties.Status.status.name === 'Sent'
    const stampedBuffer = applyFieldStamps(pdfBuffer, ctx.currentSigner, signatureFields, inputFields, isFirstSigner)

    const placeholderBytes = plainAddPlaceholder({
      pdfBuffer: stampedBuffer,
      reason: 'The user is declaring consent and cryptographically signing.',
      contactInfo: ctx.currentSigner.email,
      name: ctx.currentSigner.name,
      location: 'Global',
      signatureLength: 16_384,
    })

    let digestHex: string | undefined = undefined
    let signerInfoDerHex: string | undefined = undefined
    let pdfToStoreHex = placeholderBytes.toString('hex')
    let storedLtIdx: number | undefined = undefined
    let storedGtIdx: number | undefined = undefined

    if (certificateDerHex) {
      const { patchedBytes, ltIdx, gtIdx } = patchByteRange(placeholderBytes)
      const content = extractSigningContent(patchedBytes, ltIdx, gtIdx)
      const contentDigest = crypto.createHash('sha256').update(content).digest()

      const certDer = Buffer.from(certificateDerHex, 'hex')
      const { signerInfoDer, digestToSign } = await buildPreparedSignerInfo({
        certDer: certDer.buffer.slice(certDer.byteOffset, certDer.byteOffset + certDer.byteLength) as ArrayBuffer,
        contentDigest,
      })

      digestHex = digestToSign.toString('hex')
      signerInfoDerHex = signerInfoDer.toString('hex')
      pdfToStoreHex = patchedBytes.toString('hex')
      storedLtIdx = ltIdx
      storedGtIdx = gtIdx
    }

    const sessionId = crypto.randomUUID()
    await signStorage.setItem(
      `session:${sessionId}`,
      { documentId: id, patchedPdfHex: pdfToStoreHex, ltIdx: storedLtIdx, gtIdx: storedGtIdx, signerInfoDerHex, certificateDerHex, certificateChainDerHex, ctx, telemetry },
      { ttl: 300 }
    )

    return { sessionId, digestHex, signerEmail: ctx.currentSigner.email, documentStatus: ctx.document.properties.Status.status.name }
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

    console.error('[Prepare - FATAL ERROR]', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'An error occurred while preparing the document for signing.' })
    serverError.stack = undefined
    throw serverError
  }
})
