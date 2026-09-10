import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'
import parseMarkdown from '~/server/utils/parse-markdown.ts'
import { type ParsedTerm } from '~/server/utils/parse-markdown.ts'

export const retainerContractSchema = z.object({
  contact: z.object({
    name: z.string(),
    role: z.string(),
    address: z.string(),
    email: z.email('Invalid client email'),
    phone: z.string(),
  }),
  engagement: z.object({
    title: z.string(), // e.g. "Performance Marketing Retainer" / "Frontend Development Retainer"
    quoteNumber: z.string(),
    quoteDate: z.date(),
    startDate: z.date(),
    engagementMonths: z.number().int().min(1),
    renewalType: z.enum(['Auto-Renew', 'Manual Renewal', 'Fixed Term - No Renewal']),
    noticePeriodDays: z.number().int().min(0).default(30),
  }),
  serviceCategory: z.string(), // e.g. 'Marketing', 'Development', 'Marketing & Development'
  scopeOfWork: z.array(z.string()), // recurring monthly scope items / deliverables
  compensation: z
    .object({
      flatMonthlyFee: z.number().min(0).optional(),
      targetBasedFees: z
        .array(
          z.object({
            description: z.string(),
            amountPerUnit: z.number().min(0),
            unit: z.string(),
          })
        )
        .min(1)
        .optional(),
      onboardingFee: z.number().min(0).optional(),
      currency: z.string().default('INR'),
    })
    .refine((data) => data.flatMonthlyFee !== undefined || (data.targetBasedFees && data.targetBasedFees.length > 0), {
      message: 'At least one of flatMonthlyFee or targetBasedFees must be provided',
      path: ['flatMonthlyFee'],
    }),
  agreementDate: z.date(),
  expiresIn: z.date(),
  terms: z.object({
    content: z.string(),
    lastUpdated: z.date(),
  }),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    legalName: z.string(),
    entityType: z.enum(['LLP', 'Private Limited', 'Proprietorship']),
    tradeRelationship: z.enum(['Primary', 'Trading As', 'Operating Division', 'Wholly-Owned Subsidiary', 'Special Purpose Vehicle']),
    gstin: z.string().optional(),
    pan: z.string().optional(),
    address: z.string(),
    foundedYear: z.number(),
    accountDetails: z.object({
      accountName: z.string(),
      accountNumber: z.number(),
      bankName: z.string(),
      ifscCode: z.string(),
    }),
    branding: z.object({
      logo: z.string(),
      color: z.object({
        primary: z.string(),
        accent: z.string(),
      }),
      font: z.string(),
    }),
    website: z.string().optional(),
    phone: z.string().optional(),
    contactEmail: z.email(),
    billingEmail: z.email(),
    whatsapp: z.string().optional(),
    socials: z.record(z.any(), z.any()).optional(),
    primaryContactId: z.string(),
    organizationMemberIds: z.array(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
})

export type RetainerContractPayload = z.infer<typeof retainerContractSchema>

const placeholders: RetainerContractPayload = {
  contact: {
    name: 'Jane Doe',
    role: 'Marketing Consultant',
    address: '1007 Mountain Drive, Gotham',
    email: 'billing@wayne.ent',
    phone: '+1 555-0199',
  },
  engagement: {
    title: 'Performance Marketing Retainer',
    quoteNumber: 'RT-2026-089',
    quoteDate: new Date(),
    startDate: new Date(),
    engagementMonths: 6,
    renewalType: 'Manual Renewal',
    noticePeriodDays: 15,
  },
  serviceCategory: 'Marketing',
  scopeOfWork: [
    'Monthly performance marketing strategy and execution across paid channels',
    'Weekly reporting on spend, reach, and conversion metrics',
    'Ongoing creative and copy iteration based on campaign performance',
  ],
  compensation: {
    flatMonthlyFee: 20_000,
    targetBasedFees: [
      {
        description: 'Bonus for every signed foreign clients closed directly from campaign traffic',
        amountPerUnit: 1000,
        unit: 'signed foreign client',
      },
      {
        description: 'Bonus for every signed Indian clients closed directly from campaign traffic',
        amountPerUnit: 500,
        unit: 'signed Indian client',
      },
    ],
    onboardingFee: 0,
    currency: 'INR',
  },
  agreementDate: new Date(),
  expiresIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  terms: {
    content: `### 1. Scope of Engagement

The Service Provider agrees to provide the services described in the Scope of Work for {{organizationName}} on a recurring monthly basis for the duration of this Agreement.

### 2. Term & Renewal

This Agreement begins on the Start Date and continues for the Engagement Duration stated above ("Initial Term").

- **Auto-Renew:** Unless either party gives written notice of non-renewal at least {{noticePeriodDays}} days before the end of the current term, this Agreement automatically renews for successive terms of the same length.
- **Manual Renewal:** At the end of the Initial Term, this Agreement expires unless both parties agree in writing to renew it.
- **Fixed Term - No Renewal:** This Agreement expires automatically at the end of the Initial Term and does not renew.

The renewal method that applies to this Agreement is stated in the Engagement Summary above.

### 3. Compensation & Payment Terms

- **Flat Monthly Fee:** Where a flat monthly fee applies, it is invoiced at the start of each monthly billing cycle and is due within 7 days of invoice.
- **Target-Based Fee:** Where a target-based fee applies, it is calculated and invoiced at the end of each monthly billing cycle based on actual units delivered during that month, and is due within 7 days of invoice.
- **Onboarding Fee:** Where a one-time onboarding fee applies, it is due prior to commencement of work and is non-refundable once work has begun.
- Late payments beyond 15 days of the invoice due date may result in suspension of services until the outstanding balance is settled.

### 4. Termination

- Either party may terminate this Agreement for convenience by providing at least {{noticePeriodDays}} days' written notice to the other party.
- Either party may terminate this Agreement immediately for material breach that remains uncured 10 days after written notice of the breach.
- Upon termination, the Service Provider shall be compensated for all work completed and units delivered up to the effective date of termination.

### 5. Ownership & Intellectual Property

All campaign materials, code, designs, strategy documents, and other work product created specifically for {{organizationName}} under this Agreement shall be the exclusive property of {{organizationName}} upon full payment. The Service Provider retains the right to reference the engagement (without confidential details) in their portfolio or case studies, provided the Company approves the description in advance.

### 6. Confidentiality

Both parties agree to keep confidential any non-public business, financial, technical, or strategic information disclosed during the course of this engagement, and to use such information solely for the purpose of performing under this Agreement.

### 7. Independent Contractor Status

The Service Provider is an independent contractor. Nothing in this Agreement shall be construed to create an employer-employee relationship, partnership, or joint venture between the parties.

### 8. Liability & Indemnification

Each party's liability arising out of this Agreement shall be limited to the fees paid or payable under this Agreement in the three (3) months preceding the event giving rise to the claim, except in cases of gross negligence, willful misconduct, or breach of confidentiality.`,
    lastUpdated: new Date(),
  },
  organization: {
    id: 'modest-human-brands',
    name: 'Modest Human Brands',
    legalName: 'Modest Human Brands LLP',
    entityType: 'LLP',
    tradeRelationship: 'Primary',
    gstin: undefined,
    pan: 'ABCDE0123F',
    address: 'Abc Road, Near DEF, UIO - 1890',
    foundedYear: 2020,
    accountDetails: {
      accountName: 'Modest Human Brands LLP',
      accountNumber: 1_234_567_890,
      bankName: 'HDFC Bank',
      ifscCode: 'HDFC0001234',
    },
    website: 'https://modesthumanbrands.com',
    contactEmail: 'hello@modesthumanbrands.com',
    billingEmail: 'billing@modesthumanbrands.com',
    primaryContactId: 'contact-1',
    organizationMemberIds: ['member-1'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    branding: {
      logo: 'https://modesthumanbrands.com/logo.svg',
      color: {
        primary: '#2B2B2B',
        accent: '#4A85FF',
      },
      font: 'Exo2',
    },
  },
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

registerTemplate({
  id: 'retainer-contract',
  label: 'Retainer Contract',
  description: 'A recurring monthly engagement agreement for marketing or development work, billed as a flat fee and/or a target-based fee.',
  fonts: [
    { name: 'Exo2', path: './asset/Exo2-Regular.ttf' },
    { name: 'Oxanium', path: './asset/Oxanium-Regular.ttf' },
  ],
  schema: retainerContractSchema,
  placeholders,
  component: Component,
  transformPayload: async (rawData: RetainerContractPayload) => {
    const p = placeholders
    const org = rawData.organization || p.organization
    const orgBranding = org?.branding || p.organization!.branding
    const rawTerms = rawData.terms?.content || p.terms.content

    const engagement = rawData.engagement || p.engagement
    const compensation = rawData.compensation || p.compensation
    const endDate = addMonths(engagement.startDate, engagement.engagementMonths)

    const flatMonthlyFee = compensation.flatMonthlyFee
    const targetFees = compensation.targetBasedFees

    const transformedVariables = {
      organizationName: org?.name || p.organization!.name,
      organizationLegalName: org?.legalName || p.organization!.legalName,
      organizationEntityType: org?.entityType || p.organization!.entityType,
      organizationTradeRelationship: org?.tradeRelationship || p.organization!.tradeRelationship,
      organizationGstin: org?.gstin || p.organization!.gstin,
      organizationPan: org?.pan || p.organization!.pan,
      organizationAddress: org?.address || p.organization!.address,
      organizationLogo: orgBranding?.logo || p.organization.branding.logo,
      organizationFont: orgBranding?.font || p.organization!.branding!.font,
      organizationColorPrimary: orgBranding?.color?.primary || p.organization!.branding!.color!.primary,
      organizationColorAccent: orgBranding?.color?.accent || p.organization!.branding!.color!.accent,
      agreementDate: rawData.agreementDate || p.agreementDate,

      contractorName: rawData.contact?.name || p.contact.name,
      contractorRole: rawData.contact?.role || p.contact.role,
      contractorAddress: rawData.contact?.address || p.contact.address,
      contractorPhone: rawData.contact?.phone || p.contact.phone,
      contractorEmail: rawData.contact?.email || p.contact.email,

      engagementTitle: engagement.title,
      engagementQuoteNumber: engagement.quoteNumber,
      serviceCategory: rawData.serviceCategory || p.serviceCategory,
      startDate: engagement.startDate,
      endDate,
      engagementMonths: engagement.engagementMonths,
      renewalType: engagement.renewalType,
      noticePeriodDays: engagement.noticePeriodDays ?? 30,
      expiresIn: rawData.expiresIn || p.expiresIn,

      scopeOfWork: rawData.scopeOfWork && rawData.scopeOfWork.length > 0 ? rawData.scopeOfWork : p.scopeOfWork,

      currency: compensation.currency || 'INR',
      flatMonthlyFee,
      targetBasedFees: targetFees,
      onboardingFee: compensation.onboardingFee || 0,
    }

    const parsedTerms: ParsedTerm[] = parseMarkdown(rawTerms, { ...transformedVariables })

    return { ...transformedVariables, parsedTerms }
  },
  signerFields: [
    {
      id: 'contractor-signature',
      type: 'SIGNATURE',
      signerOrder: 1,
      pageIndex: 'all-except-last',
      x: 405,
      y: 45,
      width: 150,
      height: 40,
      required: true,
    },
    {
      id: 'contractor-signature',
      type: 'SIGNATURE',
      signerOrder: 1,
      pageIndex: -1,
      x: 360 + 10,
      y: 604 - 30,
      width: 150,
      height: 40,
      required: true,
    },
    {
      id: 'contractor-name',
      type: 'NAME',
      signerOrder: 1,
      pageIndex: -1,
      x: 360 + 10,
      y: 556 - 30,
      width: 150,
      height: 40,
      fontSize: 12,
    },
    {
      id: 'contractor-date',
      type: 'DATE',
      signerOrder: 1,
      pageIndex: -1,
      x: 360 + 10,
      y: 508 - 30,
      width: 150,
      height: 40,
      fontSize: 10,
      required: true,
    },
    {
      id: 'contractor-city',
      type: 'TEXT',
      signerOrder: 1,
      pageIndex: -1,
      x: 360 + 10,
      y: 460 - 30,
      width: 150,
      height: 40,
      fontSize: 10,
      required: true,
    },
    {
      id: 'company-signature',
      type: 'SIGNATURE',
      signerOrder: 2,
      pageIndex: -1,
      x: 105 + 10,
      y: 604 - 30,
      width: 150,
      height: 40,
      required: true,
    },
    {
      id: 'company-name',
      type: 'NAME',
      signerOrder: 2,
      pageIndex: -1,
      x: 105 + 10,
      y: 556 - 30,
      width: 150,
      height: 40,
      fontSize: 12,
    },
    {
      id: 'company-date',
      type: 'DATE',
      signerOrder: 2,
      pageIndex: -1,
      x: 105 + 10,
      y: 508 - 30,
      width: 150,
      height: 40,
      fontSize: 10,
      required: true,
    },
    {
      id: 'company-city',
      type: 'TEXT',
      signerOrder: 2,
      pageIndex: -1,
      x: 105 + 10,
      y: 460 - 30,
      width: 150,
      height: 40,
      fontSize: 12,
    },
  ],
})
