import { createHash } from 'node:crypto'
import { HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'

import notion from '~/server/utils/notion'
import notionTextStringify from '~/server/utils/notion-text-stringify'
import normalizeId from '~/server/utils/notion-normalize-id'
import { NOTION_ID } from '~/server/utils/notion-errors'
import { withDocumentLock } from '~/server/utils/routing-queue'
import { storeLogo } from '~/server/utils/organization-logo'
import { MOCK_ORGANIZATION_DB } from '~/server/utils/notion-mock-organizations'
import { resolveOrganization, type OrganizationProfile } from '~/server/utils/organization-store'
import { QR_COLOR_MODES, QR_EYE_SHAPES } from '~/server/utils/qr'
import { organizationSchema } from '~/templates/document/_shared/organization'

/**
 * The Notion "Organization" database is the only place an organisation's profile and branding live. Nothing here is
 * written to disk; the short cache below only spares Notion a lookup on every live preview.
 */

/** Membership statuses that may read and change an organisation (bank details included). */
const MEMBER_STATUSES = new Set(['Verified', 'Active'])
const CACHE_MS = 30_000

type Properties = Record<string, any>
type JsonObject = Record<string, any>

interface OrganizationPage {
  id: string
  parent?: { data_source_id?: string }
  last_edited_time?: string
  properties: Properties
}

export interface OrganizationRecord {
  pageId: string
  /** Hash of the stored values; a save must quote the one it was based on. */
  revision: string
  updatedAt?: string
  organization: OrganizationProfile
}

const fail = (statusCode: number, statusMessage: string, field: string, message: string, code: string) => {
  const error = new HTTPError({ statusCode, statusMessage, data: { errors: [{ field, message, code }] } })
  error.stack = undefined
  return error
}

const sameId = (a: string, b: string) => normalizeId(a).toLowerCase() === normalizeId(b).toLowerCase()

function dataSourceId() {
  const raw = useRuntimeConfig().private.notionDbId as string | undefined
  const configured = raw ? (JSON.parse(raw) as Record<string, string | undefined>).organization : undefined
  if (configured) return configured
  if (process.env.NODE_ENV === 'development') return MOCK_ORGANIZATION_DB
  throw fail(500, 'Organisation database is not configured.', 'NOTION_DB_ID', 'NOTION_DB_ID needs an "organization" data source ID.', 'not_configured')
}

async function findPage(orgId: string): Promise<OrganizationPage> {
  const source = dataSourceId()
  const unknown = () => fail(404, 'Organisation not found', 'x-org-id', `No organisation "${orgId}" exists in Notion.`, 'organization_not_found')

  if (NOTION_ID.test(orgId)) {
    const page = (await notion.pages.retrieve({ page_id: orgId }).catch((error: { code?: string }) => {
      if (error?.code === 'object_not_found') throw unknown()
      throw error
    })) as unknown as OrganizationPage
    // Any other page the integration can read must not pass for an organisation.
    if (!page.parent?.data_source_id || !sameId(page.parent.data_source_id, source)) throw unknown()
    return page
  }

  const { results } = await notion.dataSources.query({ data_source_id: source, filter: { property: 'Id', rich_text: { equals: orgId } }, page_size: 2 })
  if (results.length > 1) throw fail(409, 'Conflict', 'x-org-id', `More than one organisation has the Id "${orgId}" in Notion.`, 'ambiguous_organization')
  if (results.length === 0) throw unknown()
  return results[0] as unknown as OrganizationPage
}

async function assertMember(page: OrganizationPage, userId: string) {
  const relation = page.properties['Organization Members'] as { relation?: { id: string }[] } | undefined
  // One lookup per member. A page lists at most 25 relations, far above the size of any organisation here.
  const members = await Promise.all((relation?.relation ?? []).map(({ id }) => notion.pages.retrieve({ page_id: id }) as unknown as Promise<OrganizationPage>))

  const allowed = members.some(
    ({ properties }) =>
      MEMBER_STATUSES.has(properties.Status?.status?.name ?? properties.Status?.select?.name ?? '') && (properties.User?.relation ?? []).some((user: { id: string }) => sameId(user.id, userId))
  )
  if (!allowed) throw fail(403, 'Forbidden', 'x-user-id', 'You are not a verified member of this organisation.', 'not_a_member')
}

const textOf = (properties: Properties, name: string) => notionTextStringify(properties[name]?.rich_text ?? []).trim()

/** A broken value is reported, never replaced by a default: the next save would overwrite what someone typed. */
function jsonOf(properties: Properties, name: string): JsonObject {
  const raw = textOf(properties, name)
  if (!raw) return {}
  try {
    const value: unknown = JSON.parse(raw)
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as JsonObject
  } catch {
    // Reported below.
  }
  throw fail(502, 'Invalid organisation data', name, `"${name}" on the Notion organisation page is not a valid JSON object.`, 'invalid_notion_json')
}

const compact = <T extends JsonObject>(value: T) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '')) as T

