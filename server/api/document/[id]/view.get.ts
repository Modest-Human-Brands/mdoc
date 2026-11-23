import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'

import type { NotionDocument } from '~/server/types'
import notion from '~/server/utils/notion'
import { NOTION_ID } from '~/server/utils/notion-errors'
import { documentFiles, readLatestDocument } from '~/server/utils/document-file'

/**
 * Public, read-only link to a document, and the default destination of every QR code on it.
 * It needs no headers: the unguessable document id is the capability. It only ever serves
 * the document's PDF (the latest signed copy once signing has started), never its data.
 */
export default defineEventHandler(async (event) => {
  const notFound = () => {
    const error = new HTTPError({ statusCode: 404, statusMessage: 'Document not found' })
    error.stack = undefined
    return error
  }

  try {
    const id = getRouterParam(event, 'id')
    if (!id || !NOTION_ID.test(id)) throw notFound()

    const document = (await notion.pages.retrieve({ page_id: id }).catch(() => undefined)) as unknown as NotionDocument | undefined
    const properties = document?.properties
    if (!document || !properties?.['Template ID']?.select?.name || !properties['Mime Type']?.select?.name || !properties.Name?.title) throw notFound()

    const files = documentFiles(document)
    const pdf = await readLatestDocument(files)
    if (!pdf) throw notFound()

    event.res.headers.set('Content-Type', properties['Mime Type'].select.name)
    event.res.headers.set('Content-Disposition', `inline; filename="${files.target.replace(/"/g, '')}"`)
    event.res.headers.set('Cache-Control', 'private, max-age=60')
    event.res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return pdf
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      error.stack = undefined
      throw error
    }

    console.error('document/[id]/view GET', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    serverError.stack = undefined
    throw serverError
  }
})
