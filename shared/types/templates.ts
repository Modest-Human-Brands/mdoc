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
  role: string
  company: string
  startDate: string
  endDate: string
  issueDate: string
  description: string
  signatureUrl: string
  signerName: string
  signerTitle: string
  logoUrl: string
}

export type TemplatePayload = QuotationPayload | InternshipCompletionCertificatePayload
export type RequestBody = { template: 'quotation'; data: QuotationPayload } | { template: 'internship-completion-certificate'; data: InternshipCompletionCertificatePayload }
