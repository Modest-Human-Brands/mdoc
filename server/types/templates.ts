import type { InternshipCompletionCertificatePayload } from '~/templates/document/InternshipCompletionCertificateV1'
import type { QuotationPayload } from '~/templates/document/QuotationV1'

export const TEMPLATES = ['quotation', 'internship-completion-certificate'] as const
export type TemplateName = (typeof TEMPLATES)[number]

export type TemplatePayload = QuotationPayload | InternshipCompletionCertificatePayload
export type RequestBody = { template: 'quotation'; data: QuotationPayload } | { template: 'internship-completion-certificate'; data: InternshipCompletionCertificatePayload }

export interface DocumentMeta {
  id: string
  name: string
  fileName: string
  extension: string
  sizeBytes: number
  templateId: string
  previewUrl: string
  createdAt: string
  updatedAt: string
}
