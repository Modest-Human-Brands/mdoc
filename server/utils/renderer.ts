export async function renderTemplate(template: TemplateName, payload: TemplatePayload): Promise<string> {
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64')

  const html = await $fetch<string>(`/render/${template}`, {
    query: { payload: payloadEncoded },
  })

  return html
}
