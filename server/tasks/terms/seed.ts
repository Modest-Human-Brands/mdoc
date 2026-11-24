import { defineTask } from 'nitro/task'

import { templateRegistry } from '~/server/utils/template-registry'
import { markdownToDoc } from '~/server/utils/terms-markdown'
import { createTerm, listTerms } from '~/server/utils/terms-store'

import '~/templates/document'

const TYPE_HINTS: [RegExp, string][] = [
  [/payment|compensation|pricing|fee/i, 'Payment'],
  [/cancel|postpone|reschedul|terminat|behaviou?r/i, 'Cancellation'],
  [/copyright|ownership|usage|licen[cs]e/i, 'Copyright'],
  [/liabilit|indemni/i, 'Liability'],
  [/deliver|scope|shoot|travel|logistic/i, 'Delivery'],
  [/governing|law|jurisdiction|registration|changes/i, 'Legal'],
]

const typeOf = (title: string) => TYPE_HINTS.find(([pattern]) => pattern.test(title))?.[1] ?? 'General'

/** Splits a `### 1. Title` markdown blob into one snippet per heading. */
export function splitTermsMarkdown(markdown: string) {
  return markdown
    .split(/^### /m)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [heading = '', ...body] = part.split('\n')
      return { title: heading.replace(/^\d+\.\s*/, '').trim(), content: body.join('\n').trim() }
    })
    .filter((section) => section.title && section.content)
}

export default defineTask({
  meta: {
    name: 'terms:seed',
    description: 'Imports the static terms of the quotation, retainer and shoot contract templates into an organisation term library (payload: { orgId, publish? }).',
  },
  async run({ payload }) {
    const orgId = String(payload?.orgId ?? '').trim()
    if (!orgId) throw new Error('payload.orgId is required, e.g. {"orgId":"modest-human-brands"}')
    const status = payload?.publish === false ? 'Draft' : 'Release'

    const existing = new Set((await listTerms(orgId)).map((term) => term.slug))
    let created = 0

    for (const templateId of ['quotation', 'retainer-contract', 'shoot-contract']) {
      const markdown = templateRegistry[templateId]?.placeholders.terms?.content as string | undefined
      if (!markdown) continue

      for (const { title, content } of splitTermsMarkdown(markdown)) {
        const slug = `${templateId}-${title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')}`.slice(0, 80)
        if (existing.has(slug)) continue
        await createTerm(orgId, { title, slug, type: typeOf(title), appliesTo: [templateId], defaultFor: [templateId], order: created }, { status, content: markdownToDoc(content) })
        existing.add(slug)
        created++
      }
    }

    return { result: { orgId, created } }
  },
})
