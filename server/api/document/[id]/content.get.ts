import { defineEventHandler, getRouterParam, getQuery, HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import mime from 'mime-types'

import type { NotionDocument } from '~/server/types'
import notion from '~/server/utils/notion'
import notionTextStringify from '~/server/utils/notion-text-stringify'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const toDownload = getQuery(event).download

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
          // Fallback to baseline if queue fails to parse
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

    const fsStorage = useStorage('fs')
    let pdfBuffer = await fsStorage.getItemRaw<Buffer>(targetFileName)

    if (!pdfBuffer && targetFileName !== `${baseTitle}.${ext}`) {
      console.warn(`Target file "${targetFileName}" missing, falling back to baseline "${baseTitle}.${ext}"`)
      pdfBuffer = await fsStorage.getItemRaw<Buffer>(`${baseTitle}.${ext}`)
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
      throw error
    }

    console.error('API document/[id] GET', error)

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
