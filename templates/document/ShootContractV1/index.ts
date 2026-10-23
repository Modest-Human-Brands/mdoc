import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'
import { organizationSchema, placeholderOrganization } from '../_shared/organization'
import parseMarkdown from '~/server/utils/parse-markdown.ts'
import { type ParsedTerm } from '~/server/utils/parse-markdown.ts'

export const shootContractSchema = z.object({
  recipient: z.object({
    name: z.string(),
    address: z.string(),
    email: z.email('Invalid recipient email'),
    phone: z.string(),
  }),
  project: z.object({
    title: z.string(),
    quoteNumber: z.string(),
    quoteDate: z.coerce.date(),
    shootDate: z.coerce.date(),
    shootLocation: z.string(),
    callTime: z.iso.time(),
  }),
  deliverables: z.array(z.string()),
  totalAmount: z.number(),
  serviceCategory: z.string(),
  advancePercentage: z.number().min(0).max(100).optional().default(0),
  agreementDate: z.coerce.date(),
  expiresIn: z.coerce.date(),
  terms: z.object({
    content: z.string().meta({ 'x-boilerplate': true }),
    lastUpdated: z.coerce.date(),
  }),
  organization: organizationSchema,
})

export type ShootContractPayload = z.infer<typeof shootContractSchema>

const placeholders: ShootContractPayload = {
  recipient: {
    name: 'Jane Doe',
    address: '1007 Mountain Drive, Gotham',
    email: 'billing@wayne.ent',
    phone: '+1 555-0199',
  },
  project: {
    title: 'Photography and Videography',
    quoteNumber: 'QT-2026-089',
    quoteDate: new Date(),
    shootDate: new Date(),
    shootLocation: 'Gotham City / Remote',
    callTime: '08:00 AM',
  },
  deliverables: ['1x 60-second highlight video (4K resolution)', '50 edited high-resolution photographs', 'Delivery of all raw footage and unedited image files'],
  totalAmount: 0,
  serviceCategory: 'Media Production',
  advancePercentage: 0,
  agreementDate: new Date(),
  terms: {
    content: `### 1. Scope of Work & Deliverables\n\nThe Service Provider agrees to provide the agreed services for the project detailed above, including the outlined deliverables.\n\n### 2. Compensation & Payment Terms\n\nThe Company agrees to pay the Service Provider the total agreed fee.\n\n- **Advance:** An advance payment shall be paid to the Service Provider prior to project commencement.\n- **Remaining Balance:** The remaining balance will be paid within 2-3 business days after the Company receives the final payment amount from the client.\n- **Expenses:** The Company shall not reimburse the Service Provider for out-of-pocket expenses (e.g., travel, parking, equipment rentals) incurred during the project if not decided formally via mail.\n\n### 3. Copyright & Ownership (Work Made for Hire)\n\nAll media, raw files, and deliverables created under this Agreement shall be considered a "work made for hire."\n\n- **Company Rights:** RED CAT PICTURES shall be the exclusive owner of all rights, titles, and interests in the media, including all copyrights. The Company has the unrestricted right to use, edit, distribute, and publish the media across all platforms globally and in perpetuity.\n- **Portfolio Rights:** The Service Provider may use the final, publicly released media for their personal portfolio, provided they credit the Company.\n\n### 4. Cancellation & Rescheduling\n\n- **By the Company:** If the Company cancels the engagement within 48 hours of the scheduled call time, the Service Provider shall not be entitled to the balance.\n- **By the Service Provider:** If unable to perform due to emergency, they must secure a replacement of equal skill immediately.\n\n### 5. Independent Contractor Status\n\nThe Service Provider is an independent contractor. Nothing in this Agreement shall be construed to create an employer-employee relationship.\n\n### 6. Liability & Indemnification\n\n- **Data Loss:** The Service Provider shall implement standard backup protocols. In the unlikely event of total data failure, liability shall be limited to the forfeiture of the agreed fee.`,
    lastUpdated: new Date(),
  },
  expiresIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  organization: placeholderOrganization,
}

registerTemplate({
  id: 'shoot-contract',
  label: 'Shoot Contract',
  shortLabel: 'Shoot contract',
  category: 'Contracts',
  organizationFields: ['address'],
  description: 'The formal agreement or legal document outlining scope, terms, and obligations between parties.',
  fonts: [
    { name: 'Exo2', family: 'Exo 2', weights: [400], path: './asset/Exo2-Regular.ttf' },
    { name: 'Oxanium', family: 'Oxanium', weights: [400], path: './asset/Oxanium-Regular.ttf' },
  ],
  schema: shootContractSchema,
  placeholders,
  component: Component,
  transformPayload: async (rawData: ShootContractPayload) => {
    const p = placeholders
    const org = rawData.organization
    const orgBranding = org.branding
    const rawTerms = rawData.terms?.content || p.terms.content

    const transformedVariables = {
      organizationName: org.name,
      organizationLegalName: org.legalName,
      organizationEntityType: org.entityType,
      organizationTradeRelationship: org.tradeRelationship,
      organizationGstin: org.gstin,
      organizationPan: org.pan,
      organizationAddress: org.address,
      organizationLogo: orgBranding.logo ?? '',
      organizationFont: orgBranding.font,
      organizationColorPrimary: orgBranding.color.primary,
      organizationColorAccent: orgBranding.color.accent,
      agreementDate: rawData.agreementDate || p.agreementDate,

      contractorName: rawData.recipient?.name || p.recipient.name,
      contractorAddress: rawData.recipient?.address || p.recipient.address,
      contractorPhone: rawData.recipient?.phone || p.recipient.phone,
      contractorEmail: rawData.recipient?.email || p.recipient.email,

      projectTitle: rawData.project?.title || p.project.title,
      projectQuoteNumber: rawData.project?.quoteNumber || p.project.quoteNumber,
      serviceCategory: rawData.serviceCategory || p.serviceCategory,
      shootDate: rawData.project?.shootDate || p.project.shootDate,
      shootLocation: rawData.project?.shootLocation || p.project.shootLocation,
      callTime: rawData.project?.callTime || p.project.callTime,
      expiresIn: rawData.expiresIn || p.expiresIn,

      deliverables: rawData.deliverables && rawData.deliverables.length > 0 ? rawData.deliverables : p.deliverables,
      totalAmount: rawData.totalAmount || p.totalAmount,
      advancePercentage: rawData.advancePercentage ?? p.advancePercentage ?? 35,
      advanceAmount: (rawData.totalAmount * (rawData?.advancePercentage || p.advancePercentage)) / 100,
      balanceAmount: rawData.totalAmount - (rawData.totalAmount * (rawData?.advancePercentage || p.advancePercentage)) / 100,
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
