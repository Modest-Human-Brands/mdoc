import { defineEventHandler, HTTPError } from 'nitro/h3'
import { templateRegistry } from '~/server/utils/template-registry'
import zodToJsonSchema from '~/server/utils/zod-to-json-schema'

import '~/templates/document/InternshipCompletionCertificateV1'
import '~/templates/document/QuotationV1'

export default defineEventHandler(() => {
  try {
    const templates = Object.values(templateRegistry).map((template) => ({
      id: template.id,
      variables: template.schema ? zodToJsonSchema(template.schema) : {},
    }))

    return templates
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    console.error('API api/document/template GET', error)

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
