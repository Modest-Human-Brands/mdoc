import { z } from 'zod'

export default function parseSchemaVariables(schema: z.ZodTypeAny): Record<string, any> {
  const jsonSchema = z.toJSONSchema(schema, {
    unrepresentable: 'any',

    override: (ctx) => {
      const isDate = ctx.zodSchema instanceof z.ZodDate || (ctx.zodSchema as any)._def?.typeName === 'ZodDate' || (ctx.zodSchema as any)._zod?.def?.type === 'date'

      if (isDate) {
        ctx.jsonSchema.type = 'date'
      }
    },
  })

  const mapped = mapJsonSchemaToVariables(jsonSchema)

  return typeof mapped === 'object' && !Array.isArray(mapped) ? mapped : {}
}

function mapJsonSchemaToVariables(jsonSchema: any): any {
  if (!jsonSchema) return 'any'

  if (jsonSchema.anyOf || jsonSchema.oneOf) {
    const validTypes = (jsonSchema.anyOf || jsonSchema.oneOf).filter((s: any) => s.type !== 'null')
    if (validTypes.length > 0) return mapJsonSchemaToVariables(validTypes[0])
  }

  if (jsonSchema.enum && Array.isArray(jsonSchema.enum)) {
    return `enum:${jsonSchema.enum.join(',')}`
  }

  if (jsonSchema.type === 'array') {
    const items = jsonSchema.items

    if (items && items.type === 'object') {
      return [mapJsonSchemaToVariables(items)]
    } else if (items && items.type) {
      return `array<${items.type}>`
    }
    return 'array<any>'
  }

  if (jsonSchema.type === 'object') {
    if (jsonSchema.properties) {
      const obj: Record<string, any> = {}
      for (const [key, propSchema] of Object.entries(jsonSchema.properties)) {
        obj[key] = mapJsonSchemaToVariables(propSchema)
      }
      return obj
    }

    if (jsonSchema.additionalProperties !== false) {
      return 'record'
    }
    return 'object'
  }

  if (jsonSchema.type === 'string' && jsonSchema.format) {
    if (jsonSchema.format === 'email') return 'email'
    if (jsonSchema.format === 'uri') return 'url'
  }

  if (jsonSchema.type) {
    return jsonSchema.type
  }

  return 'any'
}
