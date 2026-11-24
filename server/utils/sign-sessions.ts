import { randomUUID } from 'node:crypto'
import { HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'

/**
 * A signing session lives between `prepare` and `sign`: the stamped PDF plus what is needed to finish the signature.
 * It is kept in the shared document storage (not a local disk) so any instance can complete it, carries its own
 * expiry because storage drivers do not enforce TTLs, and is swept when expired.
 */
export const SESSION_TTL_MS = 5 * 60 * 1000

export interface SignSession {
  documentId: string
  signerEmail: string
  /** The file the signer signs, and the files this signature is written to. */
  fileName: string
  currentFileName: string
  signedFileName: string
  ltIdx?: number
  gtIdx?: number
  signerInfoDerHex?: string
  certificateDerHex?: string
  certificateChainDerHex?: string[]
  telemetry?: { ipAddress?: string; userAgent?: string }
  expiresAt: number
}

const storage = () => useStorage('documents')
const ID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/
const metaKey = (id: string) => `_sign:${id}.json`
const pdfKey = (id: string) => `_sign:${id}.bin`

const expired = () => {
  const error = new HTTPError({ statusCode: 400, statusMessage: 'Signing session expired or invalid. Please refresh and try again.' })
  error.stack = undefined
  return error
}

export async function createSignSession(session: Omit<SignSession, 'expiresAt'>, pdf: Buffer) {
  const id = randomUUID()
  if (Math.random() < 0.1) void sweepSignSessions().catch(() => {})
  await storage().setItemRaw(pdfKey(id), pdf)
  await storage().setItem(metaKey(id), { ...session, expiresAt: Date.now() + SESSION_TTL_MS } satisfies SignSession)
  return id
}

export async function readSignSession(id: string) {
  if (!ID.test(id)) throw expired()
  const session = await storage().getItem<SignSession>(metaKey(id))
  if (!session || session.expiresAt < Date.now()) {
    if (session) await deleteSignSession(id)
    throw expired()
  }
  const raw = await storage().getItemRaw<Buffer | ArrayBuffer>(pdfKey(id))
  if (!raw) throw expired()
  return { session, pdf: Buffer.from(raw as ArrayBuffer) }
}

export async function deleteSignSession(id: string) {
  await Promise.all([storage().removeItem(metaKey(id)), storage().removeItem(pdfKey(id))])
}

export async function sweepSignSessions() {
  const keys = (await storage().getKeys('_sign')).filter((key) => key.endsWith('.json'))
  for (const key of keys) {
    const session = await storage().getItem<SignSession>(key)
    if (!session || session.expiresAt < Date.now()) await deleteSignSession(key.replace(/^_sign:/, '').replace(/\.json$/, ''))
  }
}
