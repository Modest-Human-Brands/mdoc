import { defineEventHandler, readBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

import type { AuthContext } from '~/server/utils/document-access'
import { organizationPatchSchema, updateOrganization } from '~/server/utils/organization-notion'
import { toRouteError } from '~/server/utils/route-error'

/** Writes the caller's organisation profile and branding straight to its Notion page. */
export default defineEventHandler(async (event) => {
  try {
    const { orgId, userId } = event.context.auth as AuthContext
    const patch = organizationPatchSchema.parse(await readBody(event))
    const publicBase = (useRuntimeConfig().public.docUrl as string | undefined) || event.url.origin
    return await updateOrganization(orgId, userId, patch, publicBase)
  } catch (error: unknown) {
    return toRouteError(error, 'organization.patch')
  }
})
