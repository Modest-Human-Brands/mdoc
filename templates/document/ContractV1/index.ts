import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'

export const contractSchema = z.object({
  contact: z.object({
    name: z.string(),
    title: z.string(),
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
  contact: {
    name: 'Jane Doe',
    title: 'Lead Cinematographer',
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
  deliverables: ['1x 60-second highlight video (4K resolution)', '50 edited high-resolution photographs', 'Delivery of all raw footage and unedited image files'],
  totalAmount: 150_000,
  agreementDate: new Date(),
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
      contractorName: rawData.contact.name || p.contact.name,
      contractorTitle: rawData.contact.title || p.contact.title,

      projectName: rawData.project.title || p.project.title,
      shootDates: rawData.project.shootDate || p.project.shootDate,
      location: rawData.project.shootLocation || p.project.shootLocation,
      callTime: rawData.project.shootDate || p.project.shootDate,
      deliverables: rawData.deliverables && rawData.deliverables.length > 0 ? rawData.deliverables : p.deliverables,
      totalAmount: rawData.totalAmount || p.totalAmount,
    }
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
