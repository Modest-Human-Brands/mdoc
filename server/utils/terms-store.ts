import { randomUUID } from 'node:crypto'
import { HTTPError, type H3Event } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import { z } from 'zod'

import type { AuthContext } from '~/server/utils/document-access'
import { docToMarkdown, emptyDoc } from '~/server/utils/terms-markdown'
import type { TemplateDefinition } from '~/server/utils/template-registry'

export const TERM_STATUSES = ['Plan', 'Draft', 'Release', 'Archive'] as const
export type TermStatus = (typeof TERM_STATUSES)[number]

export interface TermRecord {
  id: string
  slug: string
  title: string
  /** Free-form grouping label, e.g. "Payment". */
  type?: string
  status: TermStatus
  /** Template ids this term can be used on. Empty = any template. */
  appliesTo: string[]
  /** Template ids where this term is pre-selected. */
  defaultFor: string[]
  /** Template ids where this term is always included. Always a subset of `defaultFor`. */
  requiredFor: string[]
  version: number
  order: number
  /** Tiptap JSON limited to the nodes the PDF renders. */
  content: unknown
  /** `content` as markdown, the form snapshotted into documents. */
  markdown: string
  createdAt: string
  updatedAt: string
  /** Earlier versions of the markdown; documents keep their own snapshot, so this is for audit only. */
  history: { version: number; markdown: string; updatedAt: string }[]
}

export type TermMeta = Omit<TermRecord, 'content' | 'markdown' | 'history' | 'createdAt'> & { required?: boolean; selected?: boolean }

const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case')
  .max(80)
const templateIds = z.array(z.string().min(1)).max(50)

export const createTermSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(120),
  slug: slugSchema,
  type: z.string().trim().max(60).optional(),
  appliesTo: templateIds.optional(),
  defaultFor: templateIds.optional(),
  requiredFor: templateIds.optional(),
  order: z.number().int().min(0).max(10_000).optional(),
})

export const updateTermSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  type: z.string().trim().max(60).optional(),
  status: z.enum(TERM_STATUSES).optional(),
  appliesTo: templateIds.optional(),
  defaultFor: templateIds.optional(),
  requiredFor: templateIds.optional(),
  order: z.number().int().min(0).max(10_000).optional(),
})

export const contentSchema = z.object({ content: z.record(z.string(), z.any()) })

const storage = () => useStorage('documents')

const orgKey = (orgId: string) =>
  orgId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
const key = (orgId: string, termSlug: string) => `_terms:${orgKey(orgId)}:${termSlug}.json`

export const orgOf = (event: H3Event) => (event.context.auth as AuthContext).orgId

const httpError = (statusCode: number, statusMessage: string, field?: string, message?: string, code?: string) => {
  const error = new HTTPError({ statusCode, statusMessage, ...(field && { data: { errors: [{ field, message, code }] } }) })
  error.stack = undefined
  return error
}

/** Required implies default, and a template outside `appliesTo` drops out of both lists. */
function reconcile<T extends Pick<TermRecord, 'appliesTo' | 'defaultFor' | 'requiredFor'>>(lists: T): T {
  const appliesTo = [...new Set(lists.appliesTo)]
  const allowed = (id: string) => appliesTo.length === 0 || appliesTo.includes(id)
  const requiredFor = [...new Set(lists.requiredFor)].filter((id) => allowed(id))
  const defaultFor = [...new Set([...lists.defaultFor, ...requiredFor])].filter((id) => allowed(id))
  return { ...lists, appliesTo, defaultFor, requiredFor }
}

export const appliesToTemplate = (term: Pick<TermRecord, 'appliesTo'>, templateId: string) => term.appliesTo.length === 0 || term.appliesTo.includes(templateId)

export async function listTerms(orgId: string): Promise<TermRecord[]> {
  const keys = await storage().getKeys(`_terms:${orgKey(orgId)}`)
  const items = await Promise.all(keys.map((k) => storage().getItem<TermRecord>(k)))
  return items.filter((item): item is TermRecord => !!item).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
}

export async function getTerm(orgId: string, termSlug: string): Promise<TermRecord> {
  const term = /^[a-z0-9-]{1,80}$/.test(termSlug) ? await storage().getItem<TermRecord>(key(orgId, termSlug)) : null
  if (!term) throw httpError(404, 'Term not found')
  return term
}

const save = (orgId: string, term: TermRecord) => storage().setItem(key(orgId, term.slug), term as unknown as Record<string, unknown>)

export const toMeta = (term: TermRecord, templateId?: string): TermMeta => ({
  id: term.id,
  slug: term.slug,
  title: term.title,
  type: term.type,
  status: term.status,
  appliesTo: term.appliesTo,
  defaultFor: term.defaultFor,
  requiredFor: term.requiredFor,
  version: term.version,
  order: term.order,
  updatedAt: term.updatedAt,
  ...(templateId && { required: term.requiredFor.includes(templateId), selected: term.defaultFor.includes(templateId) }),
})

export async function createTerm(orgId: string, input: z.infer<typeof createTermSchema>, extra: { status?: TermStatus; content?: unknown } = {}): Promise<TermRecord> {
  if (await storage().hasItem(key(orgId, input.slug))) throw httpError(409, 'Conflict', 'slug', `A term with slug "${input.slug}" already exists.`, 'duplicate')

  const content = extra.content ?? emptyDoc()
  const now = new Date().toISOString()
  const term: TermRecord = {
    id: randomUUID(),
    slug: input.slug,
    title: input.title,
    type: input.type,
    status: extra.status ?? 'Draft',
    ...reconcile({ appliesTo: input.appliesTo ?? [], defaultFor: input.defaultFor ?? [], requiredFor: input.requiredFor ?? [] }),
    version: 1,
    order: input.order ?? 0,
    content,
    markdown: docToMarkdown(content),
    createdAt: now,
    updatedAt: now,
    history: [],
  }
  await save(orgId, term)
  return term
}

