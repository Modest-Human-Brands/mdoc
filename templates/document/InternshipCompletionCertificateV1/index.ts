import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'
import { organizationSchema, placeholderOrganization } from '../_shared/organization'
import sharp from 'sharp'

async function getTintedBackground(
  imageString: string,
  hexColor: string,
  options: {
    opacity?: number
    saturation?: number
  } = {}
): Promise<string> {
  const { opacity = 1, saturation = 0 } = options

  const image = sharp(imageString).tint(hexColor).ensureAlpha()

  const { width, height } = await image.metadata()

  const mask = Buffer.from(
    `<svg width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="black" fill-opacity="${opacity}" />
    </svg>`
  )

  const tintedBuffer = await image
    .composite([{ input: mask, blend: 'dest-in' }])
    .modulate({ saturation })
    .png()
    .toBuffer()

  return `data:image/png;base64,${tintedBuffer.toString('base64')}`
}

export const internshipCompletionCertificateSchema = z.object({
  recipient: z.object({
    name: z.string(),
    role: z.string(),
    address: z.string(),
    email: z.email('Invalid recipient email'),
    phone: z.string(),
  }),
  scopeOfWork: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  organization: organizationSchema,
})

export type InternshipCompletionCertificatePayload = z.infer<typeof internshipCompletionCertificateSchema>

const placeholders: InternshipCompletionCertificatePayload = {
  recipient: {
    name: '{{ recipient name }}',
    role: '{{ recipient role }}',
    address: '{{ recipient address }}',
    email: '{{ recipient email }}',
    phone: '{{ recipient phone }}',
  },
  scopeOfWork: '{{ scope of work }}',
  startDate: new Date('June 1, 2025'),
  endDate: new Date('December 31, 2025'),
  organization: placeholderOrganization,
}

registerTemplate({
  id: 'internship-completion-certificate',
  label: 'Internship Completion Certificate',
  shortLabel: 'Internship certificate',
  category: 'Certificates',
  description: 'The formal proof of completion, including your start and end dates, role, and an authorized signature.',
  fonts: [
    { name: 'Exo2', family: 'Exo 2', weights: [400], path: './asset/Exo2-Regular.ttf' },
    { name: 'IslandMoments', family: 'Island Moments', weights: [400], path: './asset/IslandMoments-Regular.ttf' },
    { name: 'Oxanium', family: 'Oxanium', weights: [400], path: './asset/Oxanium-Regular.ttf' },
  ],
  schema: internshipCompletionCertificateSchema,
  placeholders,
  component: Component,
  transformPayload: async (rawData: InternshipCompletionCertificatePayload) => {
    const p = placeholders
    const org = rawData.organization
    const orgBranding = org.branding

    return {
      recipientName: rawData?.recipient?.name || p.recipient.name,
      bodyContent: `This certificate acknowledges your outstanding contribution and dedication as a ${rawData.recipient.role || p.recipient.role} towards ${rawData.scopeOfWork || p.scopeOfWork} during ${rawData.startDate || p.startDate} - ${rawData.endDate || p.endDate}, showcasing your commitment to excellence and teamwork at ${org.name}.`,
      organizationName: org.name,
      organizationLogo: orgBranding.logo ?? '',
      organizationFont: orgBranding.font,
      organizationColorPrimary: orgBranding.color.primary,
      organizationColorAccent: orgBranding.color.accent,
      basePdfBackground: await getTintedBackground('./asset/internship-completion-certificate-v1_0001.svg', orgBranding.color.accent),
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
