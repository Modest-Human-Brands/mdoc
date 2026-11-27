import mime from 'mime-types'

import type { NotionDocument } from '~/server/types'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import normalizeId from '~/server/utils/notion-normalize-id'
import { hasDocument, readDocument, writeDocument } from '~/server/utils/documents'
import { stampVoid } from '~/server/utils/void-stamp'
import generatePdfThumbnail from '~/server/utils/generate-pdf-thumbnail'

/** The storage name of a document's files: its Notion page ID, which never changes and cannot collide. */
export const storageBaseOf = (pageId: string) => normalizeId(pageId).toLowerCase()

/**
 * Documents created before files were keyed by page ID keep their name-based files. A document is on the ID layout
 * when its original render is stored under its ID.
 */
async function resolveBase(document: NotionDocument, name: string, ext: string) {
  const idBase = storageBaseOf(document.id)
  return (await hasDocument(`${idBase}.${ext}`)) ? idBase : name
}

function signedOrdersOf(document: NotionDocument): number[] {
  const queueRaw = notionTextStringify(document.properties['Routing Queue']?.rich_text ?? [])
  if (!queueRaw) return []
  try {
    return JSON.parse(queueRaw)
      .filter((signer: any) => signer.status === 'SIGNED')
      .map((signer: any) => signer.order)
  } catch {
    console.warn('Routing queue could not be parsed; using the baseline file')
    return []
  }
}

/** Every storage key of a document is built here: the original render, the signing chain and the voided copy. */
export async function documentFiles(document: NotionDocument) {
  const { properties } = document
  const name = notionTextStringify(properties.Name.title)
  const ext = mime.extension(properties['Mime Type'].select.name) || 'pdf'
  const status = properties.Status?.status?.name
  const base = await resolveBase(document, name, ext)

  const baseline = `${base}.${ext}`
  const signed = `${base}-signed.${ext}`
  const voided = `${base}-voided.${ext}`
  /** The copy written after the signer at `order` signs, unless they are the last one. */
  const step = (order: number) => `${base}-${order}.${ext}`

  const signedOrders = signedOrdersOf(document)
  /** The newest signature of an unfinished envelope, or the original render if nobody has signed. */
  const latestSigned = signedOrders.length > 0 ? step(Math.max(...signedOrders)) : baseline

  const targets: Record<string, string> = { Completed: signed, 'Partially Signed': latestSigned, Void: voided }
  const target = targets[status] ?? baseline

  return {
    base,
    ext,
    status,
    baseline,
    signed,
    voided,
    step,
    latestSigned,
    target,
    image: status === 'Void' ? `${base}-voided.png` : `${base}.png`,
    voidedImage: `${base}-voided.png`,
    /** The file name people see: the document's name instead of the storage key, safe for an HTTP header. */
    displayName: (key: string) => `${name}${key.slice(base.length)}`.replace(/[^ -~]|["\\]/g, '_'),
  }
}

export type DocumentFiles = Awaited<ReturnType<typeof documentFiles>>

/**
 * Reads the current copy of a document. Nothing else is ever passed off as it: a voided document is never returned
 * unmarked, and a signed document is never replaced by its unsigned original.
 */
export async function readLatestDocument(files: DocumentFiles): Promise<Buffer | undefined> {
  const latest = await readDocument(files.target)
  if (latest) return latest

  if (files.status === 'Void') {
    // Voided before a voided copy was stored: mark the newest copy on the way out, without storing it.
    // A fully signed envelope has no "-<last order>" file: its newest copy is "-signed".
    for (const key of [files.signed, files.latestSigned, files.baseline]) {
      const source = await readDocument(key)
      if (source) return stampVoid(source)
    }
    return undefined
  }

  if (files.target !== files.baseline) console.error(`Signed copy "${files.target}" is missing from storage`)
  return undefined
}

/** The preview thumbnail. A voided document without a stored one gets it drawn from the marked copy, never the unmarked image. */
export async function readPreviewImage(files: DocumentFiles): Promise<Buffer | undefined> {
  const stored = await readDocument(files.image)
  if (stored || files.status !== 'Void') return stored

  const marked = await readLatestDocument(files)
  return marked ? generatePdfThumbnail(marked) : undefined
}

/**
 * Prepares a name-keyed draft for a rename, which would otherwise orphan its files: copies the original render and
 * thumbnail to the ID layout. The originals stay where they are.
 */
export async function moveToIdLayout(document: NotionDocument) {
  const files = await documentFiles(document)
  const idBase = storageBaseOf(document.id)
  if (files.base === idBase) return

  // The thumbnail goes first: the render's presence is what switches the document to the ID layout.
  for (const [from, to] of [
    [`${files.base}.png`, `${idBase}.png`],
    [files.baseline, `${idBase}.${files.ext}`],
  ] as const) {
    const bytes = await readDocument(from)
    if (bytes) await writeDocument(to, bytes)
  }
}