export function toProfile(page: OrganizationPage): OrganizationProfile {
  const properties = page.properties
  const accountDetails = jsonOf(properties, 'Account Details')
  const socials = jsonOf(properties, 'Social Links')

  return resolveOrganization(
    compact({
      id: textOf(properties, 'Id') || normalizeId(page.id),
      name: notionTextStringify(properties.Name?.title ?? []).trim(),
      contactEmail: properties['Contact Email']?.email ?? '',
      legalName: textOf(properties, 'Legal Name'),
      entityType: properties['Entity Type']?.select?.name,
      tradeRelationship: properties['Trade Relationship']?.select?.name,
      gstin: textOf(properties, 'GSTIN'),
      pan: textOf(properties, 'PAN'),
      address: textOf(properties, 'Address'),
      foundedYear: properties['Founded Year']?.number,
      accountDetails: Object.keys(accountDetails).length > 0 ? compact(accountDetails) : undefined,
      branding: compact(jsonOf(properties, 'Branding')),
      website: properties.Website?.url,
      phone: properties.Phone?.phone_number,
      whatsapp: properties.Whatsapp?.url,
      billingEmail: properties['Billing Email']?.email,
      socials: Object.keys(socials).length > 0 ? socials : undefined,
    })
  )
}

const revisionOf = (page: OrganizationPage) =>
  createHash('sha256')
    .update(JSON.stringify(toProfile(page)))
    .digest('hex')
    .slice(0, 16)

const toRecord = (page: OrganizationPage): OrganizationRecord => ({
  pageId: page.id,
  revision: revisionOf(page),
  updatedAt: page.last_edited_time,
  organization: toProfile(page),
})

const cache = new Map<string, { expiresAt: number; record: OrganizationRecord }>()
const cacheKey = (orgId: string, userId: string) => `${orgId.trim().toLowerCase()}|${normalizeId(userId).toLowerCase()}`

/**
 * The caller's organisation as Notion holds it, after checking that `userId` is a member. `cached` accepts a copy up
 * to 30 seconds old and is only for previews; anything that stores a document reads Notion again.
 */
export async function loadOrganization(orgId: string, userId: string, options: { cached?: boolean } = {}): Promise<OrganizationRecord> {
  const key = cacheKey(orgId, userId)
  const hit = options.cached ? cache.get(key) : undefined
  if (hit && hit.expiresAt > Date.now()) return structuredClone(hit.record)

  const page = await findPage(orgId.trim())
  await assertMember(page, userId)
  const record = toRecord(page)
  cache.set(key, { expiresAt: Date.now() + CACHE_MS, record })
  return structuredClone(record)
}

/** `null` and `''` clear a field; a field left out is not touched. */
const text = (max: number) => z.string().trim().max(max).nullable().optional()
const email = z
  .union([z.literal(''), z.email().max(200)])
  .nullable()
  .optional()
const hex = z.string().regex(/^#(?:[\da-f]{3}|[\da-f]{6})$/i, 'must be a hex colour')
const shape = organizationSchema.shape

export const organizationPatchSchema = z.strictObject({
  revision: z.string().min(1, 'revision is required'),
  name: z.string().trim().min(1, 'name is required').max(200).optional(),
  legalName: text(200),
  entityType: z
    .union([z.literal(''), shape.entityType.unwrap()])
    .nullable()
    .optional(),
  tradeRelationship: z
    .union([z.literal(''), shape.tradeRelationship.unwrap()])
    .nullable()
    .optional(),
  gstin: text(32),
  pan: text(32),
  address: text(1000),
  foundedYear: z.number().int().min(1800).max(2200).nullable().optional(),
  contactEmail: email,
  billingEmail: email,
  phone: text(40),
  whatsapp: text(200),
  website: text(500),
  accountDetails: z
    .strictObject({
      accountName: text(200),
      accountNumber: z
        .union([z.string().trim().max(40), z.number().int().nonnegative()])
        .nullable()
        .optional(),
      bankName: text(200),
      ifscCode: text(20),
      upiId: z
        .union([
          z.literal(''),
          z
            .string()
            .trim()
            .regex(/^[\w.-]{2,256}@[a-z][a-z0-9.-]{1,64}$/i, 'Invalid UPI ID'),
        ])
        .nullable()
        .optional(),
    })
    .optional(),
  branding: z
    .strictObject({
      /** A PNG or JPEG data URL uploads a new logo, an `https` URL is stored as it is, `''` removes it. */
      logo: z.string().max(1_500_000).nullable().optional(),
      color: z.strictObject({ primary: hex.optional(), accent: hex.optional() }).optional(),
      font: text(80),
      qr: z
        .strictObject({
          color: z.enum(QR_COLOR_MODES as [string, ...string[]]).optional(),
          eyeShape: z.enum(QR_EYE_SHAPES as [string, ...string[]]).optional(),
          eyeColor: z.enum(QR_COLOR_MODES as [string, ...string[]]).optional(),
          logo: z.boolean().optional(),
          target: z.enum(['document', 'verify', 'upi']).optional(),
        })
        .nullable()
        .optional(),
    })
    .optional(),
  socials: z.record(z.string().max(40), z.string().max(500).nullable()).optional(),
})

export type OrganizationPatch = z.infer<typeof organizationPatchSchema>

/** Applies a patch to stored JSON, keeping keys this API does not know about (other services share these fields). */
function mergeJson(current: JsonObject, patch: JsonObject): JsonObject {
  const next = { ...current }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    if (value === null || value === '') delete next[key]
    else next[key] = value
  }
  return next
}

