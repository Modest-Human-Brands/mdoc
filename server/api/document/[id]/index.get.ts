import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import type { DocumentMeta } from '~/server/types/templates'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw new HTTPError({
        statusCode: 400,
        statusMessage: 'Document ID is required',
      })
    }

    const fsStorage = useStorage('fs')
    const allKeys = await fsStorage.getKeys()
    const targetKey = allKeys.find((key) => key.includes(id) && key.endsWith('.meta.json'))

    if (!targetKey) {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: `Document with ID ${id} not found`,
      })
    }

    const document = await fsStorage.getItem<DocumentMeta>(targetKey)

    if (!document) {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: 'Metadata file is empty or corrupted',
      })
    }

    return document
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    console.error(`API document/[id] GET for ${getRouterParam(event, 'id')}`, error)

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    })
  }
})
