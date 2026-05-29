import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'

export const internshipCompletionCertificateSchema = z.object({
  recipientName: z.string(),
  recipientRole: z.string(),
  scopeOfWork: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    website: z.string(),
    branding: z.object({
      logo: z.string(),
      color: z.object({
        primary: z.string(),
        accent: z.string(),
      }),
      font: z.string(),
    }),
    socials: z.record(z.any(), z.any()).optional(),
  }),
})

export type InternshipCompletionCertificatePayload = z.infer<typeof internshipCompletionCertificateSchema>

const placeholders: InternshipCompletionCertificatePayload = {
  recipientName: 'Alex Mercer',
  recipientRole: 'Senior Marketing Intern',
  scopeOfWork: 'Digital Campaign Management',
  startDate: 'June 1, 2025',
  endDate: 'December 31, 2025',
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
  id: 'internship-completion-certificate',
  fonts: [
    { name: 'Exo2', path: './asset/Exo2-Regular.ttf' },
    { name: 'IslandMoments', path: './asset/IslandMoments-Regular.ttf' },
  ],
  schema: internshipCompletionCertificateSchema,
  placeholders,
  component: Component,
  transformPayload: (data: InternshipCompletionCertificatePayload) => {
    const p = placeholders

    return {
      recipientName: data.recipientName || p.recipientName,
      bodyContent: `This certificate acknowledges your outstanding contribution and dedication as a ${data.recipientRole || p.recipientRole} towards ${data.scopeOfWork || p.scopeOfWork} during ${data.startDate || p.startDate} - ${data.endDate || p.endDate}, showcasing your commitment to excellence and teamwork at ${data.organization.name || p.organization.name}.`,
      organizationBrandingLogo: data.organization.branding.logo || p.organization.branding.logo,
      basePdfBackground: './asset/internship-completion-certificate-v1_0001.svg',
    }
  },
  signerFields: [
    {
      id: 'signer-signature',
      type: 'SIGNATURE',
      signerOrder: 1,
      pageIndex: -1,
      x: 380,
      y: 180,
      width: 150,
      height: 40,
      required: true,
    },
    // {
    //   id: 'signer-name',
    //   type: 'NAME',
    //   signerOrder: 1,
    //   pageIndex: -1,
    //   x: 380,
    //   y: 140,
    //   width: 150,
    //   height: 30,
    //   fontSize: 12,
    //   required: true
    // },
    {
      id: 'signer-title',
      type: 'TEXT',
      signerOrder: 1,
      pageIndex: -1,
      x: 380,
      y: 140,
      width: 150,
      height: 30,
      fontSize: 12,
      required: true,
    },
    {
      id: 'date-of-issue',
      type: 'DATE',
      signerOrder: 1,
      pageIndex: -1,
      x: 65,
      y: 140,
      width: 150,
      height: 30,
      fontSize: 12,
      required: true,
    },
  ],
})
