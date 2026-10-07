// server/utils/zod-to-json-schema.ts
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

export function parseSchemaToJsonSchema(schema: z.ZodTypeAny): Record<string, any> {
  const rawJsonSchema = z.toJSONSchema(schema, {
    unrepresentable: 'any',
    override: (ctx) => {
      // Dates travel as ISO-8601 strings over JSON; z.coerce.date() accepts them.
      if (ctx.zodSchema._zod.def.type === 'date') {
        ctx.jsonSchema.type = 'string'
        ctx.jsonSchema.format = 'date'
      }
    },
  })

  function enrichSchema(node: any, parentKey: string = '', depth: number = 0): any {
    if (!node || typeof node !== 'object') return node

    if (node.type === 'object' && node.properties) {
      const enrichedProps: Record<string, any> = {}
      let orderIndex = 1

      for (const [key, prop] of Object.entries<any>(node.properties)) {
        const enrichedChild = enrichSchema(prop, key, depth + 1)

        // Set humanized title if not explicitly provided
        if (!enrichedChild.title) {
          enrichedChild.title = humanizeFieldName(key)
        }

        // Layout hint: assign section label to top-level object containers
        if (depth === 0 && enrichedChild.type === 'object') {
          enrichedChild['x-section'] = humanizeFieldName(key)
        }

        // Layout hint: column span & sequence index
        enrichedChild['x-column'] = determineColumnSpan(key, enrichedChild)
        enrichedChild['x-order'] = orderIndex++

        enrichedProps[key] = enrichedChild
      }

      return {
        ...node,
        properties: enrichedProps,
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

  return enrichSchema(rawJsonSchema)
}

// Backward-compatible fallback for legacy consumers
export default function parseSchemaVariables(schema: z.ZodTypeAny): Record<string, any> {
  return parseSchemaToJsonSchema(schema)
}
