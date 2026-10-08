// server/tasks/templates/sample-images.ts
// Renders the neutral "sample" variant of every template and writes static page images to public/templates/<id>/sample-<n>.png
// plus public/templates/manifest.json. Run after changing a template:
//   npx nitro task run templates:sample-images            (payload: { "check": true } only compares, exits non-zero if stale)
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { defineTask } from 'nitro/task'

import { templateRegistry } from '~/server/utils/template-registry'
import { buildVariantVariables, renderTemplatePdf } from '~/server/utils/render-template'
import rasterizePdfPages from '~/server/utils/rasterize-pdf'
import type { SampleManifest } from '~/server/utils/sample-manifest'

import '~/templates/document'

const OUT_DIR = path.resolve(process.cwd(), 'public/templates')

export default defineTask({
  meta: {
    name: 'templates:sample-images',
    description: 'Renders the neutral sample variant of every template to static PNGs in public/templates (Git LFS).',
  },
  async run({ payload }) {
    const check = Boolean(payload?.check)
    const manifest: SampleManifest = {}
    const images: { id: string; page: number; png: Buffer }[] = []

    for (const templateDef of Object.values(templateRegistry)) {
      const pdf = await renderTemplatePdf(templateDef, buildVariantVariables(templateDef, 'sample').variables)
      const pages = await rasterizePdfPages(pdf, 2)

      const hash = createHash('sha1')
      for (const page of pages) hash.update(page.png)
      manifest[templateDef.id] = { pageCount: pages.length, width: pages[0]!.width, height: pages[0]!.height, hash: hash.digest('hex').slice(0, 12) }
      for (const [index, page] of pages.entries()) images.push({ id: templateDef.id, page: index + 1, png: page.png })
    }

    const manifestPath = path.join(OUT_DIR, 'manifest.json')

    if (check) {
      const current: SampleManifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{}'))
      const stale = Object.keys(manifest).filter((id) => current[id]?.hash !== manifest[id]!.hash)
      if (stale.length > 0) throw new Error(`Sample images are stale for: ${stale.join(', ')}. Run templates:sample-images.`)
      return { result: { stale: [] as string[], templates: Object.keys(manifest).length } }
    }

    for (const id of Object.keys(manifest)) await rm(path.join(OUT_DIR, id), { recursive: true, force: true })
    for (const { id, page, png } of images) {
      await mkdir(path.join(OUT_DIR, id), { recursive: true })
      await writeFile(path.join(OUT_DIR, id, `sample-${page}.png`), png)
    }
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

    return { result: { templates: Object.keys(manifest).length, images: images.length } }
  },
})
