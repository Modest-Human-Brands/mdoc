import { defineEventHandler, HTTPError } from 'h3'
import * as pkijs from 'pkijs'
import * as asn1js from 'asn1js'
import { Crypto } from '@peculiar/webcrypto'
import z from 'zod'

const webCrypto = new Crypto()

pkijs.setEngine(
  'crypto',
  new pkijs.CryptoEngine({
    name: 'webcrypto',
    crypto: webCrypto,
  }) as unknown as pkijs.ICryptoEngine
)

export default defineEventHandler(async (event) => {
  try {
    const formData = await event.req.formData()
    if (!formData) throw new Error('No form data received.')

    const pdfFile = formData.get('pdf') as File
    if (!pdfFile) throw new Error("No 'pdf' file uploaded.")

    const arrayBuffer = await pdfFile.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)

    const byteRangeRegex = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/
    const match = pdfBuffer.toString('binary').match(byteRangeRegex)

    if (!match) throw new Error('No digital signature (ByteRange) found in PDF.')

    const byteRange = [Number.parseInt(match[1], 10), Number.parseInt(match[2], 10), Number.parseInt(match[3], 10), Number.parseInt(match[4], 10)]

    const signedDataBuffer = Buffer.concat([pdfBuffer.subarray(byteRange[0], byteRange[0] + byteRange[1]), pdfBuffer.subarray(byteRange[2], byteRange[2] + byteRange[3])])

    const signatureHexStr = pdfBuffer
      .subarray(byteRange[0] + byteRange[1], byteRange[2])
      .toString('binary')
      .replace(/<|>/g, '')
      .replace(/(00)+$/, '')
      .trim()

    const signatureBuffer = Buffer.from(signatureHexStr, 'hex')

    const asn1 = asn1js.fromBER(new Uint8Array(signatureBuffer).buffer)

    if (asn1.offset === -1) throw new Error('Invalid ASN.1 signature structure.')

    const contentInfo = new pkijs.ContentInfo({ schema: asn1.result })
    const signedData = new pkijs.SignedData({ schema: contentInfo.content })

    const verificationResult = await signedData.verify({
      signer: 0,
      data: new Uint8Array(signedDataBuffer).buffer,
      extendedMode: true,
    })

    const signerCert = signedData.certificates?.[0]
    const signerName = signerCert ? signerCert.subject.typesAndValues.find((t) => t.type === '2.5.4.3')?.value.valueBlock.value : 'Unknown'

    return {
      isIntact: verificationResult,
      signer: signerName,
      message: verificationResult ? 'Document is intact and signature is valid.' : 'Document is tampered or signature is invalid.',
    }
  } catch (error: any) {
    console.error(`API /document/[id]/verify-signature POST`, error)
    if (error instanceof HTTPError) throw error
    throw new HTTPError({ statusCode: 500, statusMessage: 'Failed to void document' })
  }
})
