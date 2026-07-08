import { fontStore } from '@ceereals/vue-pdf'
import type { Component } from 'vue'
import type { z } from 'zod'

const registeredFonts = new Set<string>()

export type FieldType = 'SIGNATURE' | 'INITIALS' | 'DATE' | 'TEXT' | 'NAME' | 'EMAIL' | 'CHECKBOX'

export interface DocumentField {
  id: string
  type: FieldType
  pageIndex: number | number[] | string
  x: number
  y: number
  width: number
  height: number
  fontSize?: number
  required?: boolean
  signerOrder: number
}

export interface TemplateDefinition {
  id: string
  label: string
  description: string
  fonts?: Array<{ name: string; path: string }>
  component: Component
  schema: z.ZodObject<any, any>
  placeholders: Record<string, any>
  transformPayload: (rawData: any) => Record<string, any>
  signerFields: DocumentField[]
}

export const templateRegistry: Record<string, TemplateDefinition> = {}

export default function registerTemplate(definition: TemplateDefinition) {
  templateRegistry[definition.id] = definition

  if (definition.fonts) {
    for (const font of definition.fonts) {
      if (!registeredFonts.has(font.name)) {
        fontStore.register({
          family: font.name,
          src: font.path,
        })
        fontStore.registerHyphenationCallback((word) => [word])
        registeredFonts.add(font.name)
      }
    }
  }
}
