import { z } from 'zod'

export default function parseSchemaVariables(schema: z.ZodTypeAny): Record<string, any> {
  // 1. Convert the Zod Schema into a standard JSON Schema
  const jsonSchema = z.toJSONSchema(schema, {
    // Prevent unrepresentable types (like z.date) from throwing an error
    unrepresentable: 'any',

    // Override the conversion rules to safely handle Dates
    override: (ctx) => {
      // Check if the current node is a Date safely
      const isDate = ctx.zodSchema instanceof z.ZodDate || (ctx.zodSchema as any)._def?.typeName === 'ZodDate' || (ctx.zodSchema as any)._zod?.def?.type === 'date'

      if (isDate) {
        ctx.jsonSchema.type = 'date'
      }
    },
  })

  // 2. Map the clean JSON Schema back to your custom variable format
  const mapped = mapJsonSchemaToVariables(jsonSchema)

  // Ensure we always return an object at the root level
  return typeof mapped === 'object' && !Array.isArray(mapped) ? mapped : {}
}

// --- Helper Function ---
function mapJsonSchemaToVariables(jsonSchema: any): any {
  if (!jsonSchema) return 'any'

  // Extract core types out of unions (e.g., handling z.nullable())
  if (jsonSchema.anyOf || jsonSchema.oneOf) {
    const validTypes = (jsonSchema.anyOf || jsonSchema.oneOf).filter((s: any) => s.type !== 'null')
    if (validTypes.length > 0) return mapJsonSchemaToVariables(validTypes[0])
  }

  // Handle Arrays
  if (jsonSchema.type === 'array') {
    const items = jsonSchema.items

    if (items && items.type === 'object') {
      // Array of objects (fixes your `deliverables` issue) -> [{ ... }]
      return [mapJsonSchemaToVariables(items)]
    } else if (items && items.type) {
      // Primitive arrays -> "array<string>"
      return `array<${items.type}>`
    }
    return 'array<any>'
  }

  // Handle Objects
  if (jsonSchema.type === 'object') {
    if (jsonSchema.properties) {
      const obj: Record<string, any> = {}
      for (const [key, propSchema] of Object.entries(jsonSchema.properties)) {
        obj[key] = mapJsonSchemaToVariables(propSchema)
      }
      return obj
    }
    // Fallback for z.record() or untyped objects -> "record"
    if (jsonSchema.additionalProperties !== false) {
      return 'record'
    }
    return 'object'
  }

  // Handle Special Formats (e.g., z.email() or z.url())
  if (jsonSchema.type === 'string' && jsonSchema.format) {
    if (jsonSchema.format === 'email') return 'email'
    if (jsonSchema.format === 'uri') return 'url'
  }

  // Handle Primitives (string, number, boolean, date)
  if (jsonSchema.type) {
    return jsonSchema.type
  }

  // Default fallback
  return 'any'
}
