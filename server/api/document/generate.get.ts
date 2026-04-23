export default defineEventHandler(() => {
  try {
    const templates = TEMPLATES.map((id) => ({
      id,
      label: templateRegistry[id].label,
      description: templateRegistry[id].description,
    }))

    return { templates }
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    console.error('API api/document/template GET', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