export async function updateTermMeta(orgId: string, termSlug: string, patch: z.infer<typeof updateTermSchema>): Promise<TermRecord> {
  const current = await getTerm(orgId, termSlug)
  const next: TermRecord = {
    ...current,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
    ...reconcile({ appliesTo: patch.appliesTo ?? current.appliesTo, defaultFor: patch.defaultFor ?? current.defaultFor, requiredFor: patch.requiredFor ?? current.requiredFor }),
    updatedAt: new Date().toISOString(),
  }
  await save(orgId, next)
  return next
}

/** Saving content bumps `version`; documents already created keep the version they snapshotted. */
export async function saveTermContent(orgId: string, termSlug: string, content: unknown): Promise<TermRecord> {
  const current = await getTerm(orgId, termSlug)
  const markdown = docToMarkdown(content)
  if (markdown === current.markdown) return current

  const next: TermRecord = {
    ...current,
    content,
    markdown,
    version: current.version + 1,
    history: [...current.history, { version: current.version, markdown: current.markdown, updatedAt: current.updatedAt }],
    updatedAt: new Date().toISOString(),
  }
  await save(orgId, next)
  return next
}

/** Soft delete: documents hold snapshots, so archiving never changes them. */
export const archiveTerm = (orgId: string, termSlug: string) => updateTermMeta(orgId, termSlug, { status: 'Archive' })

/** Release terms usable on the template, in library order. */
export async function availableTerms(orgId: string, templateId: string) {
  return (await listTerms(orgId)).filter((term) => term.status === 'Release' && appliesToTemplate(term, templateId))
}

/**
 * Replaces the default set of a template: the listed slugs become defaults (and take the listed order),
 * every other term stops being a default. Required terms always stay a default.
 */
export async function setTemplateDefaults(orgId: string, templateId: string, slugs: string[]) {
  const usable = await availableTerms(orgId, templateId)
  const unknown = slugs.filter((termSlug) => !usable.some((term) => term.slug === termSlug))
  if (unknown.length > 0) throw httpError(400, 'Bad Request', 'slugs', `Not available on "${templateId}": ${unknown.join(', ')}`, 'invalid_term')

  const wanted = new Set(slugs)
  for (const term of usable) {
    const isDefault = wanted.has(term.slug) || term.requiredFor.includes(templateId)
    const order = wanted.has(term.slug) ? slugs.indexOf(term.slug) : term.order
    if (isDefault === term.defaultFor.includes(templateId) && order === term.order) continue
    await save(orgId, {
      ...term,
      order,
      defaultFor: isDefault ? [...new Set([...term.defaultFor, templateId])] : term.defaultFor.filter((id) => id !== templateId),
      updatedAt: new Date().toISOString(),
    })
  }
  return { templateId, slugs }
}

/** The `terms` picker descriptor the web form renders. */
export async function termsFieldSchema(orgId: string, template: TemplateDefinition, base: Record<string, any> = {}) {
  const usable = await availableTerms(orgId, template.id)
  const layout = Object.fromEntries(Object.entries(base).filter(([name]) => name.startsWith('x-')))
  return {
    ...layout,
    type: 'terms',
    title: base.title ?? 'Terms',
    multiple: true,
    options: usable.map(({ slug, title, type, version, order }) => ({ slug, title, type, version, order })),
    default: usable.filter((term) => term.defaultFor.includes(template.id)).map((term) => term.slug),
    required: usable.filter((term) => term.requiredFor.includes(template.id)).map((term) => term.slug),
  }
}

/**
 * Replaces any caller-supplied `terms` with a snapshot built from the org's library.
 * Templates that render library terms never accept free text: the caller sends an ordered list of
 * term slugs, a required term left out is rejected (`required`), and slugs that are not a Release term usable
 * on the template are rejected. Without `terms`, the template's default set is used.
 */
export async function applyTermSelection(orgId: string, template: TemplateDefinition, variables: Record<string, any>) {
  if (!template.terms) return variables

  const { terms: requested, ...rest } = variables
  if (requested !== undefined && (!Array.isArray(requested) || requested.some((item) => typeof item !== 'string'))) {
    throw httpError(400, 'Bad Request', 'terms', 'terms must be an array of term slugs.', 'invalid_type')
  }

  const usable = await availableTerms(orgId, template.id)
  const bySlug = new Map(usable.map((term) => [term.slug, term]))
  const chosen = new Set<string>(requested ?? usable.filter((term) => term.defaultFor.includes(template.id)).map((term) => term.slug))
  for (const termSlug of chosen) {
    if (!bySlug.has(termSlug)) throw httpError(400, 'Bad Request', 'terms', `Term "${termSlug}" is not available for template "${template.id}".`, 'invalid_term')
  }
  const missing = usable.filter((term) => term.requiredFor.includes(template.id) && !chosen.has(term.slug))
  if (missing.length > 0) {
    throw httpError(400, 'Bad Request', 'terms', `Required term${missing.length > 1 ? 's' : ''} missing: ${missing.map((term) => term.title).join(', ')}.`, 'required')
  }

  const items = [...chosen].map((termSlug) => {
    const term = bySlug.get(termSlug)!
    return { id: term.id, slug: term.slug, title: term.title, content: term.markdown, version: term.version, updatedAt: term.updatedAt }
  })
  return items.length > 0 ? { ...rest, terms: { items } } : rest
}
