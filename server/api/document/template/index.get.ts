import { defineEventHandler } from 'nitro/h3'
import { templateRegistry } from '~/server/utils/template-registry'
import { handleApiError } from '~/server/utils/api-error'
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
    return handleApiError(error, 'document/template/index.get')
  }
})
