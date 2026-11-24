import { defineEventHandler, getRouterParam, HTTPError, readBody } from 'nitro/h3'
import { z } from 'zod'

import { buildMinimalChain, finalizeSignedData, inspectCertificate, verifyCmsSignature } from '~/server/utils/cms-signer'
import { finalizeAndPersist } from '~/server/utils/document-signing'
import { embedSignature, extractSigningContent } from '~/server/utils/pdf-byte-range'
import { toRouteError } from '~/server/utils/route-error'
import { deleteSignSession, readSignSession } from '~/server/utils/sign-sessions'

const clientSignSchema = z.object({
  sessionId: z.string(),
  signatureHex: z
    .string()
    .regex(/^[\da-f]+$/i)
    .max(20_000),
})

const rejected = (message: string, code: string) => new HTTPError({ statusCode: 400, statusMessage: 'Bad Request', data: { errors: [{ field: 'signatureHex', message, code }] } })

const toArrayBuffer = (buffer: Buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer

/**
 * Public: authenticated by the signing session `prepare` created for a magic-link token.
 * The signature is verified before anything is stored: a wrong, expired or non-RSA signature never reaches the document.
 */
export default defineEventHandler(async (event) => {
  try {
    const { sessionId, signatureHex } = clientSignSchema.parse(await readBody(event))

    const { session, pdf: patchedBytes } = await readSignSession(sessionId)
    if (session.documentId !== getRouterParam(event, 'id')) throw new HTTPError({ statusCode: 403, statusMessage: 'This signing session belongs to a different document.' })
    if (!session.signerInfoDerHex || !session.certificateDerHex || session.ltIdx === undefined || session.gtIdx === undefined) {
      throw new HTTPError({ statusCode: 400, statusMessage: 'This signing session was not prepared for a client-side signature.' })
    }

    const certDerAB = toArrayBuffer(Buffer.from(session.certificateDerHex, 'hex'))
    const certificate = inspectCertificate(certDerAB)
    const now = Date.now()
    if (!certificate.isRsa) throw rejected('Only RSA signing certificates are supported.', 'unsupported_algorithm')
    if (now < certificate.notBefore.getTime() || now > certificate.notAfter.getTime()) throw rejected('The signing certificate is expired or not yet valid.', 'certificate_expired')

    const certChainCandidates = (session.certificateChainDerHex ?? []).map((hex) => toArrayBuffer(Buffer.from(hex, 'hex')))
    const cmsDer = finalizeSignedData({
      signerInfoDer: Buffer.from(session.signerInfoDerHex, 'hex'),
      signatureBytes: Buffer.from(signatureHex, 'hex'),
      certDer: certDerAB,
      certChainDer: buildMinimalChain(certDerAB, certChainCandidates),
    })

    if (!(await verifyCmsSignature(cmsDer, extractSigningContent(patchedBytes, session.ltIdx, session.gtIdx)))) {
      throw rejected('The signature does not match the document and certificate.', 'invalid_signature')
    }

    const signedPdfBuffer = embedSignature(patchedBytes, cmsDer, session.ltIdx, session.gtIdx)
    const result = await finalizeAndPersist(session, signedPdfBuffer, {
      subject: certificate.subject,
      issuer: certificate.issuer,
      serialNumber: certificate.serialNumber,
      notAfter: certificate.notAfter.toISOString(),
    })
    await deleteSignSession(sessionId)

    return result
  } catch (error: unknown) {
    toRouteError(error, '[ClientSign - FATAL ERROR]')
  }
})
