import { z } from 'zod'

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  contactEmail: z.email(),
  legalName: z.string().optional(),
  entityType: z.enum(['LLP', 'Private Limited', 'Proprietorship']).optional(),
  tradeRelationship: z.enum(['Primary', 'Trading As', 'Operating Division', 'Wholly-Owned Subsidiary', 'Special Purpose Vehicle']).optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  address: z.string().optional(),
  foundedYear: z.number().optional(),
  accountDetails: z
    .object({
      accountName: z.string().optional(),
      accountNumber: z.union([z.number(), z.string()]).optional(),
      bankName: z.string().optional(),
      ifscCode: z.string().optional(),
      upiId: z
        .string()
        .regex(/^[\w.-]{2,256}@[a-z][a-z0-9.-]{1,64}$/i, 'Invalid UPI ID')
        .optional(),
    })
    .optional(),
  branding: z.object({
    logo: z.string().optional(),
    qr: z
      .object({
        color: z.enum(['brand', 'monochrome']).optional(),
        eyeShape: z.enum(['square', 'rounded', 'circle', 'leaf']).optional(),
        eyeColor: z.enum(['brand', 'monochrome']).optional(),
        logo: z.boolean().optional(),
        target: z.enum(['document', 'verify', 'upi']).optional(),
      })
      .optional(),
    color: z.object({ primary: z.string(), accent: z.string() }),
    font: z.string(),
  }),
  website: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  billingEmail: z.email().optional(),
  socials: z.record(z.string(), z.any()).optional(),
})

export { sampleOrganization as placeholderOrganization } from '~/server/utils/organization-store'
