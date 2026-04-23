export default defineEventHandler((event) => {
  const allowedOrigins = ['*']
  const origin = getRequestHeader(event, 'origin')

  setResponseHeaders(event, {
    'Access-Control-Allow-Methods': 'GET, HEAD, PUT, PATCH, POST, DELETE',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Credentials': 'true',
  })

  if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
    setResponseHeader(event, 'Access-Control-Allow-Origin', origin)
  }

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return 'OK'
  }
})
