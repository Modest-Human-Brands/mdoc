import { defineEventHandler, getRouterParam, HTTPError, readValidatedBody } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import { z } from 'zod'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import mime from 'mime-types'

import notion from '~/server/utils/notion'
import type { NotionDocument } from '~/server/types'
import notionTextStringify from '~/server/utils/notion-text-stringify'

const voidSchema = z.object({
  reason: z.string().min(5, 'A reason must be provided to void the document.'),
})

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw new HTTPError({ statusCode: 400, statusMessage: 'Document ID is required' })

    const fsStorage = useStorage('fs')
    const { reason } = await readValidatedBody(event, voidSchema)

    const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument
    const currentStatus = document.properties.Status.status.name

    if (['Completed', 'Voided'].includes(currentStatus)) {
      throw new HTTPError({
        statusCode: 403,
        statusMessage: `Cannot void a document that is already ${currentStatus}.`,
      })
    }

    const queueData = notionTextStringify(document.properties['Routing Queue']?.rich_text)
    const signers = JSON.parse(queueData)

    const pendingSigner = signers.find((s: any) => s.status === 'PENDING')
    const currentSigner = pendingSigner

    const baseTitle = notionTextStringify(document.properties.Name.title)
    const ext = mime.extension(document.properties['Mime Type'].select.name)

    const currentFileName = currentSigner ? `${baseTitle}${currentSigner.order === 1 ? '' : '-' + (currentSigner.order - 1)}.${ext}` : `${baseTitle}.${ext}`
    const voidedFileName = `${baseTitle}-voided.${ext}`

    const pdfBuffer = await fsStorage.getItemRaw<Buffer>(currentFileName)
    if (!pdfBuffer) {
      throw new HTTPError({ statusCode: 404, statusMessage: 'Original PDF file missing from storage.' })
    }

    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pages = pdfDoc.getPages()
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    for (const page of pages) {
      const { width, height } = page.getSize()
      const text = 'VOID'
      const textSize = 150
      const textWidth = helveticaBold.widthOfTextAtSize(text, textSize)
      const textHeight = helveticaBold.heightAtSize(textSize)

      page.drawText(text, {
        x: width / 2 - textWidth / 2,
        y: height / 2 - textHeight / 2,
        size: textSize,
        font: helveticaBold,
        color: rgb(1, 0, 0),
        opacity: 0.3,
        rotate: degrees(45),
      })

      page.drawText(`Void Reason: ${reason}`, {
        x: 80,
        y: 30,
        size: 12,
        font: helveticaBold,
        color: rgb(1, 0, 0),
      })
    }

    const voidedPdfBytes = await pdfDoc.save()

    await fsStorage.setItemRaw(voidedFileName, Buffer.from(voidedPdfBytes))
    await fsStorage.removeItem(currentFileName).catch(() => {})

    const updatedSigners = signers.map((s: any) => {
      if (s.status === 'PENDING') return { ...s, status: 'CANCELLED' }
      return s
    })

    await notion.pages.update({
      page_id: id,
      properties: {
        Status: { status: { name: 'Void' } },
        'Routing Queue': { rich_text: [{ text: { content: JSON.stringify(updatedSigners) } }] },
        'Next Signer': { email: null },
      },
    })

    return {
      documentStatus: 'Voided',
      fileName: voidedFileName,
    }
  } catch (error: any) {
    console.error(`API /document/id/void POST`, error)
    if (error instanceof z.ZodError) throw new HTTPError({ statusCode: 400, statusMessage: 'Invalid payload', data: error.errors })
    if (error instanceof HTTPError) throw error
    throw new HTTPError({ statusCode: 500, statusMessage: 'Failed to void document' })
  }
})
