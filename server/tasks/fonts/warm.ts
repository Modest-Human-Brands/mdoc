// server/tasks/fonts/warm.ts
// Downloads and caches every font the templates declare (and any extra families) so the first render is not slow.
//   npx nitro task run fonts:warm                                  (payload: { "families": ["Inter", "Roboto"] } adds brand fonts)
import { defineTask } from 'nitro/task'

import { DEFAULT_FONT, ensureFonts, isFontRegistered, type TemplateFont } from '~/server/utils/fonts'
import { templateRegistry } from '~/server/utils/template-registry'

import '~/templates/document'

export default defineTask({
  meta: {
    name: 'fonts:warm',
    description: 'Fetches and caches the fonts used by all templates (and optional extra families) via unifont.',
  },
  async run({ payload }) {
    const wanted = new Map<string, TemplateFont>()
    for (const templateDef of Object.values(templateRegistry)) {
      for (const font of templateDef.fonts ?? []) {
        if (font.family) wanted.set(font.name, font)
      }
    }
    for (const name of [DEFAULT_FONT, ...((payload?.families as string[] | undefined) ?? [])]) {
      if (!wanted.has(name)) wanted.set(name, { name })
    }

    await ensureFonts([...wanted.values()])

    const failed = [...wanted.keys()].filter((name) => !isFontRegistered(name))
    return { result: { fonts: wanted.size, failed } }
  },
})
