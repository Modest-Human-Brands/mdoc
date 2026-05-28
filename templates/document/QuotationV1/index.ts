import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'

export const quotationSchema = z.object({
  branding: z
    .object({
      logo: z.url('Logo must be a valid URL'),
      font: z.string().optional(),
      color: z
        .object({
          primary: z.string(),
          accent: z.string(),
        })
        .optional(),
    })
    .optional(),

  company: z
    .object({
      name: z.string(),
      address: z.string(),
    })
    .optional(),

  client: z.object({
    name: z.string(),
    address: z.string(),
    email: z.email('Invalid client email'),
    phone: z.string(),
  }),

  project: z.object({
    title: z.string().optional(),
    quoteNumber: z.string(),
    quoteDate: z.string(),
    quoteExpiry: z.string(),
    shootDate: z.string(),
    shootLocation: z.string(),
  }),

  deliverables: z.array(
    z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      points: z.array(z.string()).optional(),
      quantity: z.number().min(1).optional(),
      rate: z.number().min(0).optional(),
    })
  ),

  financials: z
    .object({
      discountLabel: z.string().optional(),
      discountValue: z.number().min(0).optional(),
      isDiscountPercentage: z.boolean().optional(),
    })
    .optional(),

  accountDetails: z.object({
    accountName: z.string(),
    accountNumber: z.string(),
    bankName: z.string(),
    ifscCode: z.string(),
  }),

  terms: z.object({
    content: z.string(),
    lastUpdated: z.string().optional(),
  }),
})

export type QuotationPayloadData = z.infer<typeof quotationSchema>

type DeliverableInput = QuotationPayloadData['deliverables'][number]

interface ComputedDeliverable {
  title: string
  points: string[]
  amountRaw: number
  amount: string
}

interface ParsedTerm {
  type: 'heading' | 'list' | 'paragraph'
  text?: string
  items?: string[]
}

registerTemplate({
  id: 'quotation',
  fonts: [{ name: 'Exo2', path: './asset/Exo2-Regular.ttf' }],
  component: Component,
  schema: quotationSchema,
  transformPayload: (rawData: QuotationPayloadData) => {
    const computedDeliverables: ComputedDeliverable[] = (rawData.deliverables || []).map((item: DeliverableInput) => {
      const qty = item.quantity || 1
      const rate = item.rate || 0
      const rowTotal = qty * rate
      return {
        title: item.title || item.description || 'Service',
        points: Array.isArray(item.points) ? item.points.filter((p: string) => p.trim() !== '') : [],
        amountRaw: rowTotal,
        amount: rowTotal.toLocaleString('en-IN'),
      }
    })

    const subtotal = computedDeliverables.reduce((acc: number, curr: ComputedDeliverable) => acc + curr.amountRaw, 0)

    let discountAmount = 0
    const discountValue = rawData.financials?.discountValue || 0
    if (rawData.financials?.isDiscountPercentage) {
      discountAmount = (subtotal * discountValue) / 100
    } else {
      discountAmount = discountValue
    }
    const total = subtotal - discountAmount

    let safeLogoUrl = rawData.branding?.logo || 'https://redcatpictures.com/logo-light.png'
    if (safeLogoUrl.endsWith('.svg')) {
      safeLogoUrl = safeLogoUrl.replace('.svg', '.png')
    }

    const rawTerms = rawData.terms?.content || ''
    const parsedTerms: ParsedTerm[] = []

    const blocks = rawTerms.split('\n\n').filter((b: string) => b.trim() !== '')

    for (const block of blocks) {
      const cleanBlock = block.replace(/\*\*(.*?)\*\*/g, '$1').trim()

      if (cleanBlock.startsWith('### ')) {
        parsedTerms.push({ type: 'heading', text: cleanBlock.replace(/^###\s+/, '') })
      } else if (cleanBlock.startsWith('- ')) {
        const items = cleanBlock
          .split(/(?:^|\n)-\s+/)
          .filter(Boolean)
          .map((line: string) => line.replace(/\n/g, ' ').trim())
        parsedTerms.push({ type: 'list', items })
      } else {
        parsedTerms.push({ type: 'paragraph', text: cleanBlock.replace(/\n/g, ' ') })
      }
    }

    return {
      branding: {
        logo: safeLogoUrl,
        font: rawData.branding?.font || 'Exo2',
        color: {
          primary: rawData.branding?.color?.primary || '#CD2D2D',
          accent: rawData.branding?.color?.accent || '#faebeb',
        },
      },
      company: {
        name: rawData.company?.name || 'RED CAT PICTURES',
        address: rawData.company?.address || '17, Netaji Subhash Road, Beltala, P.O.- Harinavi...',
      },
      client: {
        name: rawData.client?.name || '',
        address: rawData.client?.address || '',
      },
      contact: {
        phone: rawData.client?.phone || '',
        email: rawData.client?.email || '',
      },
      shoot: {
        date: rawData.project?.shootDate || '',
        address: rawData.project?.shootLocation || '',
      },
      project: {
        title: rawData.project?.title || 'Photography and Videography',
        quoteNumber: rawData.project?.quoteNumber || '',
        issuedDate: rawData.project?.quoteDate || '',
        expiryDate: rawData.project?.quoteExpiry || '',
      },
      deliverables: computedDeliverables,
      financials: {
        subtotal: subtotal.toLocaleString('en-IN'),
        discountLabel: rawData.financials?.discountLabel || (discountAmount > 0 ? 'Discount' : ''),
        discountAmount: discountAmount > 0 ? `- ${discountAmount.toLocaleString('en-IN')}` : '',
        totalCost: total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
      },
      accountDetails: {
        accountName: rawData.accountDetails?.accountName || '',
        accountNumber: rawData.accountDetails?.accountNumber || '',
        bankName: rawData.accountDetails?.bankName || '',
        ifscCode: rawData.accountDetails?.ifscCode || '',
      },
      parsedTerms,
    }
  },
})
