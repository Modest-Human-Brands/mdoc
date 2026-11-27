import { useRuntimeConfig } from 'nitro/runtime-config'

import normalizeId from '~/server/utils/notion-normalize-id'

const PREVIEW_ID = '00000000000000000000000000000000'

const publicBase = (fallbackOrigin?: string) => {
  const configured = (useRuntimeConfig().public.docUrl as string | undefined) || fallbackOrigin
  return configured ? configured.replace(/\/+$/, '') : undefined
}

/** The public, read-only link of a stored document. This is where every QR code points by default. */
export function documentViewUrl(id: string, fallbackOrigin?: string): string | undefined {
  const base = publicBase(fallbackOrigin)
  // Without dashes: a shorter link means a sparser QR code with larger modules.
  return base ? `${base}/api/document/${encodeURIComponent(normalizeId(id))}/view` : undefined
}

/** A stand-in link so previews and sample PDFs show the QR code that real documents get. */
export const previewDocumentUrl = () => documentViewUrl(PREVIEW_ID, 'https://docs.example.com')
