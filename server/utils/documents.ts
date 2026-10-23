import { useStorage } from 'nitro/storage'

const CONTENT_TYPES: Record<string, string> = { pdf: 'application/pdf', png: 'image/png' }

const documents = () => useStorage('documents')

export async function readDocument(key: string): Promise<Buffer | undefined> {
  const raw = await documents().getItemRaw<Buffer | ArrayBuffer>(key)
  return raw ? Buffer.from(raw as ArrayBuffer) : undefined
}

export async function writeDocument(key: string, bytes: Uint8Array | Buffer) {
  const contentType = CONTENT_TYPES[key.split('.').pop() ?? ''] ?? 'application/octet-stream'
  await documents().setItemRaw(key, bytes, { headers: { 'Content-Type': contentType } })
}

export const removeDocument = (key: string) => documents().removeItem(key)
export const hasDocument = (key: string) => documents().hasItem(key)
export const listDocumentKeys = () => documents().getKeys()
