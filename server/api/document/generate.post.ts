const NUXT_PRIVATE_DOC_RENDER_URL = process.env.NUXT_PRIVATE_DOC_RENDER_URL ?? 'http://doc-gotenberg:3000' //'http://localhost:4710'

export default defineEventHandler(async (event) => {
  const body = await readBody<RequestBody>(event)

  if (!(TEMPLATES as readonly string[]).includes(body?.template)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown template "${body?.template}". Valid: ${TEMPLATES.join(', ')}`,
    })
  }

  const html = await renderTemplate(body.template, body.data)

  const form = new FormData()
  form.append('files', new Blob([html], { type: 'text/html' }), 'index.html')

  const pdf = await $fetch<ArrayBuffer>('/forms/chromium/convert/html', {
    baseURL: NUXT_PRIVATE_DOC_RENDER_URL,
    method: 'POST',
    body: form,
    responseType: 'arrayBuffer',
  })

  setResponseHeader(event, 'Content-Type', 'application/pdf')
  setResponseHeader(event, 'Content-Disposition', `inline; filename="${body.template}.pdf"`)
  return Buffer.from(pdf)
})
