import { z } from 'zod'

function humanizeFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

function determineColumnSpan(key: string, propSchema: any): number {
  const type = propSchema.type
  const format = propSchema.format

  if (type === 'number' || format === 'date' || format === 'time' || format === 'email' || type === 'boolean') {
    return 1
  }

  if (type === 'array' || key.toLowerCase().includes('content') || key.toLowerCase().includes('terms') || key.toLowerCase().includes('address')) {
    return 2
  }

  return 1
}

const AUTO_FIELDS = new Set(['invoiceNumber', 'quoteNumber'])

const EXCLUDED_TOP_LEVEL = new Set(['organization'])

function toDefault(value: any): any {
  if (value instanceof Date) return undefined
  if (Array.isArray(value)) return value.map((item) => toDefault(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toDefault(v)]))
  }
  return value
}

export function parseSchemaToJsonSchema(schema: z.ZodTypeAny, placeholders: Record<string, any> = {}): Record<string, any> {
  const rawJsonSchema = z.toJSONSchema(schema, {
    unrepresentable: 'any',
    override: (ctx) => {
      if (ctx.zodSchema._zod.def.type === 'date') {
        ctx.jsonSchema.type = 'string'
        ctx.jsonSchema.format = 'date'
      }
    },
  })

  function enrichSchema(node: any, parentKey: string = '', depth: number = 0, defaults?: any): any {
    if (!node || typeof node !== 'object') return node

    if (node.type === 'object' && node.properties) {
      const enrichedProps: Record<string, any> = {}
      let orderIndex = 1

      for (const [key, prop] of Object.entries<any>(node.properties)) {
        if (depth === 0 && EXCLUDED_TOP_LEVEL.has(key)) continue

        const childDefault = defaults?.[key]
        const enrichedChild = enrichSchema(prop, key, depth + 1, childDefault)

        const defaultable = ['number', 'integer', 'boolean'].includes(enrichedChild.type) || enrichedChild.enum || parentKey === 'financials'
        const defaultValue = toDefault(childDefault)
        if (defaultValue !== undefined && enrichedChild.type !== 'object' && enrichedChild.type !== 'array' && defaultable) {
          enrichedChild.default = defaultValue
        }
        if (AUTO_FIELDS.has(key)) {
          enrichedChild['x-auto'] = true
        }

        if (!enrichedChild.title) {
          enrichedChild.title = humanizeFieldName(key)
        }

        if (depth === 0 && enrichedChild.type === 'object') {
          enrichedChild['x-section'] = humanizeFieldName(key)
        }

        enrichedChild['x-column'] = determineColumnSpan(key, enrichedChild)
        enrichedChild['x-order'] = orderIndex++

        enrichedProps[key] = enrichedChild
      }

      return {
        ...node,
        properties: enrichedProps,
        ...(Array.isArray(node.required) && depth === 0 ? { required: node.required.filter((k: string) => !EXCLUDED_TOP_LEVEL.has(k)) } : {}),
      }
    }

    if (node.type === 'array' && node.items) {
      return {
        ...node,
        items: enrichSchema(node.items, parentKey, depth + 1),
      }
    }

    return node
  }

  return enrichSchema(rawJsonSchema, '', 0, placeholders)
}

export default function parseSchemaVariables(schema: z.ZodTypeAny): Record<string, any> {
  return parseSchemaToJsonSchema(schema)
}
