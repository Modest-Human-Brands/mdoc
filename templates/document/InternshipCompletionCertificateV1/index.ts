import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'
import sharp from 'sharp'

async function getTintedBackground(imageString: string, hexColor: string): Promise<string> {
  // Tint the image and output as a base64 Data URL for the <Image> tag
  const tintedBuffer = await sharp(imageString)
    .tint(hexColor) // Tints grayscale/monochrome images with the specified hex
    .toBuffer()

  return `data:image/png;base64,${tintedBuffer.toString('base64')}`
}

export const internshipCompletionCertificateSchema = z.object({
  recipientName: z.string(),
  recipientRole: z.string(),
  scopeOfWork: z.string(),
  startDate: z.date(),
  endDate: z.date(),
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

export type InternshipCompletionCertificatePayload = z.infer<typeof internshipCompletionCertificateSchema>

const placeholders: InternshipCompletionCertificatePayload = {
  recipientName: 'Alex Mercer',
  recipientRole: 'Senior Marketing Intern',
  scopeOfWork: 'Digital Campaign Management',
  startDate: new Date('June 1, 2025'),
  endDate: new Date('December 31, 2025'),
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
  id: 'internship-completion-certificate',
  label: 'Internship Completion Certificate',
  description: 'The formal proof of completion, including your start and end dates, role, and an authorized signature.',
  fonts: [
    { name: 'Exo2', path: './asset/Exo2-Regular.ttf' },
    { name: 'IslandMoments', path: './asset/IslandMoments-Regular.ttf' },
    { name: 'Oxanium', path: './asset/Oxanium-Regular.ttf' },
  ],
  schema: internshipCompletionCertificateSchema,
  placeholders,
  component: Component,
  transformPayload: async (rawData: InternshipCompletionCertificatePayload) => {
    const p = placeholders
    const org = rawData.organization || p.organization
    const orgBranding = org?.branding || p.organization!.branding

    return {
      recipientName: rawData.recipientName || p.recipientName,
      bodyContent: `This certificate acknowledges your outstanding contribution and dedication as a ${rawData.recipientRole || p.recipientRole} towards ${rawData.scopeOfWork || p.scopeOfWork} during ${rawData.startDate || p.startDate} - ${rawData.endDate || p.endDate}, showcasing your commitment to excellence and teamwork at ${rawData.organization.name || p.organization.name}.`,
      organizationName: rawData?.organization?.name || p.organization.name,
      organizationLogo: orgBranding?.logo || p.organization.branding.logo,
      organizationFont: orgBranding?.font || p.organization!.branding!.font,
      organizationColorPrimary: orgBranding?.color?.primary || p.organization!.branding!.color!.primary,
      organizationColorAccent: orgBranding?.color?.accent || p.organization!.branding!.color!.accent,
      basePdfBackground: await getTintedBackground('./asset/internship-completion-certificate-v1_0001.svg', orgBranding?.color?.accent || p.organization!.branding!.color!.accent),
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
