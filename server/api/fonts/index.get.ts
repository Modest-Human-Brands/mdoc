import { defineEventHandler, getQuery, HTTPError } from 'nitro/h3'

import { listFontFamilies } from '~/server/utils/fonts'

const FEATURED = ['Exo 2', 'Inter', 'Caveat', 'Cormorant Garamond', 'Roboto', 'Poppins', 'Lato', 'Montserrat', 'Open Sans', 'Oxanium', 'Playfair Display', 'Merriweather']

const toItem = (family: string) => ({
  family,

  name: family.replaceAll(/\s+/g, ''),
})

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
    if (error instanceof Error && 'statusCode' in error) {
      error.stack = undefined
      throw error
    }

    console.error('fonts/index.get', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    serverError.stack = undefined
    throw serverError
  }
})
