import { HTTPError } from 'nitro/h3'
import * as mupdf from 'mupdf'
import { createCanvas } from '@napi-rs/canvas'
import jwt, { type JwtPayload } from 'jsonwebtoken'
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
  ltIdx?: number
  gtIdx?: number
  signerInfoDerHex?: string
  certificateDerHex?: string
  certificateChainDerHex?: string[]
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

export interface SignatureField {
  id: string
  type: string
  pageIndex?: number | string | number[]
  x: number
  y: number
  width: number
  height: number
  required?: boolean
  fontSize?: number
}

export interface AppConfig {
  private: {
    jwtSecret: string
  }
}

export interface StorageEngine {
  setItemRaw(key: string, value: Buffer): Promise<void>
}

interface MuPDFAnnotation {
  setRect(rect: [number, number, number, number]): void
  setFlags(flags: number): void
  // setStampImage scales the image to fit whatever Rect was set via setRect() —
  // this is the correct API for "drop an image into a Stamp annotation".
  // setAppearance(appearance, state, transform, bbox, resources, contents) is a
  // different, lower-level primitive for hand-built content streams; it is NOT
  // an (image, matrix) API despite the similar-looking call shape.
  setStampImage(image: unknown): void
  update(): void
}

interface MuPDFPage {
  getBounds(): [number, number, number, number]
  createAnnotation(type: string): MuPDFAnnotation
}

interface MuPDFBuffer {
  asUint8Array(): Uint8Array
}

interface MuPDFPdfDoc {
  countPages(): number
  loadPage(index: number): MuPDFPage
  saveToBuffer(options: string): MuPDFBuffer
}

interface MuPDFDoc {
  asPDF(): MuPDFPdfDoc
}

interface IMuPDF {
  Document: { openDocument(data: Uint8Array | Buffer, magic: string): MuPDFDoc }
  Image: new (data: Uint8Array | Buffer) => unknown
}

const mupdfLib = mupdf as unknown as IMuPDF

function resolveTargetPageIndices(pIdx: string | number | number[], totalPages: number): number[] {
  const resolveIdx = (idx: number) => {
    if (idx < 0) return totalPages + idx
    if (idx >= totalPages && idx > 0) return Math.min(idx - 1, totalPages - 1)
    return idx
  }

  if (typeof pIdx === 'number') return [resolveIdx(pIdx)]
  if (Array.isArray(pIdx)) return pIdx.map((element) => resolveIdx(element))
  if (typeof pIdx !== 'string') return []

  const allIndices = Array.from({ length: totalPages }, (_, i) => i)

  switch (pIdx) {
    case 'all': {
      return allIndices
    }
    case 'all-except-last': {
      return allIndices.slice(0, -1)
    }
    case 'odd': {
      return allIndices.filter((_, i) => i % 2 === 0)
    }
    case 'even': {
      return allIndices.filter((_, i) => i % 2 !== 0)
    }
    default: {
      if (pIdx.startsWith('*/')) {
        const step = Number.parseInt(pIdx.replace('*/', ''), 10)
        if (!Number.isNaN(step) && step > 0) return allIndices.filter((_, i) => i % step === 0)
      } else if (pIdx.includes(',')) {
        const indices = pIdx
          .split(',')
          .map((s) => Number.parseInt(s.trim(), 10))
          .filter((n) => !Number.isNaN(n))
        return indices.map((element) => resolveIdx(element))
      } else if (pIdx.includes('-')) {
        const parts = pIdx.split('-').map((s) => Number.parseInt(s.trim(), 10))
        if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
          return allIndices.slice(resolveIdx(parts[0]), resolveIdx(parts[1]) + 1)
        }
      }
      return []
    }
  }
}

