import { defineEventHandler, getRouterParam, readBody, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import jwt from 'jsonwebtoken'
import notion from '~/server/utils/notion'
import type { NotionDocument } from '~/server/types'
import notionTextStringify from '~/server/utils/notion-text-stringify'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')

    if (!id) throw new HTTPError({ statusCode: 400, statusMessage: 'Document ID is required' })

    const config = useRuntimeConfig()
    const { sessionToken } = await readBody<{ sessionToken: string }>(event)

    if (!sessionToken) {
      throw new HTTPError({ statusCode: 400, statusMessage: 'Session token is required' })
    }

    let decodedToken: any
    try {
      decodedToken = jwt.verify(sessionToken, config.private.jwtSecret)
    } catch {
      throw new HTTPError({ statusCode: 401, statusMessage: 'Session expired or invalid.' })
    }

    if (decodedToken.documentId !== id) {
      throw new HTTPError({ statusCode: 403, statusMessage: 'Token ID does not match this document ID.' })
    }

    const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument
    const queueData = notionTextStringify(document.properties['Routing Queue']?.rich_text)

    if (!queueData) {
      throw new HTTPError({ statusCode: 500, statusMessage: 'Document envelope is corrupted or missing routing data.' })
    }

    const signers = JSON.parse(queueData)
    const targetSigner = signers.find((s: any) => s.email === decodedToken.signerEmail)

    if (!targetSigner) {
      throw new HTTPError({ statusCode: 403, statusMessage: 'Signer not found in the routing queue.' })
    }

    return {
      isValid: true,
      signerEmail: targetSigner.email,
      role: targetSigner.role,
      order: targetSigner.order,
      status: targetSigner.status,
    }
  } catch (error: any) {
    console.error(`API /document/[id]/verify POST`, error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
