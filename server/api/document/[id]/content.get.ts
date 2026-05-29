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

    const { properties, created_time, last_edited_time } = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument

    const disposition = toDownload === undefined ? 'inline' : 'attachment'

    event.res.headers.set('Content-Type', properties['Mime Type'].select.name)
    event.res.headers.set('Content-Disposition', `${disposition}; filename="${notionTextStringify(properties.Name.title)}"`)
    event.res.headers.set('X-Document-Id', id)
    event.res.headers.set('X-Document-Template', properties['Template ID'].select.name)
    event.res.headers.set('X-Created-At', created_time)
    event.res.headers.set('X-Updated-At', last_edited_time)

    const fsStorage = useStorage('fs')

    const pdfBuffer = await fsStorage.getItemRaw<Buffer>(`${notionTextStringify(properties.Name.title)}.${mime.extension(properties['Mime Type'].select.name)}`)

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
