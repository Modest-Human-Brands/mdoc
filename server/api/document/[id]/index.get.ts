/**
 * @file api/document/[id].get.ts
 */

export default defineEventHandler(async (event) => {
  try {
    // 1. Grab the ID from the route parameters (/api/document/uuid)
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Document ID is required',
      })
    }

    const fileStorage = useStorage('fs')

    // 2. Fetch all keys to find the one that matches our UUID
    // We do this because the key name is dynamic: "${template}__${id}.pdf.meta.json"
    const allKeys = await fileStorage.getKeys()
    const targetKey = allKeys.find((key) => key.includes(id) && key.endsWith('.meta.json'))

    if (!targetKey) {
      throw createError({
        statusCode: 404,
        statusMessage: `Document with ID ${id} not found`,
      })
    }

    // 3. Retrieve and return the specific metadata sidecar
    const document = await fileStorage.getItem<DocumentMeta>(targetKey)

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
