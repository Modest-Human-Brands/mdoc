import type { Template } from '@pdfme/common'
import { text, image } from '@pdfme/schemas'
import { generate } from '@pdfme/generator'
import { randomUUID } from 'uncrypto'

export default defineEventHandler(async (event) => {
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

  // ── Persist to static storage ─────────────────────────────────────────────
  const id = randomUUID()
  const fileName = `${template}__${id}.pdf`
  const fileStorage = useStorage('fs')

  await fileStorage.setItemRaw(fileName, Buffer.from(pdf))

  // Store a small metadata sidecar so the listing endpoint is rich
  await fileStorage.setItem(`${fileName}.meta.json`, {
    id,
    template,
    label: templateRegistry[template].label,
    fileName,
    createdAt: new Date().toISOString(),
  } satisfies DocumentMeta)

  setResponseHeader(event, 'Content-Type', 'application/pdf')
  setResponseHeader(event, 'Content-Disposition', `inline; filename="${fileName}"`)
  return Buffer.from(pdf)
})
