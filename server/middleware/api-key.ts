import { timingSafeEqual } from 'node:crypto'
import { defineEventHandler, getRequestIP, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

import { NOTION_ID } from '~/server/utils/notion-errors'
import type { AuthContext } from '~/server/utils/document-access'

const PUBLIC_GET = [
  /^\/api\/health$/,
  /^\/api\/document\/[\da-f-]{32,36}\/view$/i,
  /^\/api\/document\/template\/[^/]+\/sample\/\d+\.png$/,
  /^\/api\/document\/template\/[^/]+\/sample\.pdf$/,
  /^\/api\/decor\/(builtin|upload)\/[^/]+$/,
]

// The signer's browser has no API key: these four routes are authenticated by the magic-link token (or the signing
// session it creates) inside the handler, and are rate limited per client address.
const SIGNER_POST = /^\/api\/document\/[^/]+\/(session\/verify|sign\/prepare|sign\/client|sign\/server)$/
const SIGNER_LIMIT = { windowMs: 60_000, max: 30 }
const hits = new Map<string, { count: number; resetAt: number }>()

function rateLimited(key: string) {
  const now = Date.now()
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k)
  const entry = hits.get(key)
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + SIGNER_LIMIT.windowMs })
    return false
  }
  return ++entry.count > SIGNER_LIMIT.max
}

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
  if (event.req.method === 'POST' && SIGNER_POST.test(pathname)) {
    if (rateLimited(`${getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'}:${pathname.split('/').at(-1)}`)) throw reject(429, 'Too Many Requests')
    return
  }

  const apiKey = useRuntimeConfig().private.apiKey as string
  if (!apiKey && process.env.NODE_ENV === 'production') throw reject(500, 'API key is not configured.')

  if (apiKey) {
    const provided = event.req.headers.get('x-api-key')
    if (!provided || !matches(provided, apiKey)) throw reject(401, 'Unauthorized', 'x-api-key', 'A valid x-api-key header is required.', 'unauthorized')
  }

  // Every protected route is scoped to a tenant and an actor, never to the API key alone.
  const orgId = event.req.headers.get('x-org-id')?.trim()
  if (!orgId) throw reject(400, 'Bad Request', 'x-org-id', 'An x-org-id header is required.', 'required')

  const userId = event.req.headers.get('x-user-id')?.trim()
  if (!userId) throw reject(400, 'Bad Request', 'x-user-id', 'An x-user-id header is required.', 'required')
  if (!NOTION_ID.test(userId)) throw reject(400, 'Bad Request', 'x-user-id', 'x-user-id must be a Notion page ID.', 'invalid')

  event.context.auth = { orgId, userId } satisfies AuthContext
})
