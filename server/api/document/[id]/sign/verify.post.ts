import { defineEventHandler, HTTPError } from 'nitro/h3'

import { describeCmsSigner, verifyCmsSignature } from '~/server/utils/cms-signer'
import { toRouteError } from '~/server/utils/route-error'

const MAX_PDF_BYTES = 25 * 1024 * 1024
const BYTE_RANGE = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g

const badPdf = (message: string, code: string) => new HTTPError({ statusCode: 400, statusMessage: 'Bad Request', data: { errors: [{ field: 'pdf', message, code }] } })

interface SignatureResult {
  signer?: string
  issuer?: string
  valid: boolean
  /** True when the signed bytes run to the end of the file, i.e. nothing was added after this signature. */
  coversToEnd: boolean
  certificateExpired?: boolean
  notAfter?: string
}

/** Finds every embedded signature: a ByteRange that is well formed, and whose gap holds a hex `/Contents` string. */
function findSignatures(pdf: Buffer) {
  const text = pdf.toString('latin1')
  const found: { byteRange: [number, number, number, number]; contents: Buffer }[] = []

  for (const match of text.matchAll(BYTE_RANGE)) {
    const [a, b, c, d] = match.slice(1).map(Number) as [number, number, number, number]
    if (a !== 0 || b <= 0 || c <= b || d < 0 || c + d > pdf.length) continue

    const gap = text.slice(b, c)
    if (!/^<[\da-fA-F\s]+>$/.test(gap)) continue
    found.push({
      byteRange: [a, b, c, d],
      contents: Buffer.from(
        gap
          .slice(1, -1)
          .replace(/\s/g, '')
          .replace(/(00)+$/, ''),
        'hex'
      ),
    })
  }
  return found
}

/**
 * Verifies every signature in an uploaded PDF, not only the first: each must match the bytes it covers, and the
 * last one must run to the end of the file. Bytes added after the last signature would otherwise go unnoticed.
 */
export default defineEventHandler(async (event) => {
  try {
    const formData = await event.req.formData()
    const pdfFile = formData.get('pdf')
    if (!(pdfFile instanceof File)) throw badPdf("No 'pdf' file uploaded.", 'invalid_type')
    if (pdfFile.size > MAX_PDF_BYTES) throw new HTTPError({ statusCode: 413, statusMessage: 'The PDF is larger than 25 MB.' })

    const pdf = Buffer.from(await pdfFile.arrayBuffer())
    const signatures = findSignatures(pdf)
    if (signatures.length === 0) throw badPdf('No digital signature (ByteRange) found in PDF.', 'invalid_value')

    const results: SignatureResult[] = []
    for (const {
      byteRange: [a, b, c, d],
      contents,
    } of signatures) {
      const signedContent = Buffer.concat([pdf.subarray(a, a + b), pdf.subarray(c, c + d)])
      const certificate = describeCmsSigner(contents)
      results.push({
        signer: certificate?.subject ?? 'Unknown',
        issuer: certificate?.issuer,
        valid: await verifyCmsSignature(contents, signedContent),
        coversToEnd: c + d === pdf.length,
        certificateExpired: certificate ? certificate.notAfter.getTime() < Date.now() : undefined,
        notAfter: certificate?.notAfter.toISOString(),
      })
    }

    const allValid = results.every((result) => result.valid)
    const finalCoversToEnd = results.some((result) => result.coversToEnd)
    const isIntact = allValid && finalCoversToEnd

    return {
      isIntact,
      signer: results.at(-1)?.signer,
      signatures: results,
      message: isIntact ? 'Document is intact and every signature is valid.' : allValid ? 'Content was added after the last signature.' : 'Document is tampered or a signature is invalid.',
    }
  } catch (error: unknown) {
    toRouteError(error, 'document/[id]/sign/verify POST')
  }
})
