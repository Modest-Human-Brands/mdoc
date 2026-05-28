import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'

export const internshipCompletionCertificateSchema = z.object({
  recipientName: z.string(),
  recipientRole: z.string(),
  scopeOfWork: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  dataOfIssue: z.string(),
  signerName: z.string(),
  signerTitle: z.string(),
  signerSignature: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
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
  dataOfIssue: new Date().toLocaleDateString(),
  signerName: 'Sarah Jenkins',
  signerTitle: 'Director of Marketing',
  signerSignature: '#',
  organization: {
    id: 'modest-human-brands',
    name: 'Modest Human Brands',
    website: 'https://modesthumanbrands.com',
    branding: {
      logo: 'https://modesthumanbrands.com/logo.svg',
      color: {
        primary: '#2B2B2B',
        accent: '#4A85FF',
      },
      font: 'sans-serif',
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
      dataOfIssue: data.dataOfIssue || p.dataOfIssue,
      signerName: data.signerName || p.signerName,
      signerTitle: data.signerTitle || p.signerTitle,
      signerSignature: data.signerSignature || p.signerSignature,
      basePdfBackground: './asset/internship-completion-certificate-v1_0001.svg',
    }
  },
})
