// server/utils/token-payload.ts
// Builds a "token payload" for a template: every dynamic field holds its own label as `{{Field Label}}`, using the same
// label the Details form shows (schema `title`). Rendering it makes the dynamic fields of any template easy to scan.
// A short or ambiguous label is prefixed with its Details section, e.g. `{{Recipient Name}}`,
// `{{Project Title}}`, `{{Deliverable Title}}`, so each token maps to exactly one form field.
import { parseSchemaToJsonSchema } from '~/server/utils/zod-to-json-schema'
import type { TemplateDefinition } from '~/server/utils/template-registry'

const cache = new Map<string, Record<string, any>>()

export const token = (label: string) => `{{${label}}}`
export const isToken = (value: unknown): value is string => typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')

const singular = (label: string) => (label.endsWith('s') && !label.endsWith('ss') ? label.slice(0, -1) : label)

/** Section of a field: the nearest array (e.g. "Deliverable"), else its top-level group (e.g. "Recipient"), else none. */
function sectionOf(parents: any[]): string {
  const nearestArray = [...parents].reverse().find((parent) => parent.type === 'array')
  if (nearestArray) return singular(nearestArray.title || '')
  return parents[0]?.title || ''
}

/** The root object is not a section; everything below it is. */
const parentsFor = (parents: any[], node: any) => (parents.length === 0 && node['x-root'] ? [] : [...parents, node])

function isLeaf(node: any) {
  return ['string', 'number', 'integer'].includes(node?.type) && !Array.isArray(node.enum)
}

function collectTitles(node: any, parents: any[], counts: Map<string, number>) {
  if (!node || typeof node !== 'object') return
  if (node.type === 'object' && node.properties) {
    for (const child of Object.values<any>(node.properties)) collectTitles(child, parentsFor(parents, node), counts)
  } else if (node.type === 'array') {
    collectTitles(node.items, [...parents, node], counts)
  } else if (isLeaf(node)) {
    const title = node.title || sectionOf(parents) || 'Value'
    counts.set(title, (counts.get(title) || 0) + 1)
  }
}

function build(node: any, placeholder: any, parents: any[], counts: Map<string, number>): any {
  if (!node || typeof node !== 'object') return undefined

  if (node.type === 'object' && node.properties) {
    const result: Record<string, any> = {}
    for (const [key, child] of Object.entries<any>(node.properties)) {
      const value = build(child, placeholder?.[key], parentsFor(parents, node), counts)
      if (value !== undefined) result[key] = value
    }
    return result
  }

  if (node.type === 'array') {
    const item = build(node.items, Array.isArray(placeholder) ? placeholder[0] : undefined, [...parents, node], counts)
    return item === undefined ? [] : [item]
  }

  // Enums and booleans must stay valid values (they switch layout); everything else becomes its label
  if (Array.isArray(node.enum)) return placeholder !== undefined && node.enum.includes(placeholder) ? placeholder : node.enum[0]
  if (node.type === 'boolean') return typeof placeholder === 'boolean' ? placeholder : false
  // Long boilerplate (e.g. terms text) keeps its default so the sample still shows the real wording
  if (node['x-boilerplate'] && typeof placeholder === 'string') return placeholder

  // Decor / image pickers hold a reference, not text: keep the template's default (or none)
  if (node['x-widget']) return typeof placeholder === 'string' ? placeholder : ''

  if (isLeaf(node)) {
    const section = sectionOf(parents)
    const title = node.title || section || 'Value'
    // Multi-word labels ('Invoice Number') are already specific; short ones ('Name', 'Rate') get their section
    const specific = title.includes(' ') && (counts.get(title) || 0) <= 1
    return token(specific || !section || title.toLowerCase().includes(section.toLowerCase()) ? title : `${section} ${title}`)
  }

  return undefined
}

/** Token payload for a template (no `organization`; that is resolved per variant). Cached per template. */
export function getTokenPayload(templateDef: TemplateDefinition): Record<string, any> {
  const hit = cache.get(templateDef.id)
  if (hit) return structuredClone(hit)

  let payload: Record<string, any> = {}
  if (templateDef.schema) {
    const jsonSchema = { ...parseSchemaToJsonSchema(templateDef.schema, templateDef.placeholders), 'x-root': true }
    const counts = new Map<string, number>()
    collectTitles(jsonSchema, [], counts)
    payload = build(jsonSchema, templateDef.placeholders, [], counts)
  }

  cache.set(templateDef.id, payload)
  return structuredClone(payload)
}

/** Deep-merge `override` over `base`; arrays and primitives in `override` replace, `undefined`/`null`/empty strings are skipped. */
export function deepMerge(base: any, override: any): any {
  if (override === undefined || override === null || override === '') return base
  if (Array.isArray(override) || typeof override !== 'object' || typeof base !== 'object' || base === null || Array.isArray(base)) return override

  const result: Record<string, any> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    result[key] = deepMerge(base[key], value)
  }
  return result
}
