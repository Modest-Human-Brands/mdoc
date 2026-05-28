import { defineEventHandler, HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import type { DocumentMeta } from '~/server/types/templates'

export default defineEventHandler(async () => {
  try {
    const fsStorage = useStorage('fs')
    const allKeys = await fsStorage.getKeys()
    const metaKeys = allKeys.filter((key) => key.endsWith('.meta.json'))

    const documents = await Promise.all(metaKeys.map((key) => fsStorage.getItem<DocumentMeta>(key)))

    const documentsSorted = (documents.filter(Boolean) as DocumentMeta[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return documentsSorted
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    console.error('API document/index GET', error)

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
