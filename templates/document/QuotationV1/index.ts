import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'
import { parseMarkdown, type ParsedTerm } from '~/server/utils/markdown-parser.ts'

export const quotationSchema = z.object({
  pricingModel: z.enum(['project', 'day']).optional(),
  contact: z.object({
    name: z.string(),
    address: z.string(),
    email: z.email('Invalid client email'),
    phone: z.string(),
  }),
  project: z.object({
    title: z.string(),
    quoteNumber: z.string(),
    quoteDate: z.date(),
    shootDate: z.date(),
    shootLocation: z.string(),
  }),
  deliverables: z.array(
    z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      points: z.array(z.string()).optional(),
      quantity: z.number().min(0).optional(),
      rate: z.number().min(0).optional(),
    })
  ),
  financials: z
    .object({
      discountLabel: z.string().optional(),
      discountValue: z.number().min(0).optional(),
      isDiscountPercentage: z.boolean().optional(),
      taxLabel: z.string().optional(),
      taxRate: z.number().min(0).optional(),
    })
    .optional(),
  terms: z.object({
    content: z.string(),
    lastUpdated: z.date(),
  }),
  expiresIn: z.date(),
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
    contactEmail: z.string().email(),
    billingEmail: z.string().email(),
    whatsapp: z.string().optional(),
    socials: z.record(z.any(), z.any()).optional(),
    primaryContactId: z.string(),
    organizationMemberIds: z.array(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
})

export type QuotationPayload = z.infer<typeof quotationSchema>

type DeliverableInput = QuotationPayload['deliverables'][number]

