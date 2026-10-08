// server/utils/decor.ts
// Decorative images (illustrations, patterns, frames) for templates.
// A decor reference is a string: `builtin:<id>`, `upload:<hash>` or an `https://...` URL ('' / 'none' = no decor).
// Every reference is resolved server-side to a PNG data URI, because the PDF engine cannot draw SVGs
// and must never be pointed at arbitrary remote URLs while rendering.
import { createHash } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import sharp from 'sharp'
import { useStorage } from 'nitro/storage'

export type DecorTint = 'none' | 'primary' | 'accent'

export interface BuiltinDecor {
  id: string
  label: string
  kind: 'illustration' | 'pattern' | 'frame'
  /** Single-colour line art that can be recoloured to the brand colours. */
  tintable: boolean
  /** File in public/decor (bundled as a server asset). */
  file: string
  /** Placement slots a template declares via `x-decor-slot`. */
  slots: string[]
}

export const builtinDecors: BuiltinDecor[] = [{ id: 'leaf', label: 'Leaf', kind: 'illustration', tintable: true, file: 'leaf.svg', slots: ['panel-corner'] }]

export const MAX_DECOR_BYTES = 2 * 1024 * 1024
const MAX_REMOTE_BYTES = 5 * 1024 * 1024
const REMOTE_TIMEOUT_MS = 5000
const MAX_PIXELS = 1600
const CACHE_LIMIT = 64

const cache = new Map<string, string>()

function remember(key: string, value: string) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string)
  cache.set(key, value)
}

export function getBuiltinDecor(id: string) {
  return builtinDecors.find((decor) => decor.id === id)
}

export async function readBuiltinDecorFile(file: string): Promise<Buffer | undefined> {
  const raw = await useStorage('assets:decor').getItemRaw<Buffer | Uint8Array | string>(file)
  return raw == null ? undefined : Buffer.from(raw as any)
}

/** Reject SVGs that could pull in files/URLs or run active content when rasterised. */
function assertSafeSvg(svg: string) {
  if (/<\s*(script|foreignObject|image|use|iframe)\b|<!ENTITY|<!DOCTYPE|\bhref\s*=\s*["'](?!#)|url\(\s*["']?(?!#)/i.test(svg)) {
    throw new Error('SVG contains unsupported elements')
  }
}

function isBlockedAddress(address: string): boolean {
  if (address.includes(':')) {
    const a = address.toLowerCase()
    return a === '::1' || a === '::' || a.startsWith('fc') || a.startsWith('fd') || a.startsWith('fe80') || a.startsWith('::ffff:')
  }
  const [a = 0, b = 0] = address.split('.').map(Number)
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
}

async function fetchRemoteImage(rawUrl: string): Promise<Buffer> {
  const url = new URL(rawUrl)
  if (url.protocol !== 'https:') throw new Error('Only https URLs are allowed')

  const addresses = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true })
  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error('URL host is not allowed')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS)
  try {
    // redirect: 'error' so a redirect cannot bypass the host check above
    const response = await fetch(url, { signal: controller.signal, redirect: 'error' })
    if (!response.ok) throw new Error(`Image request failed (${response.status})`)
    if (!(response.headers.get('content-type') || '').startsWith('image/')) throw new Error('URL is not an image')

    const chunks: Uint8Array[] = []
    let total = 0
    const reader = response.body!.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_REMOTE_BYTES) throw new Error('Image is too large')
      chunks.push(value)
    }
    return Buffer.concat(chunks)
  } finally {
    clearTimeout(timer)
  }
}

/** Validate and normalise any uploaded/remote image to a bounded PNG. Throws on anything that is not a plain image. */
export async function normalizeImage(input: Buffer, tintColor?: string): Promise<Buffer> {
  const isSvg = input.subarray(0, 512).toString('utf8').trimStart().startsWith('<')
  let source = input
  if (isSvg) {
    const svg = input.toString('utf8')
    assertSafeSvg(svg)
    // Line art: recolour strokes/fills (but never `none`) to the requested tint
    source = Buffer.from(tintColor ? svg.replaceAll(/(stroke|fill)="(?!none)[^"]*"/g, `$1="${tintColor}"`) : svg)
  }

  return sharp(source, { density: isSvg ? 384 : 72, limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: MAX_PIXELS, height: MAX_PIXELS, fit: 'inside', withoutEnlargement: !isSvg })
    .png()
    .toBuffer()
}

const toDataUri = (png: Buffer) => `data:image/png;base64,${png.toString('base64')}`

export function decorColorFor(tint: DecorTint | undefined, colors: { primary: string; accent: string }): string | undefined {
  if (tint === 'primary') return colors.primary
  if (tint === 'accent') return colors.accent
  return undefined
}

/**
 * Resolve a decor reference to a PNG data URI for `<Image :src>`.
 * Never throws: any failure returns '' so the template simply omits the decor.
 */
export async function resolveDecor(ref: string | undefined | null, options: { tintColor?: string } = {}): Promise<string> {
  const value = (ref || '').trim()
  if (!value || value === 'none') return ''

  const key = `${value}|${options.tintColor || ''}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit

  try {
    let png: Buffer
    if (value.startsWith('builtin:')) {
      const decor = getBuiltinDecor(value.slice('builtin:'.length))
      const file = decor && (await readBuiltinDecorFile(decor.file))
      if (!decor || !file) return ''
      png = await normalizeImage(file, decor.tintable ? options.tintColor : undefined)
    } else if (value.startsWith('upload:')) {
      const hash = value.slice('upload:'.length)
      if (!/^[a-f0-9]{40}$/.test(hash)) return ''
      const stored = await useStorage('data').getItemRaw<Buffer>(`decor-uploads:${hash}.png`)
      if (!stored) return ''
      png = Buffer.from(stored)
    } else if (value.startsWith('https://')) {
      png = await normalizeImage(await fetchRemoteImage(value))
    } else {
      return ''
    }

    const uri = toDataUri(png)
    remember(key, uri)
    return uri
  } catch (error) {
    console.warn(`[decor] could not resolve "${value.slice(0, 80)}":`, (error as Error).message)
    return ''
  }
}

export async function storeUpload(input: Buffer): Promise<{ id: string; hash: string }> {
  if (input.byteLength > MAX_DECOR_BYTES) throw new Error('Image is larger than 2 MB')
  const png = await normalizeImage(input)
  const hash = createHash('sha1').update(png).digest('hex')
  await useStorage('data').setItemRaw(`decor-uploads:${hash}.png`, png)
  return { id: `upload:${hash}`, hash }
}
