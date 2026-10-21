import { useStorage } from 'nitro/storage'

export interface SampleManifestEntry {
  pageCount: number
  width: number
  height: number

  hash: string
}

export type SampleManifest = Record<string, SampleManifestEntry>

const storage = () => useStorage('assets:templates')

export async function readSampleManifest(): Promise<SampleManifest> {
  const raw = await storage().getItem<SampleManifest | string>('manifest.json')
  if (!raw) return {}
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

export async function readSampleImage(templateId: string, page: number): Promise<Buffer | undefined> {
  const raw = await storage().getItemRaw<Buffer | Uint8Array>(`${templateId}/sample-${page}.png`)
  return raw == null ? undefined : Buffer.from(raw)
}

export function sampleUrls(templateId: string, entry?: SampleManifestEntry) {
  if (!entry) return { thumbnailUrl: null, pages: [] as { url: string; width: number; height: number }[], pageCount: 0, version: null }

  const pages = Array.from({ length: entry.pageCount }, (_, index) => ({
    url: `/api/document/template/${templateId}/sample/${index + 1}.png?v=${entry.hash}`,
    width: entry.width,
    height: entry.height,
  }))

  return { thumbnailUrl: pages[0]?.url ?? null, pages, pageCount: entry.pageCount, version: entry.hash }
}
