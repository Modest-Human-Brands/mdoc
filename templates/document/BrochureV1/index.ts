import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry'
import { z } from 'zod'
import { decorColorFor, resolveDecor } from '~/server/utils/decor'

const textBlock = z.object({
  heading: z.string(),
  text: z.string(),
})

export const brochureSchema = z.object({
  cover: z.object({
    eyebrow: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
  }),
  flap: textBlock,
  insideLeft: textBlock,
  insideRight: textBlock,
  services: z.object({
    heading: z.string(),
    items: z.array(z.string()),
    imageUrl: z.string().optional().meta({ 'x-widget': 'image' }),
    imageCaption: z.string().optional(),
  }),
  decor: z
    .object({
      image: z.string().optional().meta({ 'x-widget': 'decor', 'x-decor-slot': 'panel-corner' }),
      tint: z.enum(['none', 'primary', 'accent']).optional(),
    })
    .optional(),
  callToAction: z.object({
    label: z.string(),
    phone: z.string().optional(),
    note: z.string().optional(),
    socialLabel: z.string().optional(),
  }),
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

export type BrochurePayload = z.infer<typeof brochureSchema>

const placeholders: BrochurePayload = {
  cover: {
    eyebrow: 'Capabilities 2026',
    title: 'Stories worth watching',
    description: 'Production services, from pitch to final delivery.',
  },
  flap: {
    heading: 'What we do',
    text: 'We are a small production house that takes a film from first idea to final delivery. Our team handles scripting, shoot, edit and post under one roof, so every project keeps a single, clear point of view.',
  },
  insideLeft: {
    heading: 'What we do',
    text: 'We are a small production house that takes a film from first idea to final delivery. Our team handles scripting, shoot, edit and post under one roof, so every project keeps a single, clear point of view.',
  },
  insideRight: {
    heading: 'How we work',
    text: 'Every film starts with a short discovery call. We agree the brief, the budget and a timeline, then move through script, shoot and edit with a clear review step at each stage.',
  },
  services: {
    heading: 'Services',
    items: ['Brand films', 'Ad campaigns', 'Documentary and series'],
    imageUrl: undefined,
    imageCaption: 'A frame from our latest shoot',
  },
  decor: { image: 'builtin:leaf', tint: 'none' },
  callToAction: {
    label: 'Start a project',
    phone: '+91 22 4000 1234',
    note: 'Mon to Sat, 10am to 7pm',
    socialLabel: 'Follow us',
  },
  organization: {
    id: 'modest-human-brands',
    name: 'Modest Human Brands',
    legalName: 'Modest Human Brands LLP',
    entityType: 'LLP',
    tradeRelationship: 'Primary',
    gstin: undefined,
    pan: 'ABCDE0123F',
    address: '17 NO, N S Road,harinavi Beltola, South 24 Parganas, West Bengal, India',
    foundedYear: 2025,
    accountDetails: {
      accountName: 'Modest Human Brands LLP',
      accountNumber: 1_234_567_890,
      bankName: 'HDFC Bank',
      ifscCode: 'HDFC0001234',
    },
    website: 'https://modesthumanbrands.com',
    contactEmail: 'contact@modesthumanbrands.com',
    billingEmail: 'billing@modesthumanbrands.com',
    primaryContactId: 'contact-1',
    organizationMemberIds: ['member-1'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    branding: {
      logo: 'https://modesthumanbrands.com/logo.svg',
      color: {
        primary: '#111827',
        accent: '#5945EA',
      },
      font: 'Exo2',
    },
    phone: '+919999999999',
    whatsapp: '+919999999999',
    socials: {
      instagram: 'https://www.instagram.com/modesthumanbrands/',
      facebook: 'https://facebook.com/modesthumanbrands',
      linkedin: 'https://linkedin.com/company/modest-human-brands',
      youtube: 'https://www.youtube.com/@modesthumanbrands',
    },
  },
}

const textBlockOf = (raw: { heading?: string; text?: string } | undefined, fallback: { heading: string; text: string }) => ({
  heading: raw?.heading || fallback.heading,
  text: raw?.text ?? fallback.text,
})

registerTemplate({
  id: 'brochure',
  label: 'Tri-fold Brochure',
  shortLabel: 'Brochure',
  category: 'Marketing',
  description: 'A two-sided landscape tri-fold brochure with cover, services, process and contact panels.',
  fonts: [
    { name: 'Exo2', family: 'Exo 2', weights: [400], path: './asset/Exo2-Regular.ttf' },
    { name: 'Oxanium', family: 'Oxanium', weights: [400], path: './asset/Oxanium-Regular.ttf' },
  ],
  component: Component,
  schema: brochureSchema,
  placeholders,
  transformPayload: async (rawData: BrochurePayload) => {
    const p = placeholders
    const org = rawData?.organization || p.organization
    const orgBranding = org?.branding || p.organization.branding

    let safeLogoUrl = orgBranding?.logo ?? p.organization.branding.logo
    if (safeLogoUrl.endsWith('.svg')) {
      safeLogoUrl = safeLogoUrl.replace('.svg', '.png')
    }

    const socials = Object.entries(org?.socials || p.organization.socials || {})
      .filter(([key, url]) => key && typeof url === 'string' && url.trim() !== '')
      .slice(0, 4)
      .map(([key]) => String(key).charAt(0).toUpperCase())

    const items = Array.isArray(rawData?.services?.items) ? rawData.services.items : p.services.items

    return {
      organizationName: org?.name || p.organization.name,
      organizationLogo: safeLogoUrl,
      organizationFont: orgBranding?.font || p.organization.branding.font,
      organizationColorPrimary: orgBranding?.color?.primary || p.organization.branding.color.primary,
      organizationColorAccent: orgBranding?.color?.accent || p.organization.branding.color.accent,
      organizationPhone: org?.phone || p.organization.phone || '',
      organizationEmail: org?.contactEmail || p.organization.contactEmail,
      organizationAddress: org?.address || p.organization.address,
      socialInitials: socials,
      leafImageUrl: await resolveDecor(rawData?.decor?.image ?? p.decor?.image, {
        tintColor: decorColorFor(rawData?.decor?.tint ?? p.decor?.tint, {
          primary: orgBranding?.color?.primary || p.organization.branding.color.primary,
          accent: orgBranding?.color?.accent || p.organization.branding.color.accent,
        }),
      }),

      coverEyebrow: rawData?.cover?.eyebrow ?? p.cover.eyebrow ?? '',
      coverTitle: rawData?.cover?.title || p.cover.title,
      coverDescription: rawData?.cover?.description ?? p.cover.description ?? '',

      flap: textBlockOf(rawData?.flap, p.flap),
      insideLeft: textBlockOf(rawData?.insideLeft, p.insideLeft),
      insideRight: textBlockOf(rawData?.insideRight, p.insideRight),

      servicesHeading: rawData?.services?.heading || p.services.heading,
      serviceItems: items.filter((item) => typeof item === 'string' && item.trim() !== '').slice(0, 8),
      serviceImageUrl: await resolveDecor(rawData?.services?.imageUrl),
      serviceImageCaption: rawData?.services?.imageCaption ?? p.services.imageCaption ?? '',

      ctaLabel: rawData?.callToAction?.label || p.callToAction.label,
      ctaPhone: rawData?.callToAction?.phone || org?.phone || p.callToAction.phone || '',
      ctaNote: rawData?.callToAction?.note ?? p.callToAction.note ?? '',
      ctaSocialLabel: rawData?.callToAction?.socialLabel ?? p.callToAction.socialLabel ?? '',
    }
  },
  signerFields: [],
})
