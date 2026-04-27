import type { Template } from '@pdfme/common'
import { text, image } from '@pdfme/schemas'
import { generate } from '@pdfme/generator'
// import { pdf2img } from '@pdfme/converter';
import { randomUUID } from 'uncrypto'
import { TEMPLATES } from '~~/shared/types/templates'

export default defineEventHandler(async (event) => {
  try {
    const { data, template } = await readBody<RequestBody>(event)

    if (!(TEMPLATES as readonly string[]).includes(template)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Unknown template "${template}"`,
      })
    }

    const documentStorage = useStorage('document')
    const fileStorage = useStorage('fs')

    const [templateDesign, font] = await Promise.all([documentStorage.getItem<Template>(`template:${template}-v1.json`), loadFonts(documentStorage)])

    if (!templateDesign) {
      throw createError({ statusCode: 500, statusMessage: 'Template not found' })
    }

    const pdfUint8Array = await generate({
      template: templateDesign,
      inputs: templateRegistry[template].buildInputs(data),
      plugins: { text, image },
      options: { font },
    })

    const pdfBuffer = Buffer.from(pdfUint8Array)
    const id = randomUUID()
    const baseFileName = `${template}__${id}`
    const pdfFileName = `${baseFileName}.pdf`
    const imgFileName = `${baseFileName}.png`

    // const imgData = await pdf2img(pdfBuffer, {
    //   imageType: 'jpeg',
    //   scale: 1,
    //   range: { start: 0, end: 1 },
    // })

    await Promise.all([
      fileStorage.setItemRaw(pdfFileName, pdfBuffer),
      // fileStorage.setItemRaw(imgFileName, Buffer.from(imgData[0]!)),
    ])

    const meta: DocumentMeta = {
      id,
      name: templateRegistry[template].label,
      fileName: pdfFileName,
      extension: 'pdf',
      sizeBytes: pdfBuffer.byteLength,
      templateId: template,
      previewUrl: `/api/documents/preview/${imgFileName}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await fileStorage.setItem(`${pdfFileName}.meta.json`, meta)

    return meta
  } catch (error: unknown) {
    console.error('Document Generation Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate document and preview',
    })
  }
})
