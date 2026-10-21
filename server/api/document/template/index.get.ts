import { defineEventHandler, HTTPError } from 'nitro/h3'
import { templateRegistry } from '~/server/utils/template-registry'
import { readSampleManifest, sampleUrls } from '~/server/utils/sample-manifest'

import '~/templates/document'

export default defineEventHandler(async () => {
  try {
    const manifest = await readSampleManifest()

    return Object.values(templateRegistry).map((template) => ({
      id: template.id,
      label: template.label,
      shortLabel: template.shortLabel ?? template.label,
      category: template.category ?? null,
      description: template.description,
      sampleUrl: `/api/document/template/${template.id}/sample.pdf`,
      ...sampleUrls(template.id, manifest[template.id]),
    }))
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      error.stack = undefined
      throw error
    }

    console.error('document/template/index.get', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    serverError.stack = undefined
    throw serverError
  }
})
