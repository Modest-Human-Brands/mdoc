import { normalizeQrStyle, type QrStyle } from '~/server/utils/qr'

interface QrOrganization {
  website?: string
  accountDetails?: { upiId?: string; accountName?: string }
  branding: { qr?: unknown; logo?: string }
  name: string
}

export interface DocumentQrPayload {
  qrStyle: QrStyle
  qrUpiId?: string
  qrUpiName?: string
  qrVerifyUrl?: string
}

export function verifyBaseUrl(org: Pick<QrOrganization, 'website'>): string | undefined {
  const configured = process.env.NITRO_MDOC_PUBLIC_VERIFY_URL || org.website
  return configured ? configured.replace(/\/+$/, '') : undefined
}

export function verifyUrl(org: Pick<QrOrganization, 'website'>, documentNumber: string | undefined): string | undefined {
  const base = verifyBaseUrl(org)
  return base && documentNumber ? `${base}/verify/${encodeURIComponent(documentNumber)}` : undefined
}

export function qrPayload(org: QrOrganization, documentNumber: string | undefined): DocumentQrPayload {
  return {
    qrStyle: normalizeQrStyle(org.branding.qr),
    qrUpiId: org.accountDetails?.upiId,
    qrUpiName: org.accountDetails?.accountName ?? org.name,
    qrVerifyUrl: verifyUrl(org, documentNumber),
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
