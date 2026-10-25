import { timingSafeEqual } from 'node:crypto'
import { defineEventHandler, getHeader, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

const PUBLIC_GET = [/^\/api\/health$/, /^\/api\/document\/template\/[^/]+\/sample\/\d+\.png$/, /^\/api\/decor\/(builtin|upload)\/[^/]+$/]

const matches = (provided: string, expected: string) => {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export default defineEventHandler((event) => {
  const { pathname } = event.url
  if (!pathname.startsWith('/api/') || event.req.method === 'OPTIONS') return
  if (event.req.method === 'GET' && PUBLIC_GET.some((pattern) => pattern.test(pathname))) return

  const apiKey = useRuntimeConfig().private.apiKey as string
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      const misconfigured = new HTTPError({ statusCode: 500, statusMessage: 'API key is not configured.' })
      misconfigured.stack = undefined
      throw misconfigured
    }
    return
  }

  const provided = getHeader(event, 'x-api-key')
  if (!provided || !matches(provided, apiKey)) {
    const unauthorized = new HTTPError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: { errors: [{ field: 'x-api-key', message: 'A valid x-api-key header is required.', code: 'unauthorized' }] },
    })
    unauthorized.stack = undefined
    throw unauthorized
  }
})
