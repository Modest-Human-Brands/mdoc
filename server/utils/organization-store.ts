// server/utils/organization-store.ts
export interface OrganizationProfile {
  id: string
  name: string
  legalName: string
  entityType: 'LLP' | 'Private Limited' | 'Proprietorship'
  tradeRelationship: 'Primary' | 'Trading As' | 'Operating Division' | 'Wholly-Owned Subsidiary' | 'Special Purpose Vehicle'
  gstin?: string
  pan?: string
  address: string
  foundedYear: number
  accountDetails: {
    accountName: string
    accountNumber: number
    bankName: string
    ifscCode: string
  }
  branding: {
    logo: string
    color: {
      primary: string
      accent: string
    }
    font: string
  }
  website?: string
  phone?: string
  contactEmail: string
  billingEmail: string
  whatsapp?: string
  socials?: Record<string, any>
  primaryContactId: string
  organizationMemberIds: string[]
  createdAt: string
  updatedAt: string
}

export const organizationPresets: Record<string, OrganizationProfile> = {
  'modest-human-brands': {
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
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString(),
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

/** Neutral, unbranded organisation used by the `sample` preview variant (grey logo placeholder, no real details). */
export const neutralOrganization: OrganizationProfile = {
  id: 'neutral',
  name: 'Your Company',
  legalName: 'Legal name',
  entityType: 'LLP',
  tradeRelationship: 'Primary',
  gstin: undefined,
  pan: 'XXXXX0000X',
  address: 'Street, City, State, Country',
  foundedYear: 2000,
  accountDetails: {
    accountName: '—',
    accountNumber: '—' as unknown as number,
    bankName: '—',
    ifscCode: '—',
  },
  branding: {
    logo: '',
    color: { primary: '#1A1A1A', accent: '#9CA3AF' },
    font: 'Exo2',
  },
  phone: '+00 00000 00000',
  contactEmail: 'email@example.com',
  billingEmail: 'billing@example.com',
  primaryContactId: '',
  organizationMemberIds: [],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
}

export function resolveOrganization(orgInput?: string | Record<string, any>, fallbackPreset?: Record<string, any>): OrganizationProfile {
  let targetId = 'modest-human-brands'

  if (typeof orgInput === 'string' && orgInput) {
    targetId = orgInput
  } else if (typeof orgInput === 'object' && orgInput?.id) {
    targetId = orgInput.id
  }

  const base = organizationPresets[targetId] || fallbackPreset || organizationPresets['modest-human-brands']

  if (typeof orgInput === 'object' && orgInput !== null) {
    return {
      ...base,
      ...orgInput,
      branding: {
        ...base.branding,
        ...orgInput.branding,
        color: {
          ...base.branding.color,
          ...orgInput.branding?.color,
        },
      },
      accountDetails: {
        ...base.accountDetails,
        ...orgInput.accountDetails,
      },
    }
  }

  return base
}
