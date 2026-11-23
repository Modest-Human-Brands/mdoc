import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'
import { organizationSchema, placeholderOrganization } from '../_shared/organization'
import { qrPayload } from '../_shared/qr'

export const sessionReportSchema = z.object({
  practitioner: z.object({
    name: z.string(),
    qualifications: z.array(z.string()).optional(),
    registrationNumber: z.string().optional(),
    phone: z.string().optional(),
    qrUrl: z.string().optional(),
  }),
  client: z.object({
    name: z.string(),
    age: z.string().optional(),
    sex: z.string().optional(),
  }),
  session: z.object({
    number: z.string(),
    date: z.coerce.date(),
  }),
  sections: z.array(
    z.object({
      heading: z.string(),
      text: z.string().optional(),
      bullets: z.array(z.string()).optional(),
    })
  ),
  clinics: z
    .array(
      z.object({
        name: z.string(),
        address: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .optional(),
  organization: organizationSchema,
})

export type SessionReportPayload = z.infer<typeof sessionReportSchema>

const placeholders: SessionReportPayload = {
  practitioner: {
    name: 'Dr. Jane Doe',
    qualifications: ['Registered Clinical Psychologist', 'M.Phil. (Clinical Psychology)'],
    registrationNumber: 'A 00000',
    phone: '+00 00000 00000',
  },
  client: { name: 'Sample Client', age: '3 years', sex: 'Female' },
  session: { number: '1', date: new Date() },
  sections: [
    {
      heading: 'Presenting Concerns (According to parent)',
      bullets: ['First concern reported', 'Second concern reported'],
    },
    { heading: 'Provisional Diagnosis', text: 'To be confirmed' },
    { heading: 'Home-Based Instructions', bullets: ['First instruction', 'Second instruction'] },
    { heading: 'Recommendation', text: 'Follow-up session in two weeks' },
  ],
  clinics: [
    { name: 'Clinic One', address: '1 Main Road, City 700001', phone: '00000 00000' },
    { name: 'Clinic Two', address: '2 Main Road, City 700002', phone: '00000 00001' },
  ],
  organization: placeholderOrganization,
}

registerTemplate({
  id: 'session-report',
  label: 'Session Report',
  shortLabel: 'Session report',
  category: 'Clinical',
  organizationFields: ['accountDetails'],
  description: 'A clinical session note with client details, free-form sections (concerns, diagnosis, instructions, recommendations) and a clinic directory footer.',
  fonts: [
    { name: 'Exo2', family: 'Exo 2', weights: [400], path: './asset/Exo2-Regular.ttf' },
    { name: 'Oxanium', family: 'Oxanium', weights: [400], path: './asset/Oxanium-Regular.ttf' },
  ],
  component: Component,
  schema: sessionReportSchema,
  placeholders,
  transformPayload: async (rawData: SessionReportPayload) => {
    const p = placeholders
    const org = rawData.organization
    const orgBranding = org.branding

    let safeLogoUrl = orgBranding.logo ?? ''
    if (safeLogoUrl.endsWith('.svg')) {
      safeLogoUrl = safeLogoUrl.replace('.svg', '.png')
    }

    return {
      organizationLogo: safeLogoUrl,
      organizationFont: orgBranding.font,
      organizationColorPrimary: orgBranding.color.primary,
      organizationColorAccent: orgBranding.color.accent,

      practitionerName: rawData.practitioner?.name || p.practitioner.name,
      practitionerQualifications: (rawData.practitioner?.qualifications ?? []).filter((line) => line.trim() !== ''),
      practitionerRegistrationNumber: rawData.practitioner?.registrationNumber,
      practitionerPhone: rawData.practitioner?.phone,
      practitionerQrUrl: rawData.practitioner?.qrUrl,
      ...qrPayload(org, undefined, rawData),

      clientName: rawData.client?.name || p.client.name,
      clientAge: rawData.client?.age,
      clientSex: rawData.client?.sex,

      sessionNumber: rawData.session?.number || p.session.number,
      sessionDate: rawData.session?.date || p.session.date,

      sections: (rawData.sections || p.sections).map((section) => ({
        heading: section.heading ?? '',
        text: section.text ?? '',
        bullets: Array.isArray(section.bullets) ? section.bullets.filter((line) => line.trim() !== '') : [],
      })),
      clinics: (rawData.clinics ?? []).map((clinic) => ({
        name: clinic.name ?? '',
        address: clinic.address ?? '',
        phone: clinic.phone ?? '',
      })),
    }
  },
  signerFields: [],
})
