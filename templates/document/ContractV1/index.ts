import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'

export const contractSchema = z.object({
  contractorName: z.string(),
  contractorTitle: z.string(),
  projectName: z.string(),
  shootDates: z.date(),
  location: z.string(),
  callTime: z.date(),
  deliverables: z.array(z.string()),
  totalAmount: z.number(),
  agreementDate: z.date(),
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

export type ContractPayload = z.infer<typeof contractSchema>

const placeholders: ContractPayload = {
  contractorName: 'Jane Doe',
  contractorTitle: 'Lead Cinematographer',
  projectName: 'Summer Collection Campaign',
  shootDates: 'August 15 - August 17, 2026',
  location: 'Studio A, 123 Creative Lane, Mumbai',
  callTime: '08:00 AM',
  deliverables: ['1x 60-second highlight video (4K resolution)', '50 edited high-resolution photographs', 'Delivery of all raw footage and unedited image files'],
  totalAmount: '₹ 1,50,000',
  agreementDate: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
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
  id: 'contract',
  fonts: [
    { name: 'Exo2', path: './asset/Exo2-Regular.ttf' },
    { name: 'Oxanium', path: './asset/Oxanium-Regular.ttf' },
  ],
  schema: contractSchema,
  placeholders,
  component: Component,
  transformPayload: (rawData: ContractPayload) => {
    const p = placeholders
    const org = rawData.organization || p.organization
    const orgBranding = org?.branding || p.organization!.branding

    return {
      organizationName: org?.name || p.organization!.name,
      organizationAddress: org?.address || p.organization!.address,
      organizationLogo: orgBranding?.logo || p.organization.branding.logo,
      organizationFont: orgBranding?.font || p.organization!.branding!.font,
      organizationColorPrimary: orgBranding?.color?.primary || p.organization!.branding!.color!.primary,
      organizationColorAccent: orgBranding?.color?.accent || p.organization!.branding!.color!.accent,

      agreementDate: rawData.agreementDate || p.agreementDate,
      contractorName: rawData.contractorName || p.contractorName,
      contractorTitle: rawData.contractorTitle || p.contractorTitle,

      projectName: rawData.projectName || p.projectName,
      shootDates: rawData.shootDates || p.shootDates,
      location: rawData.location || p.location,
      callTime: rawData.callTime || p.callTime,
      deliverables: rawData.deliverables && rawData.deliverables.length > 0 ? rawData.deliverables : p.deliverables,
      totalAmount: rawData.totalAmount || p.totalAmount,
    }
  },

  signerFields: [
    {
      id: 'contractor-signature-footer',
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
      x: 360,
      y: 604,
      width: 150,
      height: 40,
      required: true,
    },
    {
      id: 'contractor-name',
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
      id: 'contractor-date',
      type: 'DATE',
      signerOrder: 1,
      pageIndex: -1,
      x: 360,
      y: 508,
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
      x: 360,
      y: 460,
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
      x: 105,
      y: 604,
      width: 150,
      height: 40,
      required: true,
    },
    {
      id: 'company-name-autofill',
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
      fontSize: 10,
      required: true,
    },
    {
      id: 'company-city-input',
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