const placeholders: QuotationPayload = {
  pricingModel: 'project',
  contact: {
    name: 'Wayne Enterprises',
    address: '1007 Mountain Drive, Gotham',
    email: 'billing@wayne.ent',
    phone: '+1 555-0199',
  },
  project: {
    title: 'Photography and Videography',
    quoteNumber: 'RCP-Q-78-2',
    quoteDate: new Date(),
    shootDate: new Date(),
    shootLocation: 'Gotham City',
  },
  deliverables: [
    { title: 'Premium Brand Strategy', quantity: 1, rate: 5000, description: 'Premium Brand Strategy' },
    { title: 'UI/UX Design System', quantity: 1, rate: 8500, points: [] },
  ],
  financials: {
    discountLabel: 'Discount',
    discountValue: 0,
    isDiscountPercentage: false,
    taxLabel: 'IGST @ 18%',
    taxRate: 18,
  },
  terms: {
    content: `### 1. Introduction\n\nBy using our photography/videography services (“Services”), you agree to comply with these Terms & Conditions (“Terms”), including our Privacy Policy. If you disagree with any provision herein, discontinue use of our Services immediately.\n\n### 2. Service Scope & Delivery\n\n- **Delivery Timeline:**\nPhotos and videos will be delivered within 10–20 days from the 2nd instalment.\nDelivery commences only after the second instalment is received.\n- **Deliverables Release:**\nDeliverables are only released post second instalment.\n- **Data Liability:**\nRED CAT PICTURES is not liable for data loss after one month from the shoot date.\nClients are advised to provide a hard drive on the shoot day for immediate backup.\n- **Digital Delivery:**\nAll deliverables will be provided via our secure RED CAT Drive and remain accessible for 6 months from the date of delivery.\nFor any storage holding beyond 6 months, additional charges will apply.\n- **Project Scope Changes:**\nAny modification, substitution, or update to the originally quoted deliverables, services, or shoot specifications after quotation approval will require a revised quotation, with corresponding adjustments to project timeline and budget.\nThe shoot or production will be held until such changes are documented and mutually agreed, and any additional costs or delays arising therefrom will be borne by the client.\n\n### 3. Shoot Arrangements & Supervision\n\n- **Editing Revisions:**\nEditing will begin only after a coordination meeting between the client and our team to review the brief, scope, and revision expectations. Once the final requirements are confirmed in writing via email, we will proceed with the editing work. Two rounds of editing revisions are included; any additional edits or modification requests beyond these two rounds will be subject to additional charges.\n- **Reshoot Policy:**\nAll reshoot requests except of Technical errors, regardless of the reason, will incur separate charges as per RED CAT PICTURES’ current rates.\nFree reshoots are provided only for technical errors when the client has explicitly specified requirements via mail and they were not met. This includes:\n    - Incorrect aspect ratio (when specified by client)\n    - Wrong product usage (when specified by client)\n    - Incorrect video duration (when specified by client)\n    - Other technical specifications explicitly provided by client in the brief\n\n    Clients must provide all technical requirements upfront. Any technical details not included in the original brief cannot be grounds for a free reshoot. Creative differences, subjective preferences, or changes in vision do not qualify as technical errors and are not eligible for free reshoots.\n\n- **Creative Supervision:**\nInterference in the creative process may impact the outcome;\nRED CAT PICTURES shall not be held liable for artistic dissatisfaction.\n\n### 4. Payment Terms\n\n- **Structure:**\n    - 20% advance payment at booking confirmation (shoot finalization).\n    - 70% due post shoot completion.\n    - Remaining 10% upon delivery of final materials.\n    - Advance payment must be completed at least 1 day prior to the scheduled shoot date.\n- **Banking Policy:**\nAll transactions must be conducted via bank transfer (NEFT/IMPS/RTGS/UPI).\nNo cash payments are accepted.\n- **Clearances:**\nPayment clearance is required prior to any corrections or changes in final deliverables.\n- **Travel & Accommodation:**\nCharges, if applicable, must be paid in advance.\n- **Invoice Disputes:**\nAny dispute with invoices must be raised within 7 days of issue.\n- **Due Date:**\nAll dues must be cleared within 7 days of final delivery; failure may put invoice and deliverables on hold.\n\n### 5. Cancellations & Postponements\n\n- **Advance Payment:**\nNon-refundable in case of cancellation or postponement initiated by the Client/Agency.\n- **Shoot Date Changes:**\nDate can be rescheduled only once within 29 days of advance payment.\nFailure to book a date in this window results in cancellation.\n\n### 6. Pricing & Adjustments\n\n- **Budget:**\nOnce the project is finalized with advance payment, budget is non-negotiable by the client.\n- **Large Scale Projects:**\nFor multi-individual projects, budget may increase to meet desired outcomes.\n- **Fee Variance:**\nRED CAT PICTURES reserves the right to reasonably adjust fee structures; taxes and applicable conversions extra.\n\n### 7. Copyrights & Usage\n\n- Copyright Law Compliance:\nIn accordance with the Copyright Act, 1957, RED CAT PICTURES retains original rights to all images and videos produced.\n- License Grant:\nThe client receives a lifetime commercial usage license for delivered materials.\n- **Promotional Use:**\nRED CAT PICTURES reserves the right to use the end client’s brand name and logo for promotional purposes-including display on our website, social media, blogs, and marketing platforms-unless a separate written agreement states otherwise.\n- **Content Ownership:**\nClients may not reverse engineer or misuse any platform/IP belonging to RED CAT PICTURES.\n\n### 8. Travel & Logistics\n\n- **Arrangements:**\nThe client is responsible for arranging necessary travel, accommodation, and meals for the production team for outside studio shoot.\n- **Team Welfare:**\nThe production team is entitled to regular meal breaks during production hours.\n\n### 9. Payments\n\nAll payments and transactions must be conducted via banking channels only; cash payments are not accepted.\n\n### 10. Behaviour & Termination\n\n- **Conduct:**\nMisconduct or inappropriate behaviour towards RED CAT PICTURES personnel is grounds for immediate termination of services without liability or refund.\n\n### 11. Indemnification\n\nClients indemnify and hold RED CAT PICTURES harmless from any claims, costs, or losses arising from use, misuse, or breach of these Terms.\n\n### 12. Governing Law\n\nThese Terms are governed by the laws of India.\nJurisdiction for disputes lies exclusively with the courts in Kolkata.\n\n### 13. Changes To Terms\n\nRED CAT PICTURES may modify these Terms at any time.\nContinued use of Services after modifications constitutes acceptance of the revised Terms.\n\n### 14. LLP Registration\n\n“GOLD FISH TALENTS LLP” is a registered LLP (Limited Liability Partnership) under the MCA of India. LLPIN ACS-4084`,
    lastUpdated: new Date(),
  },
  expiresIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

registerTemplate({
  id: 'quotation',
  fonts: [
    { name: 'Exo2', path: './asset/Exo2-Regular.ttf' },
    { name: 'Oxanium', path: './asset/Oxanium-Regular.ttf' },
  ],
  component: Component,
  schema: quotationSchema,
  placeholders,
  transformPayload: (rawData: QuotationPayload) => {
    const p = placeholders
    const org = rawData.organization || p.organization
    const orgBranding = org?.branding || p.organization!.branding
    const financials = rawData.financials || p.financials

    let safeLogoUrl = orgBranding?.logo || p.organization.branding.logo
    if (safeLogoUrl.endsWith('.svg')) {
      safeLogoUrl = safeLogoUrl.replace('.svg', '.png')
    }
    const rawTerms = rawData.terms?.content || p.terms.content
    const parsedTerms: ParsedTerm[] = parseMarkdown(rawTerms)

    return {
      pricingModel: rawData.pricingModel || p.pricingModel || 'project',

      organizationName: org?.name || p.organization!.name,
      organizationLegalName: org?.legalName || p.organization!.legalName,
      organizationEntityType: org?.entityType || p.organization!.entityType,
      organizationTradeRelationship: org?.tradeRelationship || p.organization!.tradeRelationship,
      organizationGstin: org?.gstin || p.organization!.gstin,
      organizationPan: org?.pan || p.organization!.pan,
      organizationAddress: org?.address || p.organization!.address,
      organizationLogo: safeLogoUrl,
      organizationFont: orgBranding?.font || p.organization!.branding!.font,
      organizationColorPrimary: orgBranding?.color?.primary || p.organization!.branding!.color!.primary,
      organizationColorAccent: orgBranding?.color?.accent || p.organization!.branding!.color!.accent,

      clientName: rawData.contact?.name || p.contact.name,
      clientAddress: rawData.contact?.address || p.contact.address,
      contactPhone: rawData.contact?.phone || p.contact.phone,
      contactEmail: rawData.contact?.email || p.contact.email,

      shootDate: rawData.project?.shootDate || p.project.shootDate,
      shootAddress: rawData.project?.shootLocation || p.project.shootLocation,
      projectTitle: rawData.project?.title || p.project.title,
      projectQuoteNumber: rawData.project?.quoteNumber || p.project.quoteNumber,
      projectIssuedDate: rawData.project?.quoteDate || p.project.quoteDate,
      expiresIn: rawData.expiresIn || p.expiresIn,

      deliverables: (rawData.deliverables || p.deliverables).map((item: DeliverableInput) => ({
        title: item.title ?? '',
        description: item.description ?? '',
        points: Array.isArray(item.points) ? item.points.filter((pt: string) => pt.trim() !== '') : [],
        rate: item.rate ?? 0,
        quantity: item.quantity ?? 1,
      })),

      discountLabel: financials?.discountLabel || 'Discount',
      discountValue: financials?.discountValue || 0,
      isDiscountPercentage: financials?.isDiscountPercentage || false,
      taxLabel: financials?.taxLabel || 'Tax',
      taxRate: financials?.taxRate || 0,

      accountName: org?.accountDetails?.accountName || p.organization!.accountDetails.accountName,
      accountNumber: org?.accountDetails?.accountNumber || p.organization!.accountDetails.accountNumber,
      bankName: org?.accountDetails?.bankName || p.organization!.accountDetails.bankName,
      ifscCode: org?.accountDetails?.ifscCode || p.organization!.accountDetails.ifscCode,
      parsedTerms,
    }
  },
  signerFields: [
    {
      id: 'client-signature',
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
      id: 'client-signature',
      type: 'SIGNATURE',
      signerOrder: 1,
      pageIndex: -1,
      x: 360,
      y: 604 - 30,
      width: 150,
      height: 40,
      required: true,
    },
    {
      id: 'client-name',
      type: 'NAME',
      signerOrder: 1,
      pageIndex: -1,
      x: 360,
      y: 556 - 30,
      width: 150,
      height: 40,
      fontSize: 12,
    },
    {
      id: 'client-date',
      type: 'DATE',
      signerOrder: 1,
      pageIndex: -1,
      x: 360,
      y: 508 - 30,
      width: 150,
      height: 40,
      fontSize: 12,
    },
    {
      id: 'client-city',
      type: 'TEXT',
      signerOrder: 1,
      pageIndex: -1,
      x: 360,
      y: 460 - 30,
      width: 150,
      height: 40,
      fontSize: 12,
      required: false,
    },
    {
      id: 'company-signature',
      type: 'SIGNATURE',
      signerOrder: 2,
      pageIndex: -1,
      x: 105,
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
      x: 105,
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
      x: 105,
      y: 508 - 30,
      width: 150,
      height: 40,
      fontSize: 12,
    },
    {
      id: 'company-city',
      type: 'TEXT',
      signerOrder: 2,
      pageIndex: -1,
      x: 105,
      y: 460 - 30,
      width: 150,
      height: 40,
      fontSize: 12,
    },
  ],
})
