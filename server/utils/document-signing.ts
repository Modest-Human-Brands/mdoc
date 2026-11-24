import { HTTPError } from 'nitro/h3'
import * as mupdf from 'mupdf'
import { createCanvas } from '@napi-rs/canvas'
import mime from 'mime-types'
import type { NotionDocument } from '~/server/types'
import notion from '~/server/utils/notion'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import { cleanTelemetry, readQueue, sameEmail, toRichText, withDocumentLock, type SignerCertificate, type SignerDetails } from '~/server/utils/routing-queue'
import { readSessionToken } from '~/server/utils/session-token'
import { removeDocument, writeDocument } from '~/server/utils/documents'
import type { SignSession } from '~/server/utils/sign-sessions'
import { getTemplateOrThrow, requiredSignerOrders } from '~/server/utils/signer-requirements'

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

interface MuPDFAnnotation {
  setRect(rect: [number, number, number, number]): void
  setFlags(flags: number): void

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
  Image: new (data: Uint8Array | Buffer) => { getWidth(): number; getHeight(): number }
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

const error = (statusCode: number, statusMessage: string) => {
  const err = new HTTPError({ statusCode, statusMessage })
  err.stack = undefined
  return err
}

const SIGNABLE = new Set(['Sent', 'Partially Signed'])

/** Throws unless this signer may sign right now: document open, signer still pending, and (sequential) their turn. */
function assertCanSign(document: NotionDocument, signers: SignerDetails[], signerEmail: string) {
  const status = document.properties.Status.status.name
  if (!SIGNABLE.has(status)) throw error(403, `Document is not accepting signatures (Status: ${status}).`)

  const signer = signers.find((s) => sameEmail(s.email, signerEmail))
  if (!signer) throw error(403, 'Signer not found in queue.')
  if (signer.status === 'SIGNED') throw error(409, 'Already signed.')

  if (document.properties['Routing Type']?.select?.name === 'SEQUENTIAL' && !sameEmail(document.properties['Next Signer']?.email, signer.email)) {
    throw error(403, `It is not ${signer.email}'s turn to sign yet.`)
  }
  return signer
}

export async function resolveSigningContext(id: string, sessionToken: string, jwtSecret: string) {
  const decodedToken = readSessionToken(sessionToken, id, jwtSecret)

  const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument
  const signers = readQueue(document)
  const currentSigner = assertCanSign(document, signers, decodedToken.signerEmail)

  const templateDef = getTemplateOrThrow(document.properties['Template ID']?.select?.name)
  const allowedOrders = requiredSignerOrders(templateDef)
  if (signers.length !== allowedOrders.length || !allowedOrders.includes(currentSigner.order)) {
    throw error(409, `This envelope has ${signers.length} signer(s) but "${templateDef.label}" requires ${allowedOrders.length}. Recreate the envelope.`)
  }

  const baseTitle = notionTextStringify(document.properties.Name.title)
  const ext = mime.extension(document.properties['Mime Type'].select.name) || 'pdf'
  const fileName = `${baseTitle}${currentSigner.order === 1 ? '' : '-' + (currentSigner.order - 1)}.${ext}`
  const currentFileName = `${baseTitle}-${currentSigner.order}.${ext}`
  const signedFileName = `${baseTitle}-signed.${ext}`

  return { document, signers, currentSigner, fileName, currentFileName, signedFileName }
}

const MAX_SIGNATURE_BYTES = 1_000_000
const MAX_TEXT_FIELD = 200
const IMAGE_DATA_URL = /^data:image\/(png|jpeg);base64,([\w+/]+={0,2})$/
const MAGIC = { png: [0x89, 0x50, 0x4e, 0x47], jpeg: [0xff, 0xd8, 0xff] }

/** Only a bounded PNG or JPEG data URL reaches the PDF engine; anything else is a 400. */
function decodeSignatureImage(value: string | boolean, fieldId: string): Buffer {
  const match = typeof value === 'string' ? IMAGE_DATA_URL.exec(value) : null
  const bytes = match ? Buffer.from(match[2]!, 'base64') : undefined
  const type = match?.[1] as keyof typeof MAGIC | undefined
  if (!bytes || !type || bytes.length === 0 || bytes.length > MAX_SIGNATURE_BYTES || !MAGIC[type].every((byte, index) => bytes[index] === byte)) {
    throw new HTTPError({ statusCode: 400, statusMessage: `Field ${fieldId} must be a PNG or JPEG image under 1 MB.` })
  }
  return bytes
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
          // A signature is what the signer is committing to: it is required unless the template says otherwise.
          if (field.required !== false && !imgVal) throw new HTTPError({ statusCode: 400, statusMessage: `Image is required for field: ${field.id}` })
          if (imgVal) imgBuffer = decodeSignatureImage(imgVal, field.id)
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
            if (textVal.length > MAX_TEXT_FIELD) throw new HTTPError({ statusCode: 400, statusMessage: `Field ${field.id} is too long (max ${MAX_TEXT_FIELD} characters).` })
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

        const imgWidth = image.getWidth()
        const imgHeight = image.getHeight()

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

const notionUpdateWithRetry = async (params: Parameters<typeof notion.pages.update>[0], attempts = 3) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await notion.pages.update(params)
    } catch (error_) {
      if (attempt >= attempts) throw error_
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
    }
  }
}

/**
 * Records a finished signature. It re-reads the document instead of trusting what `prepare` saw, so a document
 * voided or advanced in between, or a signature replayed from an old session, is rejected rather than overwritten.
 * The signed file is removed again if the status cannot be saved, so the signer can simply retry.
 */
export function finalizeAndPersist(session: SignSession, signedBytes: Uint8Array | Buffer, certificate?: SignerCertificate) {
  return withDocumentLock(session.documentId, async () => {
    const document = (await notion.pages.retrieve({ page_id: session.documentId })) as unknown as NotionDocument
    const signers = readQueue(document)
    const signerInArray = assertCanSign(document, signers, session.signerEmail)

    const isCompleted = signers.filter((s) => s.status === 'PENDING').length === 1
    const targetFileName = isCompleted ? session.signedFileName : session.currentFileName

    signerInArray.status = 'SIGNED'
    signerInArray.signedAt = new Date().toISOString()
    signerInArray.telemetry = cleanTelemetry(session.telemetry)
    if (certificate) signerInArray.certificate = certificate

    const pendingSigner = signers.find((s) => s.status === 'PENDING')
    const nextStatus = isCompleted ? 'Completed' : 'Partially Signed'
    const nextSigner = pendingSigner ?? null

    await writeDocument(targetFileName, signedBytes)
    try {
      await notionUpdateWithRetry({
        page_id: session.documentId,
        properties: {
          Status: { status: { name: nextStatus } },
          'Routing Queue': { rich_text: toRichText(signers) },
          'Next Signer': { email: nextSigner?.email ?? null },
        },
      })
    } catch (error_) {
      await removeDocument(targetFileName).catch(() => {})
      console.error('[Sign] Could not save the signing state; the signed file was discarded.', error_)
      throw error(503, 'The signature could not be saved. Please try again.')
    }

    return { id: session.documentId, documentStatus: nextStatus, currentSigner: signerInArray, nextSigner }
  })
}

export { type SignerDetails } from '~/server/utils/routing-queue'
