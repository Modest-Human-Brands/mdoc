export interface OrganizationProfile {
  id: string
  name: string
  contactEmail: string
  legalName?: string
  entityType?: 'LLP' | 'Private Limited' | 'Proprietorship'
  tradeRelationship?: 'Primary' | 'Trading As' | 'Operating Division' | 'Wholly-Owned Subsidiary' | 'Special Purpose Vehicle'
  gstin?: string
  pan?: string
  address?: string
  foundedYear?: number
  accountDetails?: {
    accountName?: string
    accountNumber?: number | string
    bankName?: string
    ifscCode?: string
  }
  branding: {
    logo?: string
    color: { primary: string; accent: string }
    font: string
  }
  website?: string
  phone?: string
  whatsapp?: string
  billingEmail?: string
  socials?: Record<string, any>
}

const BRAND_DEFAULTS = { color: { primary: '#111827', accent: '#5945EA' }, font: 'Exo2' }

export const organizationPresets: Record<string, OrganizationProfile> = {
  'modest-human-brands': {
    id: 'modest-human-brands',
    name: 'Modest Human Brands',
    legalName: 'Modest Human Brands LLP',
    entityType: 'LLP',
    tradeRelationship: 'Primary',
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
    branding: { logo: 'https://modesthumanbrands.com/logo.svg', ...BRAND_DEFAULTS },
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

export const neutralOrganization: OrganizationProfile = {
  id: 'neutral',
  name: 'Your Company',
  legalName: 'Legal name',
  entityType: 'LLP',
  tradeRelationship: 'Primary',
  pan: 'XXXXX0000X',
  address: 'Street, City, State, Country',
  accountDetails: { accountName: '—', accountNumber: '—', bankName: '—', ifscCode: '—' },
  branding: { logo: '', color: { primary: '#1A1A1A', accent: '#9CA3AF' }, font: 'Exo2' },
  phone: '+00 00000 00000',
  contactEmail: 'email@example.com',
  billingEmail: 'billing@example.com',
}

export function resolveOrganization(orgInput?: string | Record<string, any>, fallbackPreset?: Record<string, any>): OrganizationProfile {
  if (orgInput && typeof orgInput === 'object') {
    return {
      ...(orgInput as OrganizationProfile),
      branding: {
        ...orgInput.branding,
        color: { ...BRAND_DEFAULTS.color, ...orgInput.branding?.color },
        font: orgInput.branding?.font || BRAND_DEFAULTS.font,
      },
    }
  }

  const preset = typeof orgInput === 'string' ? organizationPresets[orgInput] : undefined
  return preset ?? (fallbackPreset as OrganizationProfile | undefined) ?? organizationPresets['modest-human-brands']!
}

export const organizationFrom = (variables: Record<string, any>, fallbackPreset?: Record<string, any>) =>
  resolveOrganization(variables.organization || variables.organizationId || variables.orgId, fallbackPreset)
