import { defineEventHandler } from 'nitro/h3'

import type { AuthContext } from '~/server/utils/document-access'
import { loadOrganization } from '~/server/utils/organization-notion'
import { toRouteError } from '~/server/utils/route-error'

/** The caller's organisation profile and branding, read from Notion on every call. */
export default defineEventHandler(async (event) => {
  try {
    const { orgId, userId } = event.context.auth as AuthContext
    const record = await loadOrganization(orgId, userId)
    event.res.headers.set('Cache-Control', 'no-store')
    return record
  } catch (error: unknown) {
    return toRouteError(error, 'organization.get')
  }
})
