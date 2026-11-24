import { defineErrorHandler } from 'nitro'

export default defineErrorHandler(async (error, event, opts) => {
  if (!new URL(event.req.url).pathname.startsWith('/api/') || !opts?.defaultHandler) return

  const { body, status, statusText, headers } = await opts.defaultHandler(error, event)
  const responseHeaders = new Headers(headers)
  responseHeaders.set('access-control-allow-origin', '*')
  responseHeaders.set('access-control-expose-headers', '*')

  return new Response(typeof body === 'string' ? body : JSON.stringify(body, null, 2), { status, statusText, headers: responseHeaders })
})
