import { useRuntimeConfig } from 'nitro/runtime-config'
import { HTTPError } from 'nitro/h3'

import notion from '~/server/utils/notion'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import normalizeId from '~/server/utils/notion-normalize-id'
import { withDocumentLock } from '~/server/utils/routing-queue'
import type { NotionDB, NotionDocument } from '~/server/types'

/** Names that look the same to a person are the same name: case, surrounding and repeated spaces are ignored. */
export const comparableName = (name: string) => name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()

const sameId = (a: string, b: string) => normalizeId(a).toLowerCase() === normalizeId(b).toLowerCase()

async function isNameTaken(name: string, exceptId?: string) {
  const config = useRuntimeConfig()
  const dataSourceId = config.private.notionDbId ? (JSON.parse(config.private.notionDbId) as NotionDB).document : 'mock-doc-db'
  const wanted = comparableName(name)

  // Queried here, not through the shared helper: that one swallows errors, and a failed lookup must never read as "free".
  let cursor: string | undefined
  do {
    const response = await notion.dataSources.query({ data_source_id: dataSourceId, page_size: 100, start_cursor: cursor })
    for (const page of response.results as unknown as NotionDocument[]) {
      if (exceptId && sameId(page.id, exceptId)) continue
      if (comparableName(notionTextStringify(page.properties.Name?.title ?? [])) === wanted) return true
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  return false
}

/**
 * Runs `task` only if no other document has this name, and keeps the name reserved until it finishes, so two requests
 * cannot both take it. The reservation holds within one server process.
 */
export function withUniqueName<T>(name: string, task: () => Promise<T>, exceptId?: string): Promise<T> {
  return withDocumentLock(`name:${comparableName(name)}`, async () => {
    if (await isNameTaken(name, exceptId)) {
      const error = new HTTPError({
        statusCode: 409,
        statusMessage: 'Conflict',
        data: { errors: [{ field: 'name', message: `A document named "${name}" already exists. Choose a different name.`, code: 'duplicate_name' }] },
      })
      error.stack = undefined
      throw error
    }
    return task()
  })
}
