import { defineEventHandler, getRouterParam, readBody, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import mime from 'mime-types'
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'
import { SignPdf } from '@signpdf/signpdf'
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib'
import { P12Signer } from '@signpdf/signer-p12'

import type { NotionDocument } from '~/server/types'
import notion from '~/server/utils/notion'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import { templateRegistry } from '~/server/utils/template-registry'

function resolveTargetPages(pIdx: string | number | number[], pages: PDFPage[]): PDFPage[] {
  let targetPages: PDFPage[] = []
  const total = pages.length
  const resolveIdx = (idx: number) => (idx < 0 ? total + idx : idx)

  if (typeof pIdx === 'number') {
    targetPages = [pages[resolveIdx(pIdx)]]
  } else if (Array.isArray(pIdx)) {
    targetPages = pIdx.map((idx) => pages[resolveIdx(idx)])
  } else if (typeof pIdx === 'string') {
    switch (pIdx) {
      case 'all': {
        targetPages = pages

        break
      }
      case 'all-except-last': {
        targetPages = pages.slice(0, -1)

        break
      }
      case 'odd': {
        targetPages = pages.filter((_, i) => i % 2 === 0)

        break
      }
      case 'even': {
        targetPages = pages.filter((_, i) => i % 2 !== 0)

        break
      }
      default: {
        if (pIdx.startsWith('*/')) {
          const step = Number.parseInt(pIdx.replace('*/', ''), 10)
          if (!Number.isNaN(step) && step > 0) {
            targetPages = pages.filter((_, i) => i % step === 0)
          }
        } else if (pIdx.includes(',')) {
          const indices = pIdx
            .split(',')
            .map((s) => Number.parseInt(s.trim(), 10))
            .filter((n) => !Number.isNaN(n))
          targetPages = indices.map((idx) => pages[resolveIdx(idx)])
        } else if (pIdx.includes('-')) {
          const parts = pIdx.split('-').map((s) => Number.parseInt(s.trim(), 10))
          if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
            targetPages = pages.slice(resolveIdx(parts[0]), resolveIdx(parts[1]) + 1)
          }
        }
      }
    }
  }
  return targetPages
}

async function drawBase64Image(pdfDoc: PDFDocument, targetPages: PDFPage[], field: any, base64String: string) {
  const isJpeg = base64String.startsWith('data:image/jpeg') || base64String.startsWith('data:image/jpg')
  const b64 = base64String.replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
  const buffer = Buffer.from(b64, 'base64')

  let image
  if (isJpeg) {
    image = await pdfDoc.embedJpg(buffer)
  } else {
    image = await pdfDoc.embedPng(buffer)
  }

  const dims = image.scaleToFit(field.width, field.height)

  for (const page of targetPages) {
    page.drawImage(image, {
      x: field.x + (field.width - dims.width) / 2,
      y: field.y + (field.height - dims.height) / 2,
      width: dims.width,
      height: dims.height,
    })
  }
}

function drawCenteredText(targetPages: PDFPage[], field: any, text: string, font: PDFFont, baseOptions: any) {
  const textWidth = font.widthOfTextAtSize(text, field.fontSize || 12)
  for (const page of targetPages) {
    page.drawText(text, {
      x: field.x + (field.width - textWidth) / 2,
      y: field.y + field.height / 2 - (field.fontSize || 12) / 3,
      ...baseOptions,
    })
  }
}

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

    const baseTitle = notionTextStringify(document.properties.Name.title)
    const ext = mime.extension(document.properties['Mime Type'].select.name)

    const fileName = `${baseTitle}${currentSigner.order === 1 ? '' : '-' + (currentSigner.order - 1)}.${ext}`
    const currentFileName = `${baseTitle}-${currentSigner.order}.${ext}`
    const signedFileName = `${baseTitle}-signed.${ext}`

    currentSigner.status = 'SIGNED'
    currentSigner.signedAt = new Date().toISOString()
    currentSigner.telemetry = telemetry

    const pendingSigners = signers.filter((s) => s.status === 'PENDING')
    const isCompleted = pendingSigners.length === 0
    const nextStatus = isCompleted ? 'Completed' : 'Partially Signed'
    const nextSigner = isCompleted ? null : pendingSigners[0]

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
        reason: 'The user is declaring consent.',
        contactInfo: currentSigner.email,
        name: currentSigner.name,
        location: 'Global',
      })
    }

    const targetTemplate = templateRegistry[templateId]
    const allFields = targetTemplate?.signerFields || []
    const signatureFields = allFields.filter((f) => f.signerOrder === currentSigner.order)

    for (const field of signatureFields) {
      const targetPages = resolveTargetPages(field.pageIndex, pages)
      const textOptions = { font: helveticaFont, size: field.fontSize || 12, color: rgb(0, 0, 0) }

      switch (field.type) {
        case 'SIGNATURE':
        case 'INITIALS': {
          const imgVal = inputFields[field.id]
          if (field.required && !imgVal) throw new HTTPError({ statusCode: 400, statusMessage: `Image is required for field: ${field.id}` })
          if (imgVal && typeof imgVal === 'string') {
            await drawBase64Image(pdfDoc, targetPages, field, imgVal)
          }
          break
        }

        case 'DATE': {
          drawCenteredText(targetPages, field, new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }), helveticaFont, textOptions)
          break
        }

        case 'NAME': {
          drawCenteredText(targetPages, field, currentSigner.name, helveticaBold, { ...textOptions, font: helveticaBold })
          break
        }

        case 'EMAIL': {
          drawCenteredText(targetPages, field, currentSigner.email, helveticaFont, textOptions)
          break
        }

        case 'TEXT': {
          const textVal = inputFields[field.id]
          if (field.required && !textVal) throw new HTTPError({ statusCode: 400, statusMessage: `Field ${field.id} is required.` })
          if (textVal && typeof textVal === 'string') {
            drawCenteredText(targetPages, field, textVal, helveticaFont, textOptions)
          }
          break
        }

        case 'CHECKBOX': {
          const isChecked = inputFields[field.id]
          if (field.required && !isChecked) throw new HTTPError({ statusCode: 400, statusMessage: `Checkbox ${field.id} must be checked.` })
          if (isChecked === true) {
            const checkSize = field.height * 0.8
            drawCenteredText(targetPages, field, 'X', helveticaBold, { ...textOptions, font: helveticaBold, size: checkSize })
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
        'Next Signer': { email: nextSigner?.email ?? null },
      },
    })

    return {
      id,
      documentStatus: nextStatus,
      currentSigner,
      nextSigner,
    }
  } catch (error: any) {
    console.error(`API /document/id/sign POST`, error)

    if (error instanceof z.ZodError) throw new HTTPError({ statusCode: 400, statusMessage: 'Invalid payload', data: error })
    if (error instanceof HTTPError) throw error
    throw new HTTPError({ statusCode: 500, statusMessage: 'Failed to execute signature engine' })
  }
})
