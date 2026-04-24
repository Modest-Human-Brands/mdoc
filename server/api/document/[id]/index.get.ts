export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Document ID is required',
      })
    }

    const documentStorage = useStorage('document')

    const allKeys = await documentStorage.getKeys()
    const targetKey = allKeys.find((key) => key.includes(id) && key.endsWith('.meta.json'))

    if (!targetKey) {
      throw createError({
        statusCode: 404,
        statusMessage: `Document with ID ${id} not found`,
      })
    }

    const document = await documentStorage.getItem<DocumentMeta>(targetKey)

    if (!document) {
      throw createError({
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

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    })
  }
})
