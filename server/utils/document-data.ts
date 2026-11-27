import { createHash } from 'node:crypto'

import notion from '~/server/utils/notion'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import type { NotionDocument } from '~/server/types'

/**
 * A document's form data lives on its Notion page as JSON in code blocks. Notion limits a block to 100 text chunks of
 * 2000 characters, so large data spans several blocks.
 */
export function toJsonBlocks(value: unknown) {
  const chunks = JSON.stringify(value).match(/[\s\S]{1,2000}/g) ?? []
  return Array.from({ length: Math.ceil(chunks.length / 100) }, (_, index) => ({
    object: 'block' as const,
    type: 'code' as const,
    code: { language: 'json' as const, rich_text: chunks.slice(index * 100, index * 100 + 100).map((chunk) => ({ text: { content: chunk } })) },
  }))
}

async function dataBlocks(pageId: string) {
  const blocks: any[] = []
  let cursor: string | undefined
  do {
    const response = await notion.blocks.children.list({ block_id: pageId, page_size: 100, start_cursor: cursor })
    blocks.push(...((response.results ?? []) as any[]).filter((block) => block.type === 'code' && block.code?.rich_text))
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)
  return blocks
}

/** Block IDs without parsing them, so a half-written document can still be restored. */
export const readDataBlockIds = async (pageId: string): Promise<string[]> => (await dataBlocks(pageId)).map((block) => block.id)

export interface StoredData {
  blockIds: string[]
  data: Record<string, any> | null
}

export async function readDocumentData(pageId: string): Promise<StoredData> {
  const blocks = await dataBlocks(pageId)
  const json = blocks.map((block) => notionTextStringify(block.code.rich_text)).join('')
  return { blockIds: blocks.map((block) => block.id), data: json ? JSON.parse(json) : null }
}

/** Overwrites blocks in place first, so the usual single-block document changes in one atomic request. */
export async function writeDocumentData(pageId: string, blockIds: string[], value: unknown) {
  const next = toJsonBlocks(value)
  for (const [index, block] of next.slice(0, blockIds.length).entries()) {
    await notion.blocks.update({ block_id: blockIds[index]!, code: block.code })
  }
  const added = next.slice(blockIds.length)
  if (added.length > 0) await notion.blocks.children.append({ block_id: pageId, children: added })
  for (const blockId of blockIds.slice(next.length)) await notion.blocks.delete({ block_id: blockId })
}

/** Changes whenever anything an edit can overwrite changes; an edit must quote the one it started from. */
export function contentRevision(document: NotionDocument, data: unknown): string {
  const { properties } = document as unknown as { properties: Record<string, any> }
  const ids = (name: string) => (properties[name]?.relation ?? []).map((item: { id: string }) => item.id.replaceAll('-', ''))
  const state = [notionTextStringify(properties.Name.title), ids('Contact'), ids('Project'), data]
  return createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16)
}
