import { createHash } from 'node:crypto'
import { HTTPError } from 'nitro/h3'
import sharp from 'sharp'

import normalizeId from '~/server/utils/notion-normalize-id'
import { readDocument, writeDocument } from '~/server/utils/documents'

const MAX_LOGO_BYTES = 1024 * 1024
const MAX_SIDE = 512

const OWN_LOGO = /\/api\/organization\/([\da-f]{32})\/logo\/([\da-f]{40})\.png$/

export const logoKey = (orgPageId: string, hash: string) => `_branding:${orgPageId}:${hash}.png`

const invalid = (message: string) => {
  const error = new HTTPError({ statusCode: 400, statusMessage: 'Bad Request', data: { errors: [{ field: 'branding.logo', message, code: 'invalid_logo' }] } })
  error.stack = undefined
  return error
}

/** Re-encodes an uploaded logo to PNG, stores it next to the documents, and returns its public URL. */
export async function storeLogo(orgPageId: string, dataUrl: string, publicBase: string): Promise<string> {
  const match = /^data:image\/(?:png|jpeg);base64,([\d+/=a-z]+)$/i.exec(dataUrl)
  if (!match) throw invalid('A new logo must be a PNG or JPEG data URL.')
  const bytes = Buffer.from(match[1]!, 'base64')
  if (bytes.byteLength > MAX_LOGO_BYTES) throw invalid('The logo is larger than 1 MB.')

  const png = await sharp(bytes, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer()
    .catch(() => {
      throw invalid('That file is not a readable image.')
    })

  const id = normalizeId(orgPageId).toLowerCase()
  const hash = createHash('sha1').update(png).digest('hex')
  await writeDocument(logoKey(id, hash), png)
  return `${publicBase.replace(/\/+$/, '')}/api/organization/${id}/logo/${hash}.png`
}

/** A logo this service stores is read from storage, so rendering never has to call its own public URL. */
export async function inlineStoredLogo(url: string | undefined): Promise<string | undefined> {
  const match = url ? OWN_LOGO.exec(url) : null
  if (!match) return url
  const bytes = await readDocument(logoKey(match[1]!, match[2]!))
  return bytes ? `data:image/png;base64,${bytes.toString('base64')}` : url
}
