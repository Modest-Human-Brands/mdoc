export const TEMPLATES = ['quotation', 'internship-completion-certificate'] as const
export type TemplateName = (typeof TEMPLATES)[number]

export interface QuotationPayload {
  logoUrl: string
  client: { name: string; address: string; email: string; phone: string }
  project: {
    quoteNumber: string
    quoteDate: string
    quoteExpiry: string
    shootDate: string
    shootLocation: string
  }
  budgetMarkdown: string
  termsMarkdown: string
}

export interface InternshipCompletionCertificatePayload {
  recipientName: string
  recipientRole: string
  scopeOfWork: string
  startDate: string
  endDate: string
  dataOfIssue: string
  signerSignature: string
  signerName: string
  signerTitle: string
  companyName: string
  companylogoUrl: string
}

export type TemplatePayload = QuotationPayload | InternshipCompletionCertificatePayload
export type RequestBody = { template: 'quotation'; data: QuotationPayload } | { template: 'internship-completion-certificate'; data: InternshipCompletionCertificatePayload }

export interface DocumentMeta {
  id: string
  template: string
  label: string
  fileName: string
  createdAt: string
}
