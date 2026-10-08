// server/utils/fonts.ts
// On-demand fonts for the PDF engine. A template (or an organisation's brand font) names a font family and weights;
// the files are resolved with unifont (Google Fonts), cached in Nitro storage and registered with the PDF font store.
// Only full TTF/WOFF files are used: WOFF2 breaks in the PDF engine and CDN subset files (e.g. "latin") lose glyphs such as the rupee sign.
import { createUnifont, providers, type Unifont } from 'unifont'
import { fontStore } from '@ceereals/vue-pdf'
import { useStorage } from 'nitro/storage'

export interface TemplateFont {
  /** Name used as `fontFamily` in components, e.g. 'Exo2'. */
  name: string
  /** Legacy: a bundled file registered immediately. With `family` it is only the offline fallback for weight 400. */
  path?: string
  weight?: number | string
  /** Font family to resolve online, e.g. 'Exo 2'. Omit to use the bundled `path` only. */
  family?: string
  /** Weights to make available (default: 400 only). Declare e.g. [400, 600] for components that use `fontWeight: 'bold'` to get a real bold. */
  weights?: number[]
}

export const DEFAULT_FONT = 'Exo2'
// Regular only by default: documents were designed without bold, so `fontWeight: 'bold'` stays regular unless a template declares more weights
export const DEFAULT_WEIGHTS = [400]

const FORMAT_PRIORITY = ['truetype', 'woff'] as const
const FETCH_TIMEOUT_MS = 8000
const NEGATIVE_TTL_MS = 10 * 60 * 1000

const registered = new Set<string>() // `${name}:${weight}`
const knownNames = new Set<string>()
const inflight = new Map<string, Promise<boolean>>()
const missing = new Map<string, number>()
let unifontPromise: Promise<Unifont<any>> | undefined

export const markFontRegistered = (name: string, weight: number | string = 400) => {
  knownNames.add(name)
  registered.add(`${name}:${weight}`)
}
export const isFontRegistered = (name: string) => knownNames.has(name)

const getUnifont = () => (unifontPromise ??= createUnifont([providers.google()]))

/** 'Exo2' -> ['Exo2', 'Exo 2'], 'IslandMoments' -> ['IslandMoments', 'Island Moments'] */
export function candidateFamilies(name: string): string[] {
  const spaced = name
    .replaceAll(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replaceAll(/[_-]+/g, ' ')
    .trim()
  return [...new Set([name, spaced])]
}

const slug = (value: string) => value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')

async function download(url: string): Promise<Buffer> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`Font request failed (${response.status})`)
    return Buffer.from(await response.arrayBuffer())
  } finally {
    clearTimeout(timer)
  }
}

/** Font file for family + weight: from the storage cache, else resolved with unifont and downloaded once. */
async function loadFontFile(family: string, weight: number): Promise<{ data: Buffer; format: 'ttf' | 'woff' } | undefined> {
  const storage = useStorage('data')

  for (const ext of ['ttf', 'woff'] as const) {
    const cached = await storage.getItemRaw<Buffer | Uint8Array>(`fonts:${slug(family)}-${weight}-normal.${ext}`)
    if (cached) return { data: Buffer.from(cached), format: ext }
  }

  const unifont = await getUnifont()
  const { fonts } = await unifont.resolveFont(family, { weights: [String(weight)], styles: ['normal'], formats: ['ttf', 'woff'] })

  for (const wanted of FORMAT_PRIORITY) {
    for (const face of fonts) {
      if (face.weight && String(face.weight) !== String(weight)) continue
      const source = face.src?.find((entry: any) => entry.url && entry.format === wanted)
      if (!source) continue

      const data = await download(String((source as any).url))
      const format = wanted === 'truetype' ? 'ttf' : 'woff'
      await storage.setItemRaw(`fonts:${slug(family)}-${weight}-normal.${format}`, data)
      return { data, format }
    }
  }
  return undefined
}

async function registerWeight(name: string, family: string | undefined, weight: number, fallbackPath?: string): Promise<boolean> {
  const key = `${name}:${weight}`
  if (registered.has(key)) return true

  const failedAt = missing.get(key)
  if (failedAt && Date.now() - failedAt < NEGATIVE_TTL_MS) return false

  const pending = inflight.get(key)
  if (pending) return pending

  const task = (async () => {
    try {
      for (const candidate of family ? [family] : candidateFamilies(name)) {
        const file = await loadFontFile(candidate, weight).catch(() => undefined)
        if (!file) continue

        const mime = file.format === 'ttf' ? 'font/ttf' : 'font/woff'
        fontStore.register({ family: name, src: `data:${mime};base64,${file.data.toString('base64')}`, fontWeight: weight })
        markFontRegistered(name, weight)
        return true
      }

      if (fallbackPath && weight === 400) {
        fontStore.register({ family: name, src: fallbackPath, fontWeight: 400 })
        markFontRegistered(name, 400)
        console.warn(`[fonts] ${name} ${weight}: using bundled fallback ${fallbackPath}`)
        return true
      }

      missing.set(key, Date.now())
      console.warn(`[fonts] ${name} ${weight}: not available`)
      return false
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, task)
  return task
}

/** Make sure every listed font (and weight) is registered. Never throws. */
export async function ensureFonts(fonts: TemplateFont[]): Promise<void> {
  const jobs: Promise<boolean>[] = []

  for (const font of fonts) {
    if (!font.family && font.path) {
      // Legacy bundled-file entry: registered at template registration time
      continue
    }
    for (const weight of font.weights ?? DEFAULT_WEIGHTS) {
      jobs.push(registerWeight(font.name, font.family, weight, font.path))
    }
  }

  await Promise.allSettled(jobs)
}

/** The font an organisation picked, falling back to the default when it cannot be resolved. */
export async function resolveBrandFont(name: string | undefined): Promise<string> {
  const requested = (name || DEFAULT_FONT).trim()
  if (isFontRegistered(requested)) return requested

  await ensureFonts([{ name: requested }])
  return isFontRegistered(requested) ? requested : DEFAULT_FONT
}

let catalogue: string[] | undefined

/** Google Fonts families (cached). */
export async function listFontFamilies(): Promise<string[]> {
  if (!catalogue) {
    const unifont = await getUnifont()
    catalogue = (await unifont.listFonts(['google'])) ?? []
  }
  return catalogue
}
