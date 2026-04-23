export default defineEventHandler(async () => {
  try {
    const fileStorage = useStorage('fs')

    const allKeys = await fileStorage.getKeys()
    const metaKeys = allKeys.filter((key) => key.endsWith('.meta.json'))

    const documents = await Promise.all(metaKeys.map((key) => fileStorage.getItem<DocumentMeta>(key)))

    const sorted = (documents.filter(Boolean) as DocumentMeta[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return { total: sorted.length, documents: sorted }
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    console.error('API document/index GET', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
