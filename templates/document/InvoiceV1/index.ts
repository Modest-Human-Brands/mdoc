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
  accountDetails: z.object({
    accountName: z.string(),
    accountNumber: z.number(),
    bankName: z.string(),
    ifscCode: z.string(),
  }),
  dueDate: z.date(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    website: z.string(),
    branding: z.object({
      logo: z.string().url(),
      color: z.object({
        primary: z.string(),
        accent: z.string(),
      }),
      font: z.string(),
    }),
    socials: z.record(z.any(), z.any()).optional(),
  }),
})

export type InvoicePayload = z.infer<typeof invoiceSchema>

type DeliverableInput = InvoicePayload['deliverables'][number]

interface ComputedDeliverable {
  title: string
  description: string
  points: string[]
  rate: number
  quantity: number
  amount: number
}

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
    amountPaid: 13_500, // Simulating a fully paid invoice
  },
  accountDetails: {
    accountName: 'Modest Human Brands',
    accountNumber: 1_234_567_890,
    bankName: 'HDFC Bank',
    ifscCode: 'HDFC0001234',
  },
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  organization: {
    id: 'modest-human-brands',
    name: 'Modest Human Brands',
    address: 'Abc Road, Near DEF, UIO - 1890',
    website: 'https://modesthumanbrands.com',
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

    const computedDeliverables: ComputedDeliverable[] = (rawData.deliverables || p.deliverables).map((item: DeliverableInput) => {
      const qty = item.quantity ?? 1
      const rate = item.rate ?? 0
      const rowTotal = qty * rate

      return {
        title: item.title ?? '',
        description: item.description ?? '',
        points: Array.isArray(item.points) ? item.points.filter((pt: string) => pt.trim() !== '') : [],
        rate: rate,
        quantity: qty,
        amount: rowTotal,
      }
    })

    const subtotal = computedDeliverables.reduce((acc: number, curr: ComputedDeliverable) => acc + curr.amount, 0)

    let discountAmount = 0
    const financials = rawData.financials || p.financials
    const discountValue = financials?.discountValue || 0

    if (financials?.isDiscountPercentage) {
      discountAmount = (subtotal * discountValue) / 100
    } else {
      discountAmount = discountValue
    }

    const postDiscountTotal = subtotal - discountAmount
    const taxRate = financials?.taxRate || 0
    const taxAmount = (postDiscountTotal * taxRate) / 100
    const grandTotal = postDiscountTotal + taxAmount

    const amountPaid = financials?.amountPaid || 0
    const amountDue = Math.max(0, grandTotal - amountPaid)

    let paymentStatus = 'UNPAID'
    if (amountPaid >= grandTotal) {
      paymentStatus = 'PAID'
    } else if (amountPaid > 0) {
      paymentStatus = 'PARTIALLY PAID'
    }

    let safeLogoUrl = orgBranding?.logo || p.organization.branding.logo
    if (safeLogoUrl.endsWith('.svg')) {
      safeLogoUrl = safeLogoUrl.replace('.svg', '.png')
    }

    return {
      pricingModel: rawData.pricingModel || p.pricingModel,
      organizationName: org?.name || p.organization!.name,
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
      projectIssuedDate: (rawData.project?.invoiceDate || p.project.invoiceDate).toDateString(),
      dueDate: (rawData.dueDate || p.dueDate).toDateString(),
      deliverables: computedDeliverables,
      financialsSubtotal: subtotal,
      financialsDiscountLabel: financials?.discountLabel || (discountAmount > 0 ? 'Discount' : ''),
      financialsDiscountAmount: discountAmount > 0 ? `- ${discountAmount.toLocaleString('en-IN')}` : '',
      financialsTaxLabel: financials?.taxLabel || (taxAmount > 0 ? 'Tax' : ''),
      financialsTaxAmount: taxAmount > 0 ? taxAmount.toLocaleString('en-IN') : '',
      financialsGrandTotal: grandTotal,
      financialsAmountPaid: amountPaid > 0 ? amountPaid.toLocaleString('en-IN') : '',
      financialsAmountDue: amountDue,
      paymentStatus,
      accountName: rawData.accountDetails?.accountName || p.accountDetails.accountName,
      accountNumber: rawData.accountDetails?.accountNumber || p.accountDetails.accountNumber,
      bankName: rawData.accountDetails?.bankName || p.accountDetails.bankName,
      ifscCode: rawData.accountDetails?.ifscCode || p.accountDetails.ifscCode,
    }
  },
})
