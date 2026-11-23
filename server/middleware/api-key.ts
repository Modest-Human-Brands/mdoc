import { timingSafeEqual } from 'node:crypto'
import { defineEventHandler, getHeader, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

import { NOTION_ID } from '~/server/utils/notion-errors'
import type { AuthContext } from '~/server/utils/document-access'

const PUBLIC_GET = [/^\/api\/health$/, /^\/api\/document\/[\da-f-]{32,36}\/view$/i, /^\/api\/document\/template\/[^/]+\/sample\/\d+\.png$/, /^\/api\/decor\/(builtin|upload)\/[^/]+$/]

const reject = (statusCode: number, statusMessage: string, field?: string, message?: string, code?: string) => {
  const error = new HTTPError({ statusCode, statusMessage, ...(field && { data: { errors: [{ field, message, code }] } }) })
  error.stack = undefined
  return error
}

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
  if (!apiKey && process.env.NODE_ENV === 'production') throw reject(500, 'API key is not configured.')

  if (apiKey) {
    const provided = getHeader(event, 'x-api-key')
    if (!provided || !matches(provided, apiKey)) throw reject(401, 'Unauthorized', 'x-api-key', 'A valid x-api-key header is required.', 'unauthorized')
  }

  // Every protected route is scoped to a tenant and an actor, never to the API key alone.
  const orgId = getHeader(event, 'x-org-id')?.trim()
  if (!orgId) throw reject(400, 'Bad Request', 'x-org-id', 'An x-org-id header is required.', 'required')

  const userId = getHeader(event, 'x-user-id')?.trim()
  if (!userId) throw reject(400, 'Bad Request', 'x-user-id', 'An x-user-id header is required.', 'required')
  if (!NOTION_ID.test(userId)) throw reject(400, 'Bad Request', 'x-user-id', 'x-user-id must be a Notion page ID.', 'invalid')

  event.context.auth = { orgId, userId } satisfies AuthContext
})
