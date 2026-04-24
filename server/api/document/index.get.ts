export default defineEventHandler(async () => {
  try {
    const documentStorage = useStorage('document')

    const allKeys = await documentStorage.getKeys()
    const metaKeys = allKeys.filter((key) => key.endsWith('.meta.json'))

    const documents = await Promise.all(metaKeys.map((key) => documentStorage.getItem<DocumentMeta>(key)))

    const documentsSorted = (documents.filter(Boolean) as DocumentMeta[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return documentsSorted
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
