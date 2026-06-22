import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'
import { marked } from 'marked'

export const quotationSchema = z.object({
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
    quoteExpiry: z.date(),
    shootDate: z.date(),
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
    accountNumber: z.number(),
    bankName: z.string(),
    ifscCode: z.string(),
  }),
  terms: z.object({
    content: z.string(),
    lastUpdated: z.date(),
  }),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    website: z.string(),
    branding: z.object({
      logo: z.url(),
      color: z.object({
        primary: z.string(),
        accent: z.string(),
      }),
      font: z.string(),
    }),
    socials: z.record(z.any(), z.any()).optional(),
  }),
})

export type QuotationPayload = z.infer<typeof quotationSchema>

type DeliverableInput = QuotationPayload['deliverables'][number]

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

const placeholders: QuotationPayload = {
  contact: {
    name: 'Wayne Enterprises',
    address: '1007 Mountain Drive, Gotham',
    email: 'billing@wayne.ent',
    phone: '+1 555-0199',
  },
  project: {
    title: 'Photography and Videography',
    quoteNumber: 'QT-2026-089',
    quoteDate: new Date(),
    quoteExpiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    shootDate: new Date(),
    shootLocation: 'Gotham City',
  },
  deliverables: [
    { title: 'Premium Brand Strategy', quantity: 1, rate: 5000, points: [] },
    { title: 'UI/UX Design System', quantity: 1, rate: 8500, points: [] },
  ],
  financials: {
    discountLabel: 'Discount',
    discountValue: 0,
    isDiscountPercentage: false,
  },
  accountDetails: {
    accountName: 'Red Cat Pictures',
    accountNumber: 1_234_567_890,
    bankName: 'HDFC Bank',
    ifscCode: 'HDFC0001234',
  },
  terms: {
    content: `### 1. Introduction 
By using our photography/videography services (“Services”), you agree to comply with these Terms & Conditions (“Terms”), including our Privacy Policy.
If you disagree with any provision herein, discontinue use of our Services immediately.

### 2. Service Scope & Delivery

- **Delivery Timeline:**
Photographs and videos will be delivered within 10–20 days from the shoot date.
Delivery commences only after the second instalment is received.
- **Deliverables Release:**
Deliverables are only released post second instalment.
- **Data Liability:**
RED CAT PICTURES is not liable for data loss after one month from the shoot date.
Clients are advised to provide a hard drive on the shoot day for immediate backup.
- **Digital Delivery:**
All deliverables will be provided via our secure RED CAT Drive and remain accessible for 30 days from the date of delivery.
For any storage holding beyond 30 days, additional charges will apply.
- **Project Scope Changes:**
Any modification, substitution, or update to the originally quoted deliverables, services, or shoot specifications after quotation approval will require a revised quotation, with corresponding adjustments to project timeline and budget.
The shoot or production will be held until such changes are documented and mutually agreed, and any additional costs or delays arising therefrom will be borne by the client.

### 3. Shoot Arrangements & Supervision

- **Client Presence:**
A Client/Agency representative must be present during the shoot.
No changes or objections are entertained post-shoot.
- **Editing Revisions:**
One round of editing revisions is included in the package.
Any further requests for edits or modifications will be subject to additional charges.
- **Reshoot Policy:**
All reshoot requests, regardless of the reason, will incur separate charges as per RED CAT PICTURES’ current rates.
No complimentary reshoots are provided.
- **Creative Supervision:**
Interference in the creative process may impact the outcome;
RED CAT PICTURES shall not be held liable for artistic dissatisfaction.

### 4. Payment Terms

- **Structure:**
    - 20% advance payment at booking confirmation (shoot finalization).
    - 70% due post shoot completion.
    - Advance payment must be completed at least 1 day prior to the scheduled shoot date.
    - Remaining 10% upon delivery of final materials.
- **Banking Policy:**
All transactions must be conducted via bank transfer (NEFT/IMPS/RTGS/UPI).
No cash payments are accepted.
- **Clearances:**
Payment clearance is required prior to any corrections or changes in final deliverables.
- **Travel & Accommodation:**
Charges, if applicable, must be paid in advance.
- **Invoice Disputes:**
Any dispute with invoices must be raised within 7 days of issue.
- **Due Date:**
All dues must be cleared within 7 days of final delivery; failure may put invoice and deliverables on hold.

### 5. Cancellations & Postponements

- **Advance Payment:**
Non-refundable in case of cancellation or postponement initiated by the Client/Agency.
- **Shoot Date Changes:**
Date can be rescheduled only once within 29 days of advance payment.
Failure to book a date in this window results in cancellation.

### 6. Pricing & Adjustments

- **Budget:**
Once the project is finalized with advance payment, budget is non-negotiable by the client.
- **Large Scale Projects:**
For multi-individual projects, budget may increase to meet desired outcomes.
- **Fee Variance:**
RED CAT PICTURES reserves the right to reasonably adjust fee structures; taxes and applicable conversions extra.

### 7. Copyrights & Usage

- **Copyright Law Compliance:**
In accordance with the Copyright Act, 1957, RED CAT PICTURES retains original rights to all images and videos produced.
- **License Grant:**
The client receives a lifetime usage license for delivered materials.
- **Promotional Use:**
RED CAT PICTURES reserves the right to use the end client’s brand name and logo, as well as final materials, for promotional purposes—including display on our website, social media, blogs, and marketing platforms—unless a separate written agreement states otherwise.
- **Content Ownership:**
Clients may not reverse engineer or misuse any platform/IP belonging to RED CAT PICTURES.

### 8. Travel & Logistics

- **Arrangements:**
The client is responsible for arranging necessary travel, accommodation, and meals for the production team.
- **Team Welfare:**
The production team is entitled to regular meal breaks during production hours.

---

### 9. Payments

All payments and transactions must be conducted via banking channels only; cash payments are not accepted.

### 10. Behavior & Termination

- **Conduct:**
Misconduct or inappropriate behavior towards RED CAT PICTURES personnel is grounds for immediate termination of services without liability or refund.

### 11. Indemnification

Clients indemnify and hold RED CAT PICTURES harmless from any claims, costs, or losses arising from use, misuse, or breach of these Terms.

### 12. Governing Law

These Terms are governed by the laws of India.
Jurisdiction for disputes lies exclusively with the courts in Kolkata.

### 13. Changes To Terms

RED CAT PICTURES may modify these Terms at any time.
Continued use of Services after modifications constitutes acceptance of the revised Terms.

### 14. MSME Registration

“RED CAT PICTURES” is a registered MSME (Micro, Small and Medium Enterprise) under the laws of India.`,
    lastUpdated: new Date(),
  },
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

    const computedDeliverables: ComputedDeliverable[] = (rawData.deliverables || p.deliverables).map((item: DeliverableInput) => {
      const qty = item.quantity || 1
      const rate = item.rate || 0
      const rowTotal = qty * rate
      return {
        title: item.title || item.description || 'Service',
        points: Array.isArray(item.points) ? item.points.filter((pt: string) => pt.trim() !== '') : [],
        amountRaw: rowTotal,
        amount: rowTotal.toLocaleString('en-IN'),
      }
    })

    const subtotal = computedDeliverables.reduce((acc: number, curr: ComputedDeliverable) => acc + curr.amountRaw, 0)

    let discountAmount = 0
    const financials = rawData.financials || p.financials
    const discountValue = financials?.discountValue || 0

    if (financials?.isDiscountPercentage) {
      discountAmount = (subtotal * discountValue) / 100
    } else {
      discountAmount = discountValue
    }
    const total = subtotal - discountAmount

    let safeLogoUrl = orgBranding?.logo || p.organization.branding.logo
    if (safeLogoUrl.endsWith('.svg')) {
      safeLogoUrl = safeLogoUrl.replace('.svg', '.png')
    }

    const rawTerms = rawData.terms?.content || p.terms.content
    const parsedTerms: ParsedTerm[] = []

    const tokens = marked.lexer(rawTerms)

    const cleanText = (text: string) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .trim()
    }

    for (const token of tokens) {
      switch (token.type) {
        case 'heading': {
          parsedTerms.push({ type: 'heading', text: cleanText(token.text) })

          break
        }
        case 'paragraph': {
          const flatText = token.text.replace(/\n/g, ' ')
          parsedTerms.push({ type: 'paragraph', text: cleanText(flatText) })

          break
        }
        case 'list': {
          const items = token.items.map((item: { text: string }) => {
            const flatText = item.text.replace(/\n/g, ' ')
            return cleanText(flatText)
          })
          parsedTerms.push({ type: 'list', items })

          break
        }
      }
    }

    return {
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

      shootDate: rawData.project?.shootDate || p.project.shootDate,
      shootAddress: rawData.project?.shootLocation || p.project.shootLocation,

      projectTitle: rawData.project?.title || p.project.title,
      projectQuoteNumber: rawData.project?.quoteNumber || p.project.quoteNumber,
      projectIssuedDate: rawData.project?.quoteDate || p.project.quoteDate,
      projectExpiryDate: rawData.project?.quoteExpiry || p.project.quoteExpiry,

      deliverables: computedDeliverables,

      financialsSubtotal: subtotal.toLocaleString('en-IN'),
      financialsDiscountLabel: financials?.discountLabel || (discountAmount > 0 ? 'Discount' : ''),
      financialsDiscountAmount: discountAmount > 0 ? `- ${discountAmount.toLocaleString('en-IN')}` : '',
      financialsTotalCost: total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),

      accountName: rawData.accountDetails?.accountName || p.accountDetails.accountName,
      accountNumber: rawData.accountDetails?.accountNumber || p.accountDetails.accountNumber,
      bankName: rawData.accountDetails?.bankName || p.accountDetails.bankName,
      ifscCode: rawData.accountDetails?.ifscCode || p.accountDetails.ifscCode,

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
      y: 604,
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
      y: 556,
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
      y: 508,
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
      y: 460,
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
      y: 604,
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
      y: 556,
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
      y: 508,
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
      y: 460,
      width: 150,
      height: 40,
      fontSize: 12,
    },
  ],
})
