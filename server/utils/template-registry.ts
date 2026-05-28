import { fontStore } from '@ceereals/vue-pdf'
import type { Component } from 'vue'
import type { z } from 'zod'

const registeredFonts = new Set<string>()

export interface TemplateDefinition {
  id: string
  fonts?: Array<{ name: string; path: string }>
  component: Component
  schema: z.ZodObject<any, any>
  placeholders: Record<string, any>
  transformPayload: (rawData: any) => Record<string, any>
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
