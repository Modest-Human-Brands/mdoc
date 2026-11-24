import { HTTPError } from 'nitro/h3'
import jwt, { type JwtPayload } from 'jsonwebtoken'

export const DEFAULT_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60
export const MAX_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60

export interface SessionTokenPayload extends JwtPayload {
  documentId: string
  signerEmail: string
  role?: string
}

const fail = (statusCode: number, statusMessage: string) => {
  const error = new HTTPError({ statusCode, statusMessage })
  error.stack = undefined
  return error
}

export function requireJwtSecret(secret: string | undefined): string {
  if (!secret) throw fail(500, 'JWT secret is not configured.')
  return secret
}

/** Signer links always expire: 7 days by default, never later than 30 days from now. */
export function tokenLifetimeSeconds(expiresAt?: string | null): number {
  if (!expiresAt) return DEFAULT_TOKEN_TTL_SECONDS
  const seconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
  if (seconds <= 0) throw fail(400, 'Expiration date must be in the future.')
  if (seconds > MAX_TOKEN_TTL_SECONDS) throw fail(400, 'Expiration date cannot be more than 30 days away.')
  return seconds
}

export function issueSessionToken(payload: Pick<SessionTokenPayload, 'documentId' | 'signerEmail' | 'role'>, secret: string | undefined, expiresInSeconds: number) {
  return jwt.sign(payload, requireJwtSecret(secret), { algorithm: 'HS256', expiresIn: expiresInSeconds })
}

/** Verifies a signer's magic-link token and that it was issued for this document. */
export function readSessionToken(token: string, documentId: string, secret: string | undefined): SessionTokenPayload {
  let payload: SessionTokenPayload
  try {
    payload = jwt.verify(token, requireJwtSecret(secret), { algorithms: ['HS256'] }) as SessionTokenPayload
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) throw error
    throw fail(401, 'Session expired or invalid.')
  }
  if (payload.documentId !== documentId) throw fail(403, 'Token id does not match this document id.')
  if (!payload.exp) throw fail(401, 'Session expired or invalid.')
  return payload
}
