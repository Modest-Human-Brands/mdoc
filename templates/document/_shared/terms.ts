import { z } from 'zod'
import parseMarkdown, { type ParsedTerm } from '~/server/utils/parse-markdown.ts'

/**
 * A single term snippet, resolved by the caller from the Compliance library and
 * snapshotted into the document when it is created.
 */
export const termItemSchema = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  title: z.string(),
  content: z.string().meta({ 'x-boilerplate': true }),
  version: z.number().int().min(1).optional(),
  updatedAt: z.coerce.date().optional(),
})

/**
 * `items` is the current shape: an ordered list of term snippets.
 * `content` + `lastUpdated` is the legacy shape (one markdown blob) and keeps
 * documents created before term snippets existed rendering unchanged.
 */
export const termsSchema = z.object({
  items: z.array(termItemSchema).optional(),
  content: z.string().meta({ 'x-boilerplate': true }).optional(),
  lastUpdated: z.coerce.date().optional(),
})

export type TermsInput = z.infer<typeof termsSchema>

export interface TermSection {
  /** 1-based position, only for titled snippets. */
  number?: number
  title?: string
  version?: number
  blocks: ParsedTerm[]
  /** True when the section is short enough to be kept on a single page. */
  keepTogether: boolean
}

interface ResolveOptions {
  /** Markdown used when the payload carries no terms at all (template placeholder). */
  fallback?: string
  /** Values for `{{variable}}` interpolation. */
  variables?: Record<string, any>
  /** Evaluates a `{{#if condition}}…{{/if}}` condition. Blocks are dropped when it returns false. */
  condition?: (condition: string) => boolean
}

const KEEP_TOGETHER_MAX_CHARS = 1800

const applyConditionals = (markdown: string, condition?: (condition: string) => boolean) =>
  condition ? markdown.replace(/\{\{#if\s+([^}]+?)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, expression: string, inner: string) => (condition(expression) ? inner : '')) : markdown

const textLength = (blocks: ParsedTerm[]) =>
  blocks.reduce(
    (sum, block) => sum + (block.text?.length ?? 0) + (block.items ?? []).reduce((acc, item) => acc + item.text.length + (item.subitems ?? []).reduce((a, s) => a + s.text.length, 0), 0),
    0
  )

/**
 * Turns a `terms` payload into renderable sections.
 *
 * Order is exactly the order of `items`; the caller (picker) owns ordering.
 * Numbering is assigned here so authors never number their snippets by hand.
 */
export function resolveTerms(raw: TermsInput | undefined, options: ResolveOptions = {}): TermSection[] {
  const { fallback, variables = {}, condition } = options
  const parse = (markdown: string) => parseMarkdown(applyConditionals(markdown, condition), variables)

  const items = (raw?.items ?? []).filter((item) => item.title?.trim() || item.content?.trim())
  if (items.length > 0) {
    return items.map((item, index) => {
      const blocks = parse(item.content ?? '')
      return {
        number: index + 1,
        title: item.title?.trim() || undefined,
        version: item.version,
        blocks,
        keepTogether: textLength(blocks) <= KEEP_TOGETHER_MAX_CHARS,
      }
    })
  }

  const legacy = raw?.content?.trim() ? raw.content : fallback
  if (!legacy?.trim()) return []

  return [{ blocks: parse(legacy), keepTogether: false }]
}
