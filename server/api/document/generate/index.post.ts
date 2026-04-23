import type { Template } from '@pdfme/common'
import { text, image } from '@pdfme/schemas'
import { generate } from '@pdfme/generator'
import { randomUUID } from 'uncrypto'

export default defineEventHandler(async (event) => {
  try {
    const { data, template } = await readBody<RequestBody>(event)

    if (!(TEMPLATES as readonly string[]).includes(template)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Unknown template "${template}". Valid: ${TEMPLATES.join(', ')}`,
      })
    }

    const assetStorage = useStorage('asset')

    const [templateDesign, font] = await Promise.all([assetStorage.getItem<Template>(`template:${template}-v1.json`), loadFonts(assetStorage)])

    if (!templateDesign) {
      throw createError({
        statusCode: 500,
        statusMessage: `Template design asset not found for "${template}"`,
      })
    }

    const inputs = templateRegistry[template].buildInputs(data)

    const pdf = await generate({
      template: templateDesign,
      inputs,
      plugins: { text, image },
      options: { font },
    })

    const id = randomUUID()
    const fileName = `${template}__${id}.pdf`
    const fileStorage = useStorage('fs')

    await fileStorage.setItemRaw(fileName, Buffer.from(pdf))

    await fileStorage.setItem(`${fileName}.meta.json`, {
      id,
      template,
      label: templateRegistry[template].label,
      fileName,
      createdAt: new Date().toISOString(),
    } satisfies DocumentMeta)

    // Create the metadata object
    const meta: DocumentMeta = {
      id,
      template,
      label: templateRegistry[template].label,
      fileName,
      createdAt: new Date().toISOString(),
    }

    // Store the metadata sidecar
    await fileStorage.setItem(`${fileName}.meta.json`, meta)

    // ── Response ─────────────────────────────────────────────────────────────
    // We no longer set PDF headers here because we are returning JSON
    return meta
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    console.error('API api/document/generate POST', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
