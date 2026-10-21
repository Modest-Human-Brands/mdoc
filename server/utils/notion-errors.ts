import { HTTPError } from 'nitro/h3'

const normalizeId = (id: string) => id.replaceAll('-', '').toLowerCase()

export const NOTION_ID = /^[\da-f]{8}-?[\da-f]{4}-?[\da-f]{4}-?[\da-f]{4}-?[\da-f]{12}$/i

export function toRelationFieldError(error: unknown, relations: Record<string, string | undefined>): unknown {
  const notionError = error as { code?: string; status?: number; message?: string } | null
  if (notionError?.code !== 'object_not_found' || notionError.status !== 404) return error

  const message = normalizeId(notionError.message ?? '')
  const fields = Object.entries(relations)
    .filter(([, id]) => id && message.includes(normalizeId(id)))
    .map(([field]) => field)

  const errors = (fields.length > 0 ? fields : ['relations']).map((field) => ({
    field,
    message: `${field} refers to a Notion page that does not exist or is not shared with the integration.`,
    code: 'relation_not_found',
  }))
  const relationError = new HTTPError({ statusCode: 400, statusMessage: 'Bad Request', data: { errors } })
  relationError.stack = undefined
  return relationError
}
