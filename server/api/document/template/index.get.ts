import { defineEventHandler, HTTPError } from 'nitro/h3'
import { templateRegistry } from '~/server/utils/template-registry'
import zodToJsonSchema from '~/server/utils/zod-to-json-schema'

import '~/templates/document'

export default defineEventHandler(() => {
  try {
    const templates = Object.values(templateRegistry).map((template) => ({
      id: template.id,
      variables: template.schema ? zodToJsonSchema(template.schema) : {},
      signerFields: template.signerFields,
    }))

    return templates
  } catch (error: unknown) {
    console.error('API /document/template/index GET', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
