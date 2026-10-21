import { z } from 'zod'
import { organizationPresets } from '~/server/utils/organization-store'

export const organizationSchema = z.object({
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
})

export const placeholderOrganization = organizationPresets['modest-human-brands']
