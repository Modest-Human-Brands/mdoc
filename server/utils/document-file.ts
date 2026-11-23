import mime from 'mime-types'

import type { NotionDocument } from '~/server/types'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import { readDocument } from '~/server/utils/documents'

/** The stored files of a document: the original render, plus the latest signed copy once signing has started. */
export function documentFiles(document: NotionDocument) {
  const { properties } = document
  const baseTitle = notionTextStringify(properties.Name.title)
  const ext = mime.extension(properties['Mime Type'].select.name) || 'pdf'
  const status = properties.Status?.status?.name
  const baseline = `${baseTitle}.${ext}`

  let target = baseline
  if (status === 'Completed') {
    target = `${baseTitle}-signed.${ext}`
  } else if (status === 'Partially Signed') {
    const queueRaw = notionTextStringify(properties['Routing Queue']?.rich_text)
    if (queueRaw) {
      try {
        const signers = JSON.parse(queueRaw)
        const signedOrders = signers.filter((s: any) => s.status === 'SIGNED').map((s: any) => s.order)
        if (signedOrders.length > 0) target = `${baseTitle}-${Math.max(...signedOrders)}.${ext}`
      } catch {
        console.warn('Routing queue could not be parsed; serving the baseline file')
      }
    }
  }

  return { baseTitle, ext, status, baseline, target, image: `${baseTitle}.png` }
}

/** Reads the latest copy of a document, falling back to the original render. */
export async function readLatestDocument(files: ReturnType<typeof documentFiles>): Promise<Buffer | undefined> {
  const latest = await readDocument(files.target)
  if (latest || files.target === files.baseline) return latest
  console.warn(`Target file "${files.target}" missing, falling back to baseline "${files.baseline}"`)
  return readDocument(files.baseline)
}
