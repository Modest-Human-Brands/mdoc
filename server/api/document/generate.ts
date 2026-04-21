export async function bundlePdfAssets(html: string, baseURL: string) {
  const assetMap = new Map<string, ArrayBuffer>()
  let processedHtml = html

  // 1. STRIP ALL SCRIPTS IMMEDIATELY
  // Nuxt Dev scripts will always trigger the "denied list" or 426 errors.
  processedHtml = processedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // 2. INLINE ALL CSS
  // Improved Regex: Matches <link> tags that contain ".css" in the href
  const linkRegex = /<link\b[^>]+>/gi
  const hrefRegex = /href=["']([^"']+\.css(?:\?[^"']*)?)["']/

  const links = html.match(linkRegex) || []

  for (const fullTag of links) {
    const hrefMatch = fullTag.match(hrefRegex)
    if (hrefMatch) {
      const relativePath = hrefMatch[1]!
      try {
        // We fetch with ?inline to get the raw CSS from Vite/Nuxt
        const cssContent = await $fetch<string>(relativePath, {
          baseURL,
          query: { inline: true },
        })

        // Use a split/join replacement to avoid Regex character escaping issues
        processedHtml = processedHtml.split(fullTag).join(`<style>${cssContent}</style>`)
      } catch {
        console.warn(`Could not inline CSS: ${relativePath}`)
        // Remove the tag anyway so Gotenberg doesn't try to fetch it
        processedHtml = processedHtml.split(fullTag).join('')
      }
    } else {
      // It's a link tag but not CSS (like favicon), remove it
      processedHtml = processedHtml.split(fullTag).join('')
    }
  }

  // 3. BUNDLE IMAGES
  // Standard images (src)
  const imageRegex = /src=["'](\/(?!\/)[^"']+\.(?:png|jpg|jpeg|svg|webp|gif))["']/gi
  let imgMatch
  while ((imgMatch = imageRegex.exec(html)) !== null) {
    const relativePath = imgMatch[1]!
    const fileName = relativePath.split('/').pop()!

    try {
      const response = await $fetch<ArrayBuffer>(relativePath, {
        baseURL,
        responseType: 'arrayBuffer',
      })
      assetMap.set(fileName, response)
      // Replace path with just the filename for Gotenberg's local resolution
      processedHtml = processedHtml.split(relativePath).join(fileName)
    } catch {
      console.warn(`Could not bundle image: ${relativePath}`)
    }
  }

  // 4. FINAL CLEANUP
  // Remove any remaining relative hrefs (like favicons) that would trigger warnings
  processedHtml = processedHtml.replace(/<link\b[^>]+rel=["']icon["'][^>]+>/gi, '')

  return { processedHtml, assetMap }
}

export default defineEventHandler(async (event) => {
  try {
    const NUXT_PRIVATE_DOC_URL = 'http://localhost:3001'
    const NUXT_PRIVATE_DOC_RENDER_URL = 'http://localhost:4710'

    // const NUXT_PRIVATE_DOC_URL = "http://doc:3000"
    // const NUXT_PRIVATE_DOC_RENDER_URL = "http://doc-gotenberg:3000"

    const pdfHtml = await $fetch<string>('/template/quotation')

    const { processedHtml, assetMap } = await bundlePdfAssets(pdfHtml, NUXT_PRIVATE_DOC_URL)

    const formdata = new FormData()

    const htmlBlob = new Blob([processedHtml], { type: 'text/html' })
    formdata.append('files', htmlBlob, 'index.html')

    for (const [fileName, content] of assetMap) {
      formdata.append('files', new Blob([content]), fileName)
    }

    const pdfBuffer = await $fetch<ArrayBuffer>('/forms/chromium/convert/html', {
      baseURL: NUXT_PRIVATE_DOC_RENDER_URL,
      method: 'POST',
      body: formdata,
      responseType: 'arrayBuffer',
    })

    setResponseHeader(event, 'Content-Type', 'application/pdf')
    setResponseHeader(event, 'Content-Disposition', 'inline; filename="quotation.pdf"')

    return Buffer.from(pdfBuffer)
  } catch (error: unknown) {
    console.error('PDF Generation Error:', (error as { message: string }).message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate PDF',
    })
  }
})
