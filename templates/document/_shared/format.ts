// Formatting helpers shared by document templates.
// Fields the user has not filled in preview as `{{Field Label}}` tokens (see server/utils/token-payload.ts);
// the helpers pass tokens through untouched and never produce "NaN" or "Invalid Date".

export const isToken = (value: unknown): value is string => typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')

/** For optional numeric inputs (discount, tax, amount paid): anything that is not a finite number counts as 0. */
export const optionalNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

/** `1,20,000 Rupees`; tokens pass through; unknown (e.g. computed from tokens) shows an em dash. */
export function money(value: unknown, unit = 'Rupees'): string {
  if (isToken(value)) return value
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('en-IN')} ${unit}` : '—'
}

/** `7 Oct 2026`; tokens pass through; missing or invalid dates show an em dash. */
export function dateText(value: unknown): string {
  if (isToken(value)) return value
  if (!value) return '—'
  const date = new Date(value as string | number | Date)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
}
