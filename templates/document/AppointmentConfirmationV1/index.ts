import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'
import { organizationSchema, placeholderOrganization } from '../_shared/organization'
import { qrPayload } from '../_shared/qr'
import { resolveTerms, termsSchema } from '../_shared/terms'

export const appointmentConfirmationSchema = z.object({
  receipt: z.object({
    number: z.string(),
    issuedAt: z.coerce.date(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
  }),
  patient: z.object({
    id: z.string().optional(),
    name: z.string(),
    phone: z.string().optional(),
  }),
  appointment: z.object({
    date: z.coerce.date(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    service: z.string(),
    practitioner: z.string().optional(),
    mode: z.string().optional(),
    link: z.string().optional(),
  }),
  payment: z.object({
    amount: z.number().min(0),
    currency: z.string().optional(),
    label: z.string().optional(),
    method: z.string().optional(),
    reference: z.string().optional(),
    paidAt: z.coerce.date().optional(),
    status: z.string().optional(),
  }),
  notes: z.array(z.string()).optional(),
  closingMessage: z.string().optional(),
  terms: termsSchema.optional(),
  locations: z
    .array(
      z.object({
        label: z.string().optional(),
        address: z.string(),
      })
    )
    .optional(),
  organization: organizationSchema,
})

export type AppointmentConfirmationPayload = z.infer<typeof appointmentConfirmationSchema>

const placeholders: AppointmentConfirmationPayload = {
  receipt: {
    number: 'AC/26-27/0001',
    issuedAt: new Date(),
    title: 'Appointment Confirmed',
    subtitle: 'Appointment Confirmation & Payment Receipt',
  },
  patient: { id: '0001', name: 'Sample Patient', phone: '+00 00000 00000' },
  appointment: {
    date: new Date(),
    startTime: '10:00 AM',
    endTime: '10:30 AM',
    service: 'General consultation — first visit',
    practitioner: 'Dr. Jane Doe',
    mode: 'Online',
    link: 'Shared on WhatsApp before the session',
  },
  payment: { amount: 500, currency: 'INR', label: 'Consultation fee', method: 'UPI', reference: '000000000000', paidAt: new Date(), status: 'PAID' },
  notes: [
    'Arrive 10 minutes early for in-clinic visits, or join 5 minutes early online.',
    'Bring any previous prescriptions, reports or notes you would like us to see.',
    'To reschedule, please call or WhatsApp us on +00 00000 00000 as early as possible.',
  ],
  closingMessage: 'Thank you for trusting us with your care.',
  locations: [
    { label: 'Clinic One', address: '1 Main Road, City 700001' },
    { label: 'Clinic Two', address: '2 Main Road, City 700002' },
  ],
  organization: placeholderOrganization,
}

registerTemplate({
  id: 'appointment-confirmation',
  label: 'Appointment Confirmation',
  shortLabel: 'Appointment',
  category: 'Clinical',
  organizationFields: ['accountDetails'],
  description: 'An A4 appointment confirmation and payment receipt with patient, appointment and payment details, pre-visit notes and a scannable link to the document.',
  fonts: [
    { name: 'Exo2', family: 'Exo 2', weights: [400], path: './asset/Exo2-Regular.ttf' },
    { name: 'Oxanium', family: 'Oxanium', weights: [400], path: './asset/Oxanium-Regular.ttf' },
  ],
  component: Component,
  schema: appointmentConfirmationSchema,
  placeholders,
  transformPayload: async (rawData: AppointmentConfirmationPayload) => {
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
      organizationPhone: org.phone,
      organizationEmail: org.contactEmail,
      organizationWebsite: org.website,

      title: rawData.receipt?.title || p.receipt.title,
      subtitle: rawData.receipt?.subtitle || p.receipt.subtitle,
      receiptNumber: rawData.receipt?.number || p.receipt.number,
      issuedAt: rawData.receipt?.issuedAt || p.receipt.issuedAt,

      patientId: rawData.patient?.id,
      patientName: rawData.patient?.name || p.patient.name,
      patientPhone: rawData.patient?.phone,

      appointmentDate: rawData.appointment?.date || p.appointment.date,
      startTime: rawData.appointment?.startTime,
      endTime: rawData.appointment?.endTime,
      service: rawData.appointment?.service || p.appointment.service,
      practitionerName: rawData.appointment?.practitioner,
      mode: rawData.appointment?.mode,
      link: rawData.appointment?.link,

      amount: rawData.payment?.amount ?? p.payment.amount,
      currency: rawData.payment?.currency || 'INR',
      paymentLabel: rawData.payment?.label || 'Consultation fee',
      paymentMethod: rawData.payment?.method,
      reference: rawData.payment?.reference,
      paidAt: rawData.payment?.paidAt,
      status: rawData.payment?.status || 'PAID',

      notes: (rawData.notes ?? []).filter((line) => line.trim() !== ''),
      closingMessage: rawData.closingMessage,
      termSections: resolveTerms(rawData.terms),
      locations: (rawData.locations ?? []).map((location) => ({ label: location.label ?? '', address: location.address ?? '' })),

      ...qrPayload(org, rawData.receipt?.number || p.receipt.number, rawData),
    }
  },
  signerFields: [],
})
