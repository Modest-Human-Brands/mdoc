import { defineEventHandler, getRouterParam, getQuery, HTTPError } from 'nitro/h3'
import mime from 'mime-types'

import type { NotionDocument } from '~/server/types'
import notion from '~/server/utils/notion'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import { readDocument } from '~/server/utils/documents'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const toDownload = getQuery(event).download
    const requestType = getQuery(event).type

    if (!id) {
      throw new HTTPError({
        statusCode: 400,
        statusMessage: 'Missing document ID',
      })
    }

    const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument
    const { properties, created_time, last_edited_time } = document

    const baseTitle = notionTextStringify(properties.Name.title)
    const ext = mime.extension(properties['Mime Type'].select.name) || 'pdf'
    const currentStatus = properties.Status?.status?.name

    if (requestType === 'image') {
      const imageFileName = `${baseTitle}.png`

      event.res.headers.set('Content-Type', 'image/png')
      event.res.headers.set('Content-Disposition', `inline; filename="${imageFileName}"`)

      const imageBuffer = await readDocument(imageFileName)

      if (!imageBuffer) {
        throw new HTTPError({
          statusCode: 404,
          statusMessage: `Preview image missing for document ID "${id}"`,
        })
      }

      return imageBuffer
    }

    let targetFileName = `${baseTitle}.${ext}`

    if (currentStatus === 'Completed') {
      targetFileName = `${baseTitle}-signed.${ext}`
    } else if (currentStatus === 'Partially Signed') {
      const queueRaw = notionTextStringify(properties['Routing Queue']?.rich_text)
      if (queueRaw) {
        try {
          const signers = JSON.parse(queueRaw)
          const signedOrders = signers.filter((s: any) => s.status === 'SIGNED').map((s: any) => s.order)

          if (signedOrders.length > 0) {
            const maxSignedOrder = Math.max(...signedOrders)
            targetFileName = `${baseTitle}-${maxSignedOrder}.${ext}`
          }
        } catch {
          console.warn('Routing queue could not be parsed; serving the baseline file')
        }
      }
    }

    const disposition = toDownload === undefined ? 'inline' : 'attachment'

    event.res.headers.set('Content-Type', properties['Mime Type'].select.name)
    event.res.headers.set('Content-Disposition', `${disposition}; filename="${targetFileName}"`)
    event.res.headers.set('X-Document-Id', id)
    event.res.headers.set('X-Document-Template', properties['Template ID'].select.name)
    event.res.headers.set('X-Document-Status', currentStatus)
    event.res.headers.set('X-Created-At', created_time)
    event.res.headers.set('X-Updated-At', last_edited_time)

    let pdfBuffer = await readDocument(targetFileName)

    if (!pdfBuffer && targetFileName !== `${baseTitle}.${ext}`) {
      console.warn(`Target file "${targetFileName}" missing, falling back to baseline "${baseTitle}.${ext}"`)
      pdfBuffer = await readDocument(`${baseTitle}.${ext}`)
    }

    if (!pdfBuffer) {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: `PDF file missing for document ID "${id}"`,
      })
    }

    return pdfBuffer
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      error.stack = undefined
      throw error
    }

    console.error('document/[id]/content GET', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    serverError.stack = undefined
    throw serverError
  }
})
