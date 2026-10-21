export const isToken = (value: unknown): value is string => typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')

export const optionalNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

export function money(value: unknown, unit = 'Rupees'): string {
  if (isToken(value)) return value
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('en-IN')} ${unit}` : '—'
}

export function dateText(value: unknown): string {
  if (isToken(value)) return value
  if (!value) return '—'
  const date = new Date(value as string | number | Date)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
}

const RELATIONSHIP_LABELS: Record<string, (legalName: string) => string> = {
  'Trading As': (name) => `Trading as ${name}`,
  'Operating Division': (name) => `An operating division of ${name}`,
  'Wholly-Owned Subsidiary': (name) => `A wholly-owned subsidiary of ${name}`,
  'Special Purpose Vehicle': (name) => `A special purpose vehicle of ${name}`,
}

export const organizationRelationshipLabel = (relationship: string, legalName: string) => RELATIONSHIP_LABELS[relationship]?.(legalName) ?? legalName
