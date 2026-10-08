import { defineEventHandler } from 'nitro/h3'

export default defineEventHandler((event) => {
  if (event.req.method !== 'OPTIONS' || !event.url.pathname.startsWith('/api/')) return

  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': '*',
      'access-control-allow-headers': '*',
      'access-control-max-age': '86400',
    },
  })
})
