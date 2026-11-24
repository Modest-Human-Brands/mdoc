import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'
import { templateRegistry } from '~/server/utils/template-registry'
import { orgOf, termsFieldSchema } from '~/server/utils/terms-store'
import { parseSchemaToJsonSchema } from '~/server/utils/zod-to-json-schema'

import '~/templates/document'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw new HTTPError({
        statusCode: 400,
        statusMessage: 'Template ID is required',
      })
    }

    const template = templateRegistry[id]

    if (!template) {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: 'Template not found',
      })
    }

    const jsonSchema: Record<string, any> = template.schema ? parseSchemaToJsonSchema(template.schema, template.placeholders) : {}
    if (template.terms && jsonSchema.properties) {
      jsonSchema.properties.terms = await termsFieldSchema(orgOf(event), template, jsonSchema.properties.terms)
    }

    return {
      id: template.id,
      label: template.label,
      shortLabel: template.shortLabel ?? template.label,
      category: template.category ?? null,
      description: template.description,
      schema: jsonSchema,
      signerFields: template.signerFields,
    }
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      error.stack = undefined
      throw error
    }

    console.error('template/[id].get', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    serverError.stack = undefined
    throw serverError
  }
})
