import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'

import { readDocument } from '~/server/utils/documents'
import { logoKey } from '~/server/utils/organization-logo'
import { toRouteError } from '~/server/utils/route-error'

/** Public, because it is printed on documents and linked from the organisation's Notion page. */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id') ?? ''
    const hash = /^([\da-f]{40})\.png$/.exec(getRouterParam(event, 'file') ?? '')?.[1]
    const bytes = hash && /^[\da-f]{32}$/.test(id) ? await readDocument(logoKey(id, hash)) : undefined
    if (!bytes) throw new HTTPError({ statusCode: 404, statusMessage: 'Logo not found' })

    event.res.headers.set('Content-Type', 'image/png')
    event.res.headers.set('X-Content-Type-Options', 'nosniff')
    // The file name is the content hash, so a given URL never changes.
    event.res.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return bytes
  } catch (error: unknown) {
    return toRouteError(error, 'organization/[id]/logo/[file].get')
  }
})
