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

    const documentStorage = useStorage('document')

    const [templateDesign, font] = await Promise.all([documentStorage.getItem<Template>(`template:${template}-v1.json`), loadFonts(documentStorage)])

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

    const meta: DocumentMeta = {
      id,
      template,
      label: templateRegistry[template].label,
      fileName,
      createdAt: new Date().toISOString(),
    }

    await fileStorage.setItem(`${fileName}.meta.json`, meta)

    return meta
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    console.error('API api/document/template POST', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
