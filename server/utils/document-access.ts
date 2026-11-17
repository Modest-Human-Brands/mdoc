import { HTTPError, type H3Event } from 'nitro/h3'

import normalizeId from '~/server/utils/notion-normalize-id'
import { NOTION_ID } from '~/server/utils/notion-errors'

export interface AuthContext {
  /** Organisation slug (e.g. `modest-human-brands`) or Notion page ID, from `x-org-id`. */
  orgId: string
  /** Notion user page ID, from `x-user-id`. */
  userId: string
}

interface AccessibleDocument {
  properties?: { User?: { relation?: { id: string }[] }; Organization?: { relation?: { id: string }[] } }
}

const deny = (field: string) => {
  const error = new HTTPError({
    statusCode: 403,
    statusMessage: 'Forbidden',
    data: { errors: [{ field, message: 'This document does not belong to the caller.', code: 'forbidden' }] },
  })
  error.stack = undefined
  return error
}

const same = (a: string, b: string) => normalizeId(a).toLowerCase() === normalizeId(b).toLowerCase()

/** Tenant-only check for signer flows, where the caller is the signer (bound by a session token) rather than the owner. */
export function assertDocumentOrganization(event: H3Event, document: AccessibleDocument) {
  const auth = event.context.auth as AuthContext | undefined
  if (!auth) throw new HTTPError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const organization = document.properties?.Organization?.relation?.[0]?.id
  if (organization && NOTION_ID.test(auth.orgId) && !same(organization, auth.orgId)) throw deny('x-org-id')
}

/** A stored signing session must belong to the document in the URL and to the caller's organisation. */
export function assertSigningSession(event: H3Event, documentId: string | undefined, session: { documentId: string; ctx: { document: AccessibleDocument } }) {
  if (!documentId || !same(session.documentId, documentId)) throw deny('id')
  assertDocumentOrganization(event, session.ctx.document)
}

export function canAccessDocument(event: H3Event, document: AccessibleDocument) {
  try {
    assertDocumentAccess(event, document)
    return true
  } catch {
    return false
  }
}

/**
 * Throws 403 unless the document belongs to the caller identified by `x-user-id` / `x-org-id`.
 * The organisation is compared when `x-org-id` is a Notion page ID (a slug cannot be matched to a relation).
 */
export function assertDocumentAccess(event: H3Event, document: AccessibleDocument) {
  const auth = event.context.auth as AuthContext | undefined
  if (!auth) throw new HTTPError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const owner = document.properties?.User?.relation?.[0]?.id
  if (!owner || !same(owner, auth.userId)) throw deny('x-user-id')

  const organization = document.properties?.Organization?.relation?.[0]?.id
  if (organization && NOTION_ID.test(auth.orgId) && !same(organization, auth.orgId)) throw deny('x-org-id')
}
