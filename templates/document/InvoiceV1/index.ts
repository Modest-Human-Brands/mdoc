import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'

export const invoiceSchema = z.object({
  pricingModel: z.enum(['project', 'day']).optional(),
  contact: z.object({
    name: z.string(),
    address: z.string(),
    email: z.email('Invalid client email'),
    phone: z.string(),
  }),
  project: z.object({
    title: z.string(),
    invoiceNumber: z.string(),
    quotationNumber: z.string(),
    invoiceDate: z.date(),
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
      amountPaid: z.number().min(0).optional(),
    })
    .optional(),
  dueDate: z.date(),
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

export type InvoicePayload = z.infer<typeof invoiceSchema>

const placeholders: InvoicePayload = {
  pricingModel: 'project',
  contact: {
    name: 'Wayne Enterprises',
    address: '1007 Mountain Drive, Gotham',
    email: 'billing@wayne.ent',
    phone: '+1 555-0199',
  },
  project: {
    title: 'Photography and Videography',
    invoiceNumber: 'RCP-I-78-2-1',
    quotationNumber: 'RCP-Q-78-2',
    invoiceDate: new Date(),
  },
  deliverables: [
    { title: 'Premium Brand Strategy', quantity: 1, rate: 5000, description: 'Final project delivery' },
    { title: 'UI/UX Design System', quantity: 1, rate: 8500, points: [] },
  ],
  financials: {
    discountLabel: 'Discount',
    discountValue: 0,
    isDiscountPercentage: false,
    taxLabel: 'IGST @ 18%',
    taxRate: 18,
    amountPaid: 13_500,
  },
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
  id: 'invoice',
  fonts: [
    { name: 'Exo2', path: './asset/Exo2-Regular.ttf' },
    { name: 'Oxanium', path: './asset/Oxanium-Regular.ttf' },
  ],
  component: Component,
  schema: invoiceSchema,
  placeholders,
  transformPayload: (rawData: InvoicePayload) => {
    const p = placeholders
    const org = rawData.organization || p.organization
    const orgBranding = org?.branding || p.organization!.branding
    const financials = rawData.financials || p.financials

    let safeLogoUrl = orgBranding?.logo || p.organization.branding.logo
    if (safeLogoUrl.endsWith('.svg')) {
      safeLogoUrl = safeLogoUrl.replace('.svg', '.png')
    }

    return {
      pricingModel: rawData.pricingModel || p.pricingModel,

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

      projectTitle: rawData.project?.title || p.project.title,
      projectInvoiceNumber: rawData.project?.invoiceNumber || p.project.invoiceNumber,
      projectQuotationNumber: rawData.project?.quotationNumber || p.project.quotationNumber,
      projectIssuedDate: rawData.project?.invoiceDate || p.project.invoiceDate,
      dueDate: rawData.dueDate || p.dueDate,

      deliverables: (rawData.deliverables || p.deliverables).map((item) => ({
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
      amountPaid: financials?.amountPaid || 0,

      accountName: org?.accountDetails?.accountName || p.organization!.accountDetails.accountName,
      accountNumber: org?.accountDetails?.accountNumber || p.organization!.accountDetails.accountNumber,
      bankName: org?.accountDetails?.bankName || p.organization!.accountDetails.bankName,
      ifscCode: org?.accountDetails?.ifscCode || p.organization!.accountDetails.ifscCode,
    }
  },
})
