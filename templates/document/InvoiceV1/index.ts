import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'
import { organizationSchema, placeholderOrganization } from '../_shared/organization'

export const invoiceSchema = z.object({
  recipient: z.object({
    name: z.string(),
    address: z.string(),
    email: z.email('Invalid recipient email'),
    phone: z.string(),
  }),
  pricingModel: z.enum(['project', 'day']).optional(),
  project: z.object({
    title: z.string(),
    quoteNumber: z.string(),
    quoteDate: z.coerce.date(),
    invoiceNumber: z.string(),
    invoiceDate: z.coerce.date(),
    shootDate: z.coerce.date(),
    shootLocation: z.string(),
    deliverables: z.array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        points: z.array(z.string()).optional(),
        quantity: z.number().min(0).optional(),
        rate: z.number().min(0).optional(),
      })
    ),
  }),
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
  dueDate: z.coerce.date(),
  organization: organizationSchema,
})

export type InvoicePayload = z.infer<typeof invoiceSchema>

const placeholders: InvoicePayload = {
  recipient: {
    name: 'Wayne Enterprises',
    address: '1007 Mountain Drive, Gotham',
    email: 'billing@wayne.ent',
    phone: '+1 555-0199',
  },
  pricingModel: 'project',
  project: {
    title: 'Test Project',
    quoteNumber: 'RCP-Q-78-2',
    quoteDate: new Date(),
    shootDate: new Date(),
    shootLocation: 'Gotham City',
    invoiceNumber: 'RCP-I-78-2-1',
    invoiceDate: new Date(),
    deliverables: [
      { title: 'Premium Brand Strategy', quantity: 1, rate: 5000, description: 'Final project delivery' },
      { title: 'UI/UX Design System', quantity: 1, rate: 8500, points: [] },
    ],
  },
  financials: {
    discountLabel: 'Discount',
    discountValue: 0,
    isDiscountPercentage: false,
    taxLabel: 'IGST @ 18%',
    taxRate: 18,
    amountPaid: 13_500,
  },
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  organization: placeholderOrganization,
}

registerTemplate({
  id: 'invoice',
  label: 'Billing Invoice',
  shortLabel: 'Invoice',
  category: 'Billing',
  organizationFields: ['address', 'accountDetails'],
  description: 'The official document outlining the charges, payment terms, and amount due.',
  fonts: [
    { name: 'Exo2', family: 'Exo 2', weights: [400], path: './asset/Exo2-Regular.ttf' },
    { name: 'Oxanium', family: 'Oxanium', weights: [400], path: './asset/Oxanium-Regular.ttf' },
  ],
  component: Component,
  schema: invoiceSchema,
  placeholders,
  transformPayload: async (rawData: InvoicePayload) => {
    const p = placeholders
    const org = rawData.organization
    const orgBranding = org.branding
    const financials = rawData.financials

    let safeLogoUrl = orgBranding.logo ?? ''
    if (safeLogoUrl.endsWith('.svg')) {
      safeLogoUrl = safeLogoUrl.replace('.svg', '.png')
    }

    return {
      pricingModel: rawData.pricingModel || p.pricingModel,

      organizationName: org.name,
      organizationLegalName: org.legalName,
      organizationEntityType: org.entityType,
      organizationTradeRelationship: org.tradeRelationship,
      organizationGstin: org.gstin,
      organizationPan: org.pan,
      organizationAddress: org.address,
      organizationLogo: safeLogoUrl,
      organizationFont: orgBranding.font,
      organizationColorPrimary: orgBranding.color.primary,
      organizationColorAccent: orgBranding.color.accent,

      clientName: rawData.recipient?.name || p.recipient.name,
      clientAddress: rawData.recipient?.address || p.recipient.address,
      contactPhone: rawData.recipient?.phone || p.recipient.phone,
      contactEmail: rawData.recipient?.email || p.recipient.email,

      projectTitle: rawData.project?.title || p.project.title,
      projectQuotationNumber: rawData.project?.quoteNumber || p.project.quoteNumber,
      projectInvoiceNumber: rawData.project?.invoiceNumber || p.project.invoiceNumber,
      projectIssuedDate: rawData.project?.invoiceDate || p.project.invoiceDate,
      deliverables: (rawData.project.deliverables || p.project.deliverables).map((item) => ({
        title: item.title ?? '',
        description: item.description ?? '',
        points: Array.isArray(item.points) ? item.points.filter((pt: string) => pt.trim() !== '') : [],
        rate: item.rate ?? 0,
        quantity: item.quantity ?? 1,
      })),
      dueDate: rawData.dueDate || p.dueDate,

      discountLabel: financials?.discountLabel || 'Discount',
      discountValue: financials?.discountValue || 0,
      isDiscountPercentage: financials?.isDiscountPercentage || false,
      taxLabel: financials?.taxLabel || 'Tax',
      taxRate: financials?.taxRate || 0,
      amountPaid: financials?.amountPaid || 0,

      accountName: org.accountDetails?.accountName,
      accountNumber: org.accountDetails?.accountNumber,
      bankName: org.accountDetails?.bankName,
      ifscCode: org.accountDetails?.ifscCode,
    }
  },
  signerFields: [],
})
