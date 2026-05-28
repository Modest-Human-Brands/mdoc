import { defineEventHandler, getRouterParam, getQuery, HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import type { DocumentMeta } from '~/server/types/templates'

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

    const fsStorage = useStorage('fs')
    const allKeys = await fsStorage.getKeys()
    const metaKey = allKeys.find((key) => key.endsWith('.meta.json') && key.includes(id))

    if (!metaKey) {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: `No document found with ID "${id}"`,
      })
    }

    const meta = await fsStorage.getItem<DocumentMeta>(metaKey)

    if (!meta) {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: `Metadata missing for document ID "${id}"`,
      })
    }

    const pdfBuffer = await fsStorage.getItemRaw<Buffer>(meta.fileName)

    if (!pdfBuffer) {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: `PDF file missing for document ID "${id}"`,
      })
    }

    const disposition = toDownload === undefined ? 'inline' : 'attachment'

    event.res.headers.set('Content-Type', 'application/pdf')
    event.res.headers.set('Content-Disposition', `${disposition}; filename="${meta.fileName}"`)

    event.res.headers.set('X-Document-Id', meta.id)
    event.res.headers.set('X-Document-Template', meta.templateId)
    event.res.headers.set('X-Created-At', meta.createdAt)

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
