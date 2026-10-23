import { defineTask } from 'nitro/task'
import { useStorage } from 'nitro/storage'

import { hasDocument, writeDocument } from '~/server/utils/documents'

export default defineTask({
  meta: {
    name: 'documents:migrate',
    description: 'Copies generated PDFs and PNGs from the local static folder to the document storage (R2/S3). Nothing is deleted.',
  },
  async run({ payload }) {
    const source = useStorage('fs')
    const keys = (await source.getKeys()).filter((key) => /\.(pdf|png)$/.test(key))
    let copied = 0
    let skipped = 0

    for (const key of keys) {
      if (!payload?.force && (await hasDocument(key))) {
        skipped++
        continue
      }
      if (!payload?.dryRun) {
        const bytes = await source.getItemRaw<Buffer>(key)
        if (bytes) await writeDocument(key, Buffer.from(bytes))
      }
      copied++
    }

    return { result: { found: keys.length, copied, skipped, dryRun: Boolean(payload?.dryRun) } }
  },
})
