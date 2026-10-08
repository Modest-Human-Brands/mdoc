import { fontStore } from '@ceereals/vue-pdf'
import { markFontRegistered, type TemplateFont } from '~/server/utils/fonts'
import type { Component } from 'vue'
import type { z } from 'zod'

const registeredFonts = new Set<string>()
let hyphenationDisabled = false

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

export type TemplateCategory = 'Billing' | 'Contracts' | 'Certificates' | 'Marketing'

export interface TemplateDefinition {
  id: string
  label: string
  shortLabel?: string
  category?: TemplateCategory
  description: string
  /** Fonts the template uses. `{ name, family, weights }` entries are fetched on demand (see server/utils/fonts.ts). */
  fonts?: TemplateFont[]
  component: Component
  schema: z.ZodObject<any, any>
  placeholders: Record<string, any>
  transformPayload: (rawData: any) => Promise<Record<string, any>>
  signerFields: DocumentField[]
}

export const templateRegistry: Record<string, TemplateDefinition> = {}

export default function registerTemplate(definition: TemplateDefinition) {
  templateRegistry[definition.id] = definition

  if (definition.fonts) {
    for (const font of definition.fonts) {
      // Entries with a `family` are resolved online at render time; plain `{ name, path }` entries are bundled files
      if (font.family || !font.path) continue

      const fontKey = `${font.name}:${font.weight ?? 'normal'}`
      if (!registeredFonts.has(fontKey)) {
        fontStore.register({
          family: font.name,
          src: font.path,
          ...(font.weight === undefined ? {} : { fontWeight: font.weight }),
        })
        markFontRegistered(font.name, font.weight ?? 400)
        registeredFonts.add(fontKey)
      }
    }
  }

  if (!hyphenationDisabled) {
    fontStore.registerHyphenationCallback((word) => [word])
    hyphenationDisabled = true
  }
}
