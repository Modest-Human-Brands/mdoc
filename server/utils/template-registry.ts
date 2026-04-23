/**
 * Each registry entry describes a template:
 *  - `label`        – human-readable name shown in the listing endpoint
 *  - `description`  – short explanation for the listing endpoint
 *  - `buildInputs`  – pure function: payload → pdfme `inputs` array
 *
 * To add a new template:
 *  1. Add its name to TEMPLATES in types.ts
 *  2. Add its payload interface to types.ts
 *  3. Add an entry here — nothing else needs to change
 */
type RegistryEntry<T> = {
  label: string
  description: string
  buildInputs: (data: T) => Record<string, string>[]
}

type TemplateRegistry = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in TemplateName]: RegistryEntry<any>
}

export const templateRegistry: TemplateRegistry = {
  quotation: {
    label: 'Quotation',
    description: 'Client-facing project quotation with budget breakdown and terms.',
    buildInputs: (data: QuotationPayload) => [
      {
        logoUrl: data.logoUrl,
        clientName: data.client.name,
        clientAddress: data.client.address,
        clientEmail: data.client.email,
        clientPhone: data.client.phone,
        quoteNumber: data.project.quoteNumber,
        quoteDate: data.project.quoteDate,
        quoteExpiry: data.project.quoteExpiry,
        shootDate: data.project.shootDate,
        shootLocation: data.project.shootLocation,
        budgetMarkdown: data.budgetMarkdown,
        termsMarkdown: data.termsMarkdown,
      },
    ],
  },
  'internship-completion-certificate': {
    label: 'Internship Completion Certificate',
    description: "Certificate acknowledging an intern's contribution and tenure.",
    buildInputs: (data: InternshipCompletionCertificatePayload) => [
      {
        recipientName: data.recipientName,
        bodyContent: [
          `This certificate acknowledges your outstanding contribution and dedication`,
          `as a ${data.recipientRole} towards ${data.scopeOfWork}`,
          `during ${data.startDate} - ${data.endDate},`,
          `showcasing your commitment to excellence and teamwork at ${data.companyName}.`,
        ].join(' '),
        dataOfIssue: data.dataOfIssue,
        signerSignature: data.signerSignature,
        signerTitle: data.signerTitle,
      },
    ],
  },
}
