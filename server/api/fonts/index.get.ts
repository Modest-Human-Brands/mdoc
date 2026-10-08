// server/api/fonts/index.get.ts
import { defineEventHandler, getQuery } from 'nitro/h3'

import { listFontFamilies } from '~/server/utils/fonts'
import { handleApiError } from '~/server/utils/api-error'

/** A short curated list shown when there is no search term. */
const FEATURED = ['Exo 2', 'Inter', 'Roboto', 'Poppins', 'Lato', 'Montserrat', 'Open Sans', 'Oxanium', 'Playfair Display', 'Merriweather']

const toItem = (family: string) => ({
  family,
  /** Value for `organization.branding.font` (and the PDF `fontFamily`). */
  name: family.replaceAll(/\s+/g, ''),
})

/** `GET /api/fonts?q=poppins&limit=20`: fonts available for branding, resolved on demand when a document is rendered. */
export default defineEventHandler(async (event) => {
  try {
    const { q, limit } = getQuery(event)
    const max = Math.min(50, Math.max(1, Number(limit) || 20))
    const families = await listFontFamilies()
    const needle = String(q || '')
      .trim()
      .toLowerCase()

    if (!needle) return FEATURED.filter((family) => families.includes(family)).map((family) => toItem(family))
    return families
      .filter((family) => family.toLowerCase().includes(needle))
      .slice(0, max)
      .map((family) => toItem(family))
  } catch (error: unknown) {
    return handleApiError(error, 'fonts/index.get')
  }
})
