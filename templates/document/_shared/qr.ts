import { normalizeQrStyle, type QrStyle } from '~/server/utils/qr'

interface QrOrganization {
  website?: string
  accountDetails?: { upiId?: string; accountName?: string }
  branding: { qr?: unknown; logo?: string }
  name: string
}

export type QrTarget = 'document' | 'verify' | 'upi'

export const QR_TARGETS: QrTarget[] = ['document', 'verify', 'upi']

export interface DocumentQrPayload {
  qrStyle: QrStyle
  qrUpiId?: string
  qrUpiName?: string
  /** Where scanning the code lands: a custom URL, the document's own link, or the verify page. */
  qrUrl?: string
  /** Explicit target, when one was configured. `undefined` leaves the choice to the template (payment templates keep their UPI code while money is due). */
  qrTarget?: QrTarget
}

/**
 * Per-document QR settings, sent next to the template variables:
 * `{ "qr": { "target": "verify" } }` or `{ "qr": { "url": "https://example.com/thanks" } }`.
 * `_document.url` is injected by the renderer once the document has a link.
 */
interface QrSource {
  qr?: { url?: unknown; target?: unknown }
  _document?: { url?: unknown }
}

export function verifyBaseUrl(org: Pick<QrOrganization, 'website'>): string | undefined {
  const configured = process.env.NITRO_MDOC_PUBLIC_VERIFY_URL || org.website
  return configured ? configured.replace(/\/+$/, '') : undefined
}

export function verifyUrl(org: Pick<QrOrganization, 'website'>, documentNumber: string | undefined): string | undefined {
  const base = verifyBaseUrl(org)
  return base && documentNumber ? `${base}/verify/${encodeURIComponent(documentNumber)}` : undefined
}

const asTarget = (value: unknown): QrTarget | undefined => (QR_TARGETS.includes(value as QrTarget) ? (value as QrTarget) : undefined)
const asUrl = (value: unknown): string | undefined => (typeof value === 'string' && /^https?:\/\//i.test(value.trim()) ? value.trim() : undefined)

export function qrPayload(org: QrOrganization, documentNumber: string | undefined, source?: object): DocumentQrPayload {
  const { qr, _document } = (source ?? {}) as QrSource
  const orgQr = org.branding.qr as { target?: unknown } | undefined
  const target = asTarget(qr?.target) ?? asTarget(orgQr?.target)
  const verify = verifyUrl(org, documentNumber)
  const document = asUrl(_document?.url)

  return {
    qrStyle: normalizeQrStyle(org.branding.qr),
    qrUpiId: org.accountDetails?.upiId,
    qrUpiName: org.accountDetails?.accountName ?? org.name,
    qrUrl: asUrl(qr?.url) ?? (target === 'verify' ? (verify ?? document) : (document ?? verify)),
    qrTarget: target,
  }
}

export function upiLink(options: { upiId?: string; name?: string; amount?: number; note?: string }): string | undefined {
  if (!options.upiId) return undefined
  const params = new URLSearchParams({ pa: options.upiId, pn: options.name ?? '' })
  if (options.amount && options.amount > 0) params.set('am', options.amount.toFixed(2))
  params.set('cu', 'INR')
  if (options.note) params.set('tn', options.note)
  return `upi://pay?${params.toString().replace(/\+/g, '%20')}`
}