const richText = (value: string) => ({ rich_text: (value.match(/[\s\S]{1,2000}/g) ?? []).map((content) => ({ text: { content } })) })

/** The main service types an account number as a number, so keep it one whenever that loses nothing. */
const accountNumber = (value: string | number) => (typeof value === 'string' && /^[1-9]\d{0,14}$/.test(value) ? Number(value) : value)

async function toProperties(page: OrganizationPage, patch: OrganizationPatch, publicBase: string) {
  const properties: Properties = {}
  const set = (value: unknown, name: string, build: (value: any) => unknown) => {
    if (value !== undefined) properties[name] = build(value)
  }
  const plain = (value: string | null) => richText(value ?? '')

  set(patch.name, 'Name', (value: string) => ({ title: [{ text: { content: value } }] }))
  set(patch.legalName, 'Legal Name', plain)
  set(patch.gstin, 'GSTIN', plain)
  set(patch.pan, 'PAN', plain)
  set(patch.address, 'Address', plain)
  set(patch.entityType, 'Entity Type', (value) => ({ select: value ? { name: value } : null }))
  set(patch.tradeRelationship, 'Trade Relationship', (value) => ({ select: value ? { name: value } : null }))
  set(patch.foundedYear, 'Founded Year', (value) => ({ number: value }))
  set(patch.contactEmail, 'Contact Email', (value) => ({ email: value || null }))
  set(patch.billingEmail, 'Billing Email', (value) => ({ email: value || null }))
  set(patch.phone, 'Phone', (value) => ({ phone_number: value || null }))
  set(patch.whatsapp, 'Whatsapp', (value) => ({ url: value || null }))
  set(patch.website, 'Website', (value) => ({ url: value || null }))

  if (patch.accountDetails) {
    const { accountNumber: number, ...rest } = patch.accountDetails
    const merged = mergeJson(jsonOf(page.properties, 'Account Details'), {
      ...rest,
      accountNumber: number === undefined || number === null || number === '' ? number : accountNumber(number),
    })
    properties['Account Details'] = richText(JSON.stringify(merged))
  }

  if (patch.socials) properties['Social Links'] = richText(JSON.stringify(mergeJson(jsonOf(page.properties, 'Social Links'), patch.socials)))

  if (patch.branding) {
    const current = jsonOf(page.properties, 'Branding')
    const { color, logo, qr, ...rest } = patch.branding
    const merged = mergeJson(current, {
      ...rest,
      ...(qr === null && { qr }),
      color: color && mergeJson(current.color ?? {}, color),
      qr: qr && mergeJson(current.qr ?? {}, qr),
      // Image bytes do not fit in a text property: an upload goes to storage and Notion keeps its link.
      logo: logo?.startsWith('data:') ? await storeLogo(page.id, logo, publicBase) : checkLogoUrl(logo),
    })
    properties.Branding = richText(JSON.stringify(merged))
  }

  return properties
}

function checkLogoUrl(logo: string | null | undefined) {
  if (!logo || /^https?:\/\//i.test(logo)) return logo
  throw fail(400, 'Bad Request', 'branding.logo', 'logo must be a PNG or JPEG data URL, or an http(s) URL.', 'invalid_logo')
}

export function updateOrganization(orgId: string, userId: string, patch: OrganizationPatch, publicBase: string): Promise<OrganizationRecord> {
  return findPage(orgId.trim()).then(({ id }) =>
    // One writer per organisation in this process, so the revision check and the write cannot be split.
    withDocumentLock(`organization:${normalizeId(id)}`, async () => {
      const page = await findPage(id)
      await assertMember(page, userId)
      if (revisionOf(page) !== patch.revision) {
        throw fail(409, 'Conflict', 'revision', 'This organisation changed in Notion after you loaded it. Reload and apply your changes again.', 'stale_revision')
      }

      const properties = await toProperties(page, patch, publicBase)
      if (Object.keys(properties).length > 0) await notion.pages.update({ page_id: page.id, properties })

      cache.clear()
      return toRecord(await findPage(page.id))
    })
  )
}
