import { parseSchemaToJsonSchema } from '~/server/utils/zod-to-json-schema'
import type { TemplateDefinition } from '~/server/utils/template-registry'

const cache = new Map<string, Record<string, any>>()

export const token = (label: string) => `{{${label}}}`

const singular = (label: string) => (label.endsWith('s') && !label.endsWith('ss') ? label.slice(0, -1) : label)

function sectionOf(parents: any[]): string {
  const nearestArray = [...parents].reverse().find((parent) => parent.type === 'array')
  if (nearestArray) return singular(nearestArray.title || '')
  return parents[0]?.title || ''
}

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

function build(node: any, placeholder: any, parents: any[], counts: Map<string, number>, requiredOnly: boolean): any {
  if (!node || typeof node !== 'object') return undefined

  if (node.type === 'object' && node.properties) {
    const result: Record<string, any> = {}
    for (const [key, child] of Object.entries<any>(node.properties)) {
      if (requiredOnly && !(node.required ?? []).includes(key)) continue
      const value = build(child, placeholder?.[key], parentsFor(parents, node), counts, requiredOnly)
      if (value !== undefined) result[key] = value
    }
    return result
  }

  if (node.type === 'array') {
    const item = build(node.items, Array.isArray(placeholder) ? placeholder[0] : undefined, [...parents, node], counts, requiredOnly)
    return item === undefined ? [] : [item]
  }

  if (Array.isArray(node.enum)) return placeholder !== undefined && node.enum.includes(placeholder) ? placeholder : node.enum[0]
  if (node.type === 'boolean') return typeof placeholder === 'boolean' ? placeholder : false

  if (node['x-boilerplate'] && typeof placeholder === 'string') return placeholder

  if (node['x-widget']) return typeof placeholder === 'string' ? placeholder : ''

  if (isLeaf(node)) {
    const section = sectionOf(parents)
    const title = node.title || section || 'Value'

    const specific = title.includes(' ') && (counts.get(title) || 0) <= 1
    return token(specific || !section || title.toLowerCase().includes(section.toLowerCase()) ? title : `${section} ${title}`)
  }

  return undefined
}

export function getTokenPayload(templateDef: TemplateDefinition, { requiredOnly = false } = {}): Record<string, any> {
  const cacheKey = `${templateDef.id}:${requiredOnly}`
  const hit = cache.get(cacheKey)
  if (hit) return structuredClone(hit)

  let payload: Record<string, any> = {}
  if (templateDef.schema) {
    const jsonSchema = { ...parseSchemaToJsonSchema(templateDef.schema, templateDef.placeholders), 'x-root': true }
    const counts = new Map<string, number>()
    collectTitles(jsonSchema, [], counts)
    payload = build(jsonSchema, templateDef.placeholders, [], counts, requiredOnly)
  }

  cache.set(cacheKey, payload)
  return structuredClone(payload)
}

export function deepMerge(base: any, override: any): any {
  if (override === undefined || override === null || override === '') return base
  if (Array.isArray(override) || typeof override !== 'object' || typeof base !== 'object' || base === null || Array.isArray(base)) return override

  const result: Record<string, any> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    result[key] = deepMerge(base[key], value)
  }
  return result
}
