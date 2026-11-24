import { defineEventHandler, getValidatedQuery } from 'nitro/h3'
import { z } from 'zod'

import { appliesToTemplate, listTerms, orgOf, TERM_STATUSES, toMeta } from '~/server/utils/terms-store'

const querySchema = z.object({
  /** Only terms usable on this template, with `required` / `selected` flags for it. */
  template: z.string().optional(),
  /** Archived terms are only returned when asked for explicitly. */
  status: z.enum(TERM_STATUSES).optional(),
})

export default defineEventHandler(async (event) => {
  const { template, status } = await getValidatedQuery(event, querySchema)

  const terms = (await listTerms(orgOf(event))).filter((term) => (status ? term.status === status : term.status !== 'Archive') && (!template || appliesToTemplate(term, template)))
  return terms.map((term) => toMeta(term, template))
})
