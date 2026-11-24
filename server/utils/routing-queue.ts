import { HTTPError } from 'nitro/h3'

import type { NotionDocument } from '~/server/types'
import notionTextStringify from '~/server/utils/notion-text-stringify'

export interface SignerCertificate {
  subject?: string
  issuer?: string
  serialNumber?: string
  notAfter?: string
}

export interface SignerDetails {
  order: number
  name: string
  email: string
  role: string
  status: string
  signedAt?: string
  telemetry?: { ipAddress?: string; userAgent?: string }
  certificate?: SignerCertificate
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase()
export const sameEmail = (a?: string | null, b?: string | null) => !!a && !!b && normalizeEmail(a) === normalizeEmail(b)

/** Notion caps one rich-text object at 2,000 characters, so a longer queue is split across several. */
const RICH_TEXT_CHUNK = 1900
export function toRichText(value: unknown) {
  const json = JSON.stringify(value)
  const chunks = json.match(new RegExp(String.raw`[\s\S]{1,${RICH_TEXT_CHUNK}}`, 'g')) ?? ['']
  return chunks.map((content) => ({ text: { content } }))
}

/** The audit record keeps what is useful for a dispute and nothing that could bloat the queue. */
export function cleanTelemetry(telemetry?: { ipAddress?: string; userAgent?: string }) {
  if (!telemetry) return undefined
  return { ipAddress: telemetry.ipAddress?.slice(0, 64), userAgent: telemetry.userAgent?.slice(0, 300) }
}

export function readQueue(document: NotionDocument): SignerDetails[] {
  const raw = notionTextStringify(document.properties['Routing Queue']?.rich_text ?? [])
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SignerDetails[]) : []
  } catch {
    const error = new HTTPError({ statusCode: 500, statusMessage: 'Document envelope is corrupted or missing routing data.' })
    error.stack = undefined
    throw error
  }
}

/** Serialises state changes of one document inside this process, so two requests cannot interleave a read-modify-write. */
const locks = new Map<string, Promise<unknown>>()
export async function withDocumentLock<T>(id: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(id) ?? Promise.resolve()
  const run = previous.catch(() => {}).then(task)
  locks.set(id, run)
  try {
    return await run
  } finally {
    if (locks.get(id) === run) locks.delete(id)
  }
}
