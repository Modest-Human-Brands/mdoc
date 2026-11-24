import { defineEventHandler, getRouterParam } from 'nitro/h3'

import { archiveTerm, orgOf, toMeta } from '~/server/utils/terms-store'

export default defineEventHandler(async (event) => toMeta(await archiveTerm(orgOf(event), getRouterParam(event, 'slug') ?? '')))
