export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const toDownload = getQuery(event).download

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing document ID',
      })
    }

    const fsStorage = useStorage('fs')
    const allKeys = await fsStorage.getKeys()
    const metaKey = allKeys.find((key) => key.endsWith('.meta.json') && key.includes(id))

    if (!metaKey) {
      throw createError({
        statusCode: 404,
        statusMessage: `No document found with ID "${id}"`,
      })
    }

    const meta = await fsStorage.getItem<DocumentMeta>(metaKey)

    if (!meta) {
      throw createError({
        statusCode: 404,
        statusMessage: `Metadata missing for document ID "${id}"`,
      })
    }

    const pdfBuffer = await fsStorage.getItemRaw<Buffer>(meta.fileName)

    if (!pdfBuffer) {
      throw createError({
        statusCode: 404,
        statusMessage: `PDF file missing for document ID "${id}"`,
      })
    }

    const disposition = toDownload !== undefined ? 'attachment' : 'inline'

    setResponseHeader(event, 'Content-Type', 'application/pdf')
    setResponseHeader(event, 'Content-Disposition', `${disposition}; filename="${meta.fileName}"`)

    setResponseHeader(event, 'X-Document-Id', meta.id)
    setResponseHeader(event, 'X-Document-Template', meta.templateId)
    setResponseHeader(event, 'X-Created-At', meta.createdAt)

    return pdfBuffer
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    console.error('API document/[id] GET', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
