import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'
import { organizationSchema, placeholderOrganization } from '../_shared/organization'

export const receiptSchema = z.object({
  recipient: z.object({
    name: z.string(),
    company: z.string().optional(),
    address: z.string(),
    email: z.email('Invalid recipient email'),
    phone: z.string().optional(),
  }),
  receipt: z.object({
    receiptNumber: z.string(),
    invoiceNumber: z.string().optional(),
    orderNumber: z.string().optional(),
    paidDate: z.coerce.date(),
    nextBillingDate: z.coerce.date().optional(),
    items: z.array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        periodStart: z.coerce.date().optional(),
        periodEnd: z.coerce.date().optional(),
        quantity: z.number().min(0).optional(),
        rate: z.number().min(0).optional(),
        discount: z.number().min(0).optional(),
        taxRate: z.number().min(0).optional(),
      })
    ),
  }),
  financials: z
    .object({
      taxLabel: z.string().optional(),
      currency: z.string().optional(),
      amountPaid: z.number().min(0).optional(),
    })
    .optional(),
  organization: organizationSchema,
})

export type ReceiptPayload = z.infer<typeof receiptSchema>

const placeholders: ReceiptPayload = {
  recipient: {
    name: 'Bruce Wayne',
    company: 'Wayne Enterprises',
    address: '1007 Mountain Drive, Gotham',
    email: 'billing@wayne.ent',
    phone: '+1 555-0199',
  },
  receipt: {
    receiptNumber: 'RCP-0001',
    invoiceNumber: 'INV-0001',
    orderNumber: 'ORD-0001',
    paidDate: new Date(),
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    items: [
      {
        title: 'Premium Hosting',
        description: 'Annual plan, 48 months',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        quantity: 1,
        rate: 12_000,
        discount: 2000,
        taxRate: 18,
      },
    ],
  },
  financials: { taxLabel: 'IGST @ 18%', currency: 'INR' },
  organization: placeholderOrganization,
}

registerTemplate({
  id: 'receipt',
  label: 'Payment Receipt',
  shortLabel: 'Receipt',
  category: 'Billing',
  organizationFields: ['address'],
  description: 'Proof of payment listing the items paid for, taxes applied and the amount received.',
  fonts: [
    { name: 'Exo2', family: 'Exo 2', weights: [400], path: './asset/Exo2-Regular.ttf' },
    { name: 'Oxanium', family: 'Oxanium', weights: [400], path: './asset/Oxanium-Regular.ttf' },
  ],
  component: Component,
  schema: receiptSchema,
  placeholders,
  transformPayload: async (rawData: ReceiptPayload) => {
    const p = placeholders
    const org = rawData.organization
    const orgBranding = org.branding
    const receipt = rawData.receipt
    const financials = rawData.financials

    let safeLogoUrl = orgBranding.logo ?? ''
    if (safeLogoUrl.endsWith('.svg')) {
      safeLogoUrl = safeLogoUrl.replace('.svg', '.png')
    }

    return {
      organizationName: org.name,
      organizationLegalName: org.legalName,
      organizationGstin: org.gstin,
      organizationPan: org.pan,
      organizationAddress: org.address,
      organizationLogo: safeLogoUrl,
      organizationFont: orgBranding.font,
      organizationColorPrimary: orgBranding.color.primary,
      organizationColorAccent: orgBranding.color.accent,

      clientName: rawData.recipient?.name || p.recipient.name,
      clientCompany: rawData.recipient?.company,
      clientAddress: rawData.recipient?.address || p.recipient.address,
      clientEmail: rawData.recipient?.email || p.recipient.email,
      clientPhone: rawData.recipient?.phone,

      receiptNumber: receipt?.receiptNumber || p.receipt.receiptNumber,
      invoiceNumber: receipt?.invoiceNumber,
      orderNumber: receipt?.orderNumber,
      paidDate: receipt?.paidDate || p.receipt.paidDate,
      nextBillingDate: receipt?.nextBillingDate,
      items: (receipt?.items || p.receipt.items).map((item) => ({
        title: item.title ?? '',
        description: item.description ?? '',
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        quantity: item.quantity ?? 1,
        rate: item.rate ?? 0,
        discount: item.discount ?? 0,
        taxRate: item.taxRate ?? 0,
      })),

      taxLabel: financials?.taxLabel || 'Tax',
      currency: financials?.currency || 'INR',
      amountPaid: financials?.amountPaid,
    }
  },
  signerFields: [],
})
