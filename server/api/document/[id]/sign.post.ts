import { defineEventHandler, getRouterParam, readBody, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import mime from 'mime-types'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { SignPdf } from '@signpdf/signpdf'
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib'
import { P12Signer } from '@signpdf/signer-p12'

import notion from '~/server/utils/notion'
import type { NotionDocument } from '~/server/types'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import { templateRegistry } from '~/server/utils/template-registry'

const signSchema = z.object({
  sessionToken: z.string(),
  fields: z.record(z.string(), z.union([z.string(), z.boolean()])).default({}),
  telemetry: z
    .object({
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .optional(),
})

interface SignerDetails {
  order: number
  name: string
  email: string
  role: string
  status: string
  signedAt: string
  telemetry?: {
    ipAddress?: string
    userAgent?: string
  }
}

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw new HTTPError({ statusCode: 400, statusMessage: 'Document ID is required' })

    const fsStorage = useStorage('fs')
    const config = useRuntimeConfig()

    const body = await readBody(event)
    const { sessionToken, fields: inputFields, telemetry } = signSchema.parse(body)

    let decodedToken: any

    try {
      decodedToken = jwt.verify(sessionToken, config.private.jwtSecret)
    } catch {
      throw new HTTPError({ statusCode: 401, statusMessage: 'Session expired or invalid.' })
    }

    if (decodedToken.documentId !== id) {
      throw new HTTPError({ statusCode: 403, statusMessage: 'Token id does not match this document id.' })
    }

    const signerEmail = decodedToken.signerEmail

    const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument
    const queueData = notionTextStringify(document.properties['Routing Queue']?.rich_text)
    const templateId = document.properties['Template ID'].select.name
    const currentStatus = document.properties.Status.status.name

    if (!['Sent', 'Partially Signed'].includes(currentStatus)) {
      throw new HTTPError({ statusCode: 403, statusMessage: `Document is not accepting signatures (Status: ${currentStatus}).` })
    }

    const signers = JSON.parse(queueData) as SignerDetails[]
    const signerIndex = signers.findIndex((s: any) => s.email === signerEmail)
    const currentSigner = signers[signerIndex]

    if (signerIndex === -1) throw new HTTPError({ statusCode: 403, statusMessage: 'Signer not found in queue.' })
    if (currentSigner.status === 'SIGNED') throw new HTTPError({ statusCode: 409, statusMessage: 'Already signed.' })

    const fileName = `${notionTextStringify(document.properties.Name.title)}${currentSigner.order === 1 ? '' : '-' + (currentSigner.order - 1)}.${mime.extension(document.properties['Mime Type'].select.name)}`
    const currentFileName = `${notionTextStringify(document.properties.Name.title)}-${currentSigner.order}.${mime.extension(document.properties['Mime Type'].select.name)}`
    const signedFileName = `${notionTextStringify(document.properties.Name.title)}-signed.${mime.extension(document.properties['Mime Type'].select.name)}`

    currentSigner.status = 'SIGNED'
    currentSigner.signedAt = new Date().toISOString()
    currentSigner.telemetry = telemetry

    const pendingSigners = signers.filter((s: any) => s.status === 'PENDING')
    const isCompleted = pendingSigners.length === 0
    const nextStatus = isCompleted ? 'Completed' : 'Partially Signed'
    const nextSignerEmail = isCompleted ? null : pendingSigners[0].email

    const pdfBuffer = await fsStorage.getItemRaw<Buffer>(fileName)

    if (!pdfBuffer) {
      throw new HTTPError({ statusCode: 404, statusMessage: `PDF file missing for document ID "${id}"` })
    }

    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pages = pdfDoc.getPages()

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    pdfDoc.setProducer('MDoc')

    const certificateBuffer = await fsStorage.getItemRaw('certificate.p12')
    const signer = new P12Signer(certificateBuffer, { passphrase: config.private.certificateSecret })

    if (isCompleted) {
      pdflibAddPlaceholder({
        pdfDoc: pdfDoc,
        reason: 'The user is decalaring consent.',
        contactInfo: currentSigner.email,
        name: currentSigner.name,
        location: 'Global',
      })
    }

    const targetTemplate = templateRegistry[templateId]
    const allFields = targetTemplate?.signerFields || []
    const signatureFields = allFields.filter((f) => f.signerOrder === currentSigner.order)

    for (const field of signatureFields) {
      const pageIdx = field.pageIndex < 0 ? pages.length + field.pageIndex : field.pageIndex
      const page = pages[pageIdx]
      const textOptions = { font: helveticaFont, size: field.fontSize || 12, color: rgb(0, 0, 0) }

      switch (field.type) {
        case 'SIGNATURE': {
          const sigVal = inputFields[field.id]
          if (field.required && !sigVal) throw new HTTPError({ statusCode: 400, statusMessage: `Signature image is required for field: ${field.id}` })
          if (sigVal && typeof sigVal === 'string') {
            const b64 = sigVal.replace(/^data:image\/(png|jpeg);base64,/, '')
            const signatureImage = await pdfDoc.embedPng(Buffer.from(b64, 'base64'))

            const dims = signatureImage.scaleToFit(field.width, field.height)
            page.drawImage(signatureImage, {
              x: field.x + (field.width - dims.width) / 2,
              y: field.y + (field.height - dims.height) / 2,
              width: dims.width,
              height: dims.height,
            })
          }
          break
        }

        case 'INITIALS': {
          const initVal = inputFields[field.id]
          if (field.required && !initVal) throw new HTTPError({ statusCode: 400, statusMessage: `Initials image is required for field: ${field.id}` })
          if (initVal && typeof initVal === 'string') {
            const b64 = initVal.replace(/^data:image\/(png|jpeg);base64,/, '')
            const initialsImage = await pdfDoc.embedPng(Buffer.from(b64, 'base64'))
            const dims = initialsImage.scaleToFit(field.width, field.height)
            page.drawImage(initialsImage, {
              x: field.x + (field.width - dims.width) / 2,
              y: field.y + (field.height - dims.height) / 2,
              width: dims.width,
              height: dims.height,
            })
          }
          break
        }

        case 'DATE': {
          const textVal = new Date().toLocaleDateString()
          const textWidth = helveticaFont.widthOfTextAtSize(textVal, field.fontSize || 12)
          page.drawText(textVal, { x: field.x + (field.width - textWidth) / 2, y: field.y + field.height / 2 - (field.fontSize || 12) / 3, ...textOptions })
          break
        }

        case 'NAME': {
          // Auto-fill from queue data
          const signerName = currentSigner.name
          const textWidth = helveticaBold.widthOfTextAtSize(signerName, field.fontSize || 12)
          page.drawText(signerName, {
            x: field.x + (field.width - textWidth) / 2,
            y: field.y + field.height / 2 - (field.fontSize || 12) / 3,
            font: helveticaBold,
            size: field.fontSize || 12,
            color: rgb(0, 0, 0),
          })
          break
        }

        case 'EMAIL': {
          const textWidth = helveticaFont.widthOfTextAtSize(currentSigner.email, field.fontSize || 12)
          page.drawText(currentSigner.email, { x: field.x + (field.width - textWidth) / 2, y: field.y + field.height / 2 - (field.fontSize || 12) / 3, ...textOptions })
          break
        }

        case 'TEXT': {
          const textVal = inputFields[field.id]
          if (field.required && !textVal) throw new HTTPError({ statusCode: 400, statusMessage: `Field ${field.id} is required.` })
          if (textVal && typeof textVal === 'string') {
            const textWidth = helveticaFont.widthOfTextAtSize(textVal, field.fontSize || 12)
            page.drawText(textVal, { x: field.x + (field.width - textWidth) / 2, y: field.y + field.height / 2 - (field.fontSize || 12) / 3, ...textOptions })
          }
          break
        }

        case 'CHECKBOX': {
          const isChecked = inputFields[field.id]
          if (field.required && !isChecked) throw new HTTPError({ statusCode: 400, statusMessage: `Checkbox ${field.id} must be checked.` })
          if (isChecked === true) {
            const checkSize = field.height * 0.8
            const textWidth = helveticaBold.widthOfTextAtSize('X', checkSize)
            page.drawText('X', {
              x: field.x + (field.width - textWidth) / 2,
              y: field.y + field.height / 2 - checkSize / 3,
              font: helveticaBold,
              size: checkSize,
              color: rgb(0, 0, 0),
            })
          }
          break
        }
      }
    }

    let signedPdfBuffer: Uint8Array = await pdfDoc.save()

    if (isCompleted) {
      const pdfWithPlaceholderBytes = await pdfDoc.save()
      signedPdfBuffer = await new SignPdf().sign(pdfWithPlaceholderBytes, signer)
    }

    await fsStorage.setItemRaw(isCompleted ? signedFileName : currentFileName, signedPdfBuffer)

    await notion.pages.update({
      page_id: id,
      properties: {
        Status: { status: { name: nextStatus } },
        'Routing Queue': { rich_text: [{ text: { content: JSON.stringify(signers) } }] },
        'Next Signer': { email: nextSignerEmail },
      },
    })

    return {
      documentStatus: nextStatus,
      nextSigner: nextSignerEmail,
    }
  } catch (error: any) {
    console.error(`API /document/id/sign POST`, error)

    if (error instanceof z.ZodError) throw new HTTPError({ statusCode: 400, statusMessage: 'Invalid payload', data: error.errors })
    if (error instanceof HTTPError) throw error
    throw new HTTPError({ statusCode: 500, statusMessage: 'Failed to execute signature engine' })
  }
})
