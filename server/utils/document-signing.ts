import { HTTPError } from 'nitro/h3'
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'
import jwt from 'jsonwebtoken'
import mime from 'mime-types'
import type { NotionDocument } from '~/server/types'
import notion from '~/server/utils/notion'
import notionTextStringify from '~/server/utils/notion-text-stringify'

export interface SignerDetails {
  order: number
  name: string
  email: string
  role: string
  status: string
  signedAt: string
  telemetry?: { ipAddress?: string; userAgent?: string }
}

export interface SignSession {
  documentId: string
  patchedPdfHex: string
  ltIdx: number
  gtIdx: number
  signerInfoDerHex: string
  certificateDerHex: string
  certificateChainDerHex: string[]
  ctx: {
    document: NotionDocument
    signers: SignerDetails[]
    currentSigner: SignerDetails
    fileName: string
    currentFileName: string
    signedFileName: string
  }
  telemetry?: { ipAddress?: string; userAgent?: string }
}

function resolveTargetPages(pIdx: string | number | number[], pages: PDFPage[]): PDFPage[] {
  const total = pages.length
  const resolveIdx = (idx: number) => {
    if (idx < 0) return total + idx
    // Prevent undefined page errors when 1-based indexing is passed (e.g., pageIndex=1 for page 0)
    if (idx >= total && idx > 0) return Math.min(idx - 1, total - 1)
    return idx
  }

  if (typeof pIdx === 'number') return [pages[resolveIdx(pIdx)]]
  if (Array.isArray(pIdx)) return pIdx.map((idx) => pages[resolveIdx(idx)])
  if (typeof pIdx !== 'string') return []

  switch (pIdx) {
    case 'all': {
      return pages
    }
    case 'all-except-last': {
      return pages.slice(0, -1)
    }
    case 'odd': {
      return pages.filter((_, i) => i % 2 === 0)
    }
    case 'even': {
      return pages.filter((_, i) => i % 2 !== 0)
    }
    default: {
      if (pIdx.startsWith('*/')) {
        const step = Number.parseInt(pIdx.replace('*/', ''), 10)
        if (!Number.isNaN(step) && step > 0) return pages.filter((_, i) => i % step === 0)
      } else if (pIdx.includes(',')) {
        const indices = pIdx
          .split(',')
          .map((s) => Number.parseInt(s.trim(), 10))
          .filter((n) => !Number.isNaN(n))
        return indices.map((idx) => pages[resolveIdx(idx)])
      } else if (pIdx.includes('-')) {
        const parts = pIdx.split('-').map((s) => Number.parseInt(s.trim(), 10))
        if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
          return pages.slice(resolveIdx(parts[0]), resolveIdx(parts[1]) + 1)
        }
      }
      return []
    }
  }
}

async function drawBase64Image(pdfDoc: PDFDocument, targetPages: PDFPage[], field: any, base64String: string) {
  const isJpeg = base64String.startsWith('data:image/jpeg') || base64String.startsWith('data:image/jpg')
  const b64 = base64String.replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
  const buffer = Buffer.from(b64, 'base64')
  const image = isJpeg ? await pdfDoc.embedJpg(buffer) : await pdfDoc.embedPng(buffer)
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

export async function resolveSigningContext(id: string, sessionToken: string, config: any) {
  let decodedToken: any
  try {
    decodedToken = jwt.verify(sessionToken, config.private.jwtSecret)
  } catch {
    throw new HTTPError({ statusCode: 401, statusMessage: 'Session expired or invalid.' })
  }
  if (decodedToken.documentId !== id) {
    throw new HTTPError({ statusCode: 403, statusMessage: 'Token id does not match this document id.' })
  }

  const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument
  const queueData = notionTextStringify(document.properties['Routing Queue']?.rich_text)
  const currentStatus = document.properties.Status.status.name

  if (!['Sent', 'Partially Signed'].includes(currentStatus)) {
    throw new HTTPError({ statusCode: 403, statusMessage: `Document is not accepting signatures (Status: ${currentStatus}).` })
  }

  const signers = JSON.parse(queueData) as SignerDetails[]
  const signerIndex = signers.findIndex((s) => s.email === decodedToken.signerEmail)
  if (signerIndex === -1) throw new HTTPError({ statusCode: 403, statusMessage: 'Signer not found in queue.' })

  const currentSigner = signers[signerIndex]
  if (currentSigner.status === 'SIGNED') throw new HTTPError({ statusCode: 409, statusMessage: 'Already signed.' })

  const baseTitle = notionTextStringify(document.properties.Name.title)
  const ext = mime.extension(document.properties['Mime Type'].select.name)
  const fileName = `${baseTitle}${currentSigner.order === 1 ? '' : '-' + (currentSigner.order - 1)}.${ext}`
  const currentFileName = `${baseTitle}-${currentSigner.order}.${ext}`
  const signedFileName = `${baseTitle}-signed.${ext}`

  return { document, signers, currentSigner, fileName, currentFileName, signedFileName }
}

export async function applyFieldStamps(pdfBuffer: Buffer, currentSigner: SignerDetails, signatureFields: any[], inputFields: any) {
  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const pages = pdfDoc.getPages()
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  pdfDoc.setProducer('MDoc')

  for (const field of signatureFields) {
    const targetPages = resolveTargetPages(field.pageIndex, pages)
    const textOptions = { font: helveticaFont, size: field.fontSize || 12, color: rgb(0, 0, 0) }

    switch (field.type) {
      case 'SIGNATURE':
      case 'INITIALS': {
        const imgVal = inputFields[field.id]
        if (field.required && !imgVal) throw new HTTPError({ statusCode: 400, statusMessage: `Image is required for field: ${field.id}` })
        if (imgVal && typeof imgVal === 'string') await drawBase64Image(pdfDoc, targetPages, field, imgVal)
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
        if (textVal && typeof textVal === 'string') drawCenteredText(targetPages, field, textVal, helveticaFont, textOptions)
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
  return pdfDoc
}

export async function finalizeAndPersist(
  fsStorage: any,
  id: string,
  targetFileName: string,
  signedBytes: Uint8Array | Buffer,
  signers: SignerDetails[],
  currentSigner: SignerDetails,
  telemetry?: any
) {
  const signerInArray = signers.find((s) => s.email === currentSigner.email)
  if (!signerInArray) {
    throw new HTTPError({ statusCode: 500, statusMessage: `Signer ${currentSigner.email} not found in routing queue.` })
  }
  signerInArray.status = 'SIGNED'
  signerInArray.signedAt = new Date().toISOString()
  signerInArray.telemetry = telemetry

  await fsStorage.setItemRaw(targetFileName, Buffer.from(signedBytes))

  const pendingSigners = signers.filter((s) => s.status === 'PENDING')
  const isCompleted = pendingSigners.length === 0
  const nextStatus = isCompleted ? 'Completed' : 'Partially Signed'
  const nextSigner = isCompleted ? null : pendingSigners[0]

  await notion.pages.update({
    page_id: id,
    properties: {
      Status: { status: { name: nextStatus } },
      'Routing Queue': { rich_text: [{ text: { content: JSON.stringify(signers) } }] },
      'Next Signer': { email: nextSigner?.email ?? null },
    },
  })
  return { id, documentStatus: nextStatus, currentSigner: signerInArray, nextSigner }
}
