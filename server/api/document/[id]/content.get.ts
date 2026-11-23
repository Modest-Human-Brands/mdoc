import { defineEventHandler, getRouterParam, getQuery, HTTPError } from 'nitro/h3'

import type { NotionDocument } from '~/server/types'
import notion from '~/server/utils/notion'
import { readDocument } from '~/server/utils/documents'
import { documentFiles, readLatestDocument } from '~/server/utils/document-file'
import { assertDocumentAccess } from '~/server/utils/document-access'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const toDownload = ['true', '1'].includes(String(getQuery(event).download))
    const requestType = getQuery(event).type

    if (!id) {
      throw new HTTPError({
        statusCode: 400,
        statusMessage: 'Missing document ID',
      })
    }

    const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument

    assertDocumentAccess(event, document)
    const { properties, created_time, last_edited_time } = document
    const files = documentFiles(document)

    if (requestType === 'image') {
      event.res.headers.set('Content-Type', 'image/png')
      event.res.headers.set('Content-Disposition', `inline; filename="${files.image}"`)

      const imageBuffer = await readDocument(files.image)

      if (!imageBuffer) {
        throw new HTTPError({
          statusCode: 404,
          statusMessage: `Preview image missing for document ID "${id}"`,
        })
      }

      return imageBuffer
    }

    const disposition = toDownload ? 'attachment' : 'inline'

    event.res.headers.set('Content-Type', properties['Mime Type'].select.name)
    event.res.headers.set('Content-Disposition', `${disposition}; filename="${files.target}"`)
    event.res.headers.set('X-Document-Id', id)
    event.res.headers.set('X-Document-Template', properties['Template ID'].select.name)
    event.res.headers.set('X-Document-Status', files.status)
    event.res.headers.set('X-Created-At', created_time)
    event.res.headers.set('X-Updated-At', last_edited_time)

    const pdfBuffer = await readLatestDocument(files)

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
