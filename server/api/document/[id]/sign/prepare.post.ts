import { defineEventHandler, getRouterParam, readBody, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'
import { z } from 'zod'
import crypto from 'node:crypto'

import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib'
import { templateRegistry } from '~/server/utils/template-registry'
import { buildPreparedSignerInfo } from '~/server/utils/cms-signer'
import { type SignSession, resolveSigningContext, applyFieldStamps } from '~/server/utils/document-signing'
import { patchByteRange, extractSigningContent } from '~/server/utils/pdf-byte-range'

const prepareSchema = z.object({
  sessionToken: z.string(),
  fields: z.record(z.string(), z.union([z.string(), z.boolean()])).default({}),
  certificateDerHex: z.string(),
  certificateChainDerHex: z.array(z.string()).default([]),
  telemetry: z.object({ ipAddress: z.string().optional(), userAgent: z.string().optional() }).optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw new HTTPError({ statusCode: 400, statusMessage: 'Document ID is required' })

    const config = useRuntimeConfig()
    const fsStorage = useStorage('fs')
    const signStorage = useStorage<SignSession>('data:sign')

    const body = await readBody(event)
    const { sessionToken, fields: inputFields, certificateDerHex, certificateChainDerHex, telemetry } = prepareSchema.parse(body)

    const ctx = await resolveSigningContext(id, sessionToken, config)
    const pdfBuffer = await fsStorage.getItemRaw<Buffer>(ctx.fileName)
    if (!pdfBuffer) throw new HTTPError({ statusCode: 404, statusMessage: `PDF file missing for document ID "${id}"` })

    const targetTemplate = templateRegistry[ctx.document.properties['Template ID'].select.name]

    const signatureFields = (targetTemplate?.signerFields || []).filter((f: any) => Number(f.signerOrder) === Number(ctx.currentSigner.order))
    const pdfDoc = await applyFieldStamps(pdfBuffer, ctx.currentSigner, signatureFields, inputFields)

    const sigField = signatureFields.find((f: any) => f.type === 'SIGNATURE' || f.type === 'INITIALS')
    const widgetPageIdx = sigField && typeof sigField.pageIndex === 'number' ? Math.max(0, sigField.pageIndex - 1) : 0

    pdflibAddPlaceholder({
      pdfDoc,
      reason: 'The user is declaring consent and cryptographically signing.',
      contactInfo: ctx.currentSigner.email,
      name: ctx.currentSigner.name,
      location: 'Global',
      signatureLength: 262_144, //room for leaf + chain
      widgetRect: sigField ? [sigField.x, sigField.y, sigField.x + sigField.width, sigField.y + sigField.height] : undefined,
      // widgetPage: widgetPageIdx,
    })

    const placeholderBytes = Buffer.from(await pdfDoc.save())

    const { patchedBytes, ltIdx, gtIdx } = patchByteRange(placeholderBytes)
    const content = extractSigningContent(patchedBytes, ltIdx, gtIdx)
    const contentDigest = crypto.createHash('sha256').update(content).digest()

    const certDer = Buffer.from(certificateDerHex, 'hex')
    const { signerInfoDer, digestToSign } = await buildPreparedSignerInfo({
      certDer: certDer.buffer.slice(certDer.byteOffset, certDer.byteOffset + certDer.byteLength),
      contentDigest,
    })

    const sessionId = crypto.randomUUID()
    await signStorage.setItem(
      `session:${sessionId}`,
      {
        documentId: id,
        patchedPdfHex: patchedBytes.toString('hex'),
        ltIdx,
        gtIdx,
        signerInfoDerHex: signerInfoDer.toString('hex'),
        certificateDerHex,
        certificateChainDerHex,
        ctx,
        telemetry,
      },
      { ttl: 300 }
    )

    return {
      sessionId,
      digestHex: digestToSign.toString('hex'),
      signerEmail: ctx.currentSigner.email,
      documentStatus: ctx.document.properties.Status.status.name,
    }
  } catch (error: any) {
    console.error(`API /document/[id]/prepare POST`, error)
    if (error instanceof Error && 'statusCode' in error) throw error
    throw new HTTPError({ statusCode: 500, statusMessage: 'An error occurred while preparing the document for signing.' })
  }
})