function createTextImage(text: string, width: number, height: number, fontSize: number, isBold: boolean = false): Buffer {
  const w = Math.max(width, 1)
  const h = Math.max(height, 1)
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')

  ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px Helvetica, Arial, sans-serif`
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, w / 2, h / 2)

  return canvas.toBuffer('image/png')
}

export async function resolveSigningContext(id: string, sessionToken: string, jwtSecret: string) {
  let decodedToken: JwtPayload & { documentId?: string; signerEmail?: string }
  try {
    decodedToken = jwt.verify(sessionToken, jwtSecret) as JwtPayload & { documentId?: string; signerEmail?: string }
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
  if (currentSigner?.status === 'SIGNED') throw new HTTPError({ statusCode: 409, statusMessage: 'Already signed.' })

  const baseTitle = notionTextStringify(document.properties.Name.title)
  const ext = mime.extension(document.properties['Mime Type'].select.name) || 'pdf'
  const fileName = `${baseTitle}${currentSigner!.order === 1 ? '' : '-' + (currentSigner!.order - 1)}.${ext}`
  const currentFileName = `${baseTitle}-${currentSigner!.order}.${ext}`
  const signedFileName = `${baseTitle}-signed.${ext}`

  return { document, signers, currentSigner: currentSigner!, fileName, currentFileName, signedFileName }
}

export function applyFieldStamps(
  pdfBuffer: Buffer,
  currentSigner: SignerDetails,
  signatureFields: SignatureField[],
  inputFields: Record<string, string | boolean | undefined>,
  isFirstSigner: boolean = false
): Buffer {
  const doc = mupdfLib.Document.openDocument(pdfBuffer, 'application/pdf')
  const pdfDoc = doc.asPDF()
  const totalPages = pdfDoc.countPages()

  for (const field of signatureFields) {
    const targetIndices = resolveTargetPageIndices(field.pageIndex ?? -1, totalPages)
    let imgBuffer: Buffer | null = null

    try {
      switch (field.type) {
        case 'SIGNATURE':
        case 'INITIALS': {
          const imgVal = inputFields[field.id]
          if (field.required && !imgVal) throw new HTTPError({ statusCode: 400, statusMessage: `Image is required for field: ${field.id}` })
          if (imgVal && typeof imgVal === 'string') {
            const b64 = imgVal.replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
            imgBuffer = Buffer.from(b64, 'base64')
          }
          break
        }
        case 'DATE': {
          const text = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
          imgBuffer = createTextImage(text, field.width, field.height, field.fontSize || 12, false)
          break
        }
        case 'NAME': {
          imgBuffer = createTextImage(currentSigner.name, field.width, field.height, field.fontSize || 12, true)
          break
        }
        case 'EMAIL': {
          imgBuffer = createTextImage(currentSigner.email, field.width, field.height, field.fontSize || 12, false)
          break
        }
        case 'TEXT': {
          const textVal = inputFields[field.id]
          if (field.required && !textVal) throw new HTTPError({ statusCode: 400, statusMessage: `Field ${field.id} is required.` })
          if (textVal && typeof textVal === 'string') {
            imgBuffer = createTextImage(textVal, field.width, field.height, field.fontSize || 12, false)
          }
          break
        }
        case 'CHECKBOX': {
          const isChecked = inputFields[field.id]
          if (field.required && !isChecked) throw new HTTPError({ statusCode: 400, statusMessage: `Checkbox ${field.id} must be checked.` })
          if (isChecked === true) {
            const checkSize = field.height * 0.8
            imgBuffer = createTextImage('X', field.width, field.height, checkSize, true)
          }
          break
        }
      }
    } catch (error_) {
      console.error(`[Stamp - CANVAS CRASH] Failed to create image for ${field.id}:`, error_)
      throw error_
    }

    if (imgBuffer) {
      for (const pageIdx of targetIndices) {
        const page = pdfDoc.loadPage(pageIdx)
        const bounds = page.getBounds()
        const pageHeight = bounds[3] - bounds[1]

        const annot = page.createAnnotation('Stamp')
        annot.setFlags(4 | 128 | 512)

        const image = new mupdfLib.Image(imgBuffer)

        const imgWidth = typeof image.getWidth === 'function' ? image.getWidth() : (image as any).width
        const imgHeight = typeof image.getHeight === 'function' ? image.getHeight() : (image as any).height

        const imgRatio = imgWidth / imgHeight
        const fieldRatio = field.width / field.height

        let fitWidth = field.width
        let fitHeight = field.height

        if (imgRatio > fieldRatio) {
          fitHeight = field.width / imgRatio
        } else {
          fitWidth = field.height * imgRatio
        }

        const offsetX = field.x + (field.width - fitWidth) / 2
        const offsetY = field.y + (field.height - fitHeight) / 2

        const rect: [number, number, number, number] = [offsetX, pageHeight - offsetY - fitHeight, offsetX + fitWidth, pageHeight - offsetY]

        annot.setRect(rect)
        annot.setStampImage(image)

        annot.update()

        if (typeof (page as any).update === 'function') {
          ;(page as any).update()
        }
      }
    }
  }

  const saveOpts = isFirstSigner ? 'clean,decompress' : 'incremental'
  const outBytes = pdfDoc.saveToBuffer(saveOpts).asUint8Array()

  return Buffer.from(outBytes)
}

export async function finalizeAndPersist(
  fsStorage: StorageEngine,
  id: string,
  targetFileName: string,
  signedBytes: Uint8Array | Buffer,
  signers: SignerDetails[],
  currentSigner: SignerDetails,
  telemetry?: { ipAddress?: string; userAgent?: string }
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
