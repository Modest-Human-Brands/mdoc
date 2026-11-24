import { defineEventHandler, getRequestIP, getRouterParam, HTTPError, readBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import crypto from 'node:crypto'
import { plainAddPlaceholder } from '@signpdf/placeholder-plain'

import '~/templates/document'

import { templateRegistry } from '~/server/utils/template-registry'
import { buildPreparedSignerInfo } from '~/server/utils/cms-signer'
import { resolveSigningContext, applyFieldStamps } from '~/server/utils/document-signing'
import { patchByteRange, extractSigningContent } from '~/server/utils/pdf-byte-range'
import { readDocument } from '~/server/utils/documents'
import { toRouteError } from '~/server/utils/route-error'
import { createSignSession } from '~/server/utils/sign-sessions'

const MAX_CERT_HEX = 20_000

const prepareSchema = z.object({
  sessionToken: z.string(),
  fields: z.record(z.string(), z.union([z.string(), z.boolean()])).default({}),
  certificateDerHex: z
    .string()
    .regex(/^[\da-f]+$/i)
    .max(MAX_CERT_HEX)
    .optional(),
  certificateChainDerHex: z
    .array(
      z
        .string()
        .regex(/^[\da-f]+$/i)
        .max(MAX_CERT_HEX)
    )
    .max(10)
    .default([]),
})

/**
 * Public: the signer's browser calls this with only the magic-link token (the credential). The document is
 * taken from the token, never from request headers, and the audit telemetry is read from this request
 * rather than from the body, where a signer could write anything.
 */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw new HTTPError({ statusCode: 400, statusMessage: 'Document ID is required' })

    const config = useRuntimeConfig()
    const { sessionToken, fields: inputFields, certificateDerHex, certificateChainDerHex } = prepareSchema.parse(await readBody(event))
    const telemetry = { ipAddress: getRequestIP(event, { xForwardedFor: true }), userAgent: event.req.headers.get('user-agent') ?? undefined }

    const ctx = await resolveSigningContext(id, sessionToken, config.private.jwtSecret as string)

    const pdfBuffer = await readDocument(ctx.fileName)
    if (!pdfBuffer) throw new HTTPError({ statusCode: 404, statusMessage: 'The document file is missing from storage.' })

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
    let pdfToStore: Buffer = placeholderBytes
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
      pdfToStore = patchedBytes
      storedLtIdx = ltIdx
      storedGtIdx = gtIdx
    }

    const sessionId = await createSignSession(
      {
        documentId: id,
        signerEmail: ctx.currentSigner.email,
        fileName: ctx.fileName,
        currentFileName: ctx.currentFileName,
        signedFileName: ctx.signedFileName,
        ltIdx: storedLtIdx,
        gtIdx: storedGtIdx,
        signerInfoDerHex,
        certificateDerHex,
        certificateChainDerHex,
        telemetry,
      },
      pdfToStore
    )

    return { sessionId, digestHex, signerEmail: ctx.currentSigner.email, documentStatus: ctx.document.properties.Status.status.name }
  } catch (error: unknown) {
    toRouteError(error, '[Prepare - FATAL ERROR]', 'An error occurred while preparing the document for signing.')
  }
})
