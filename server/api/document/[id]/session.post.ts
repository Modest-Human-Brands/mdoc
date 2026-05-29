import { defineEventHandler, getRouterParam, readBody, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import notion from '~/server/utils/notion'
import type { NotionDocument } from '~/server/types'
import notionTextStringify from '~/server/utils/notion-text-stringify'

const sessionSchema = z.object({
  signerEmail: z.email(),
  expiresInMinutes: z.number().max(1440).default(60),
})

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw new HTTPError({ statusCode: 400, statusMessage: 'Document ID is required' })

    const config = useRuntimeConfig()
    const body = await readBody(event)
    const { signerEmail, expiresInMinutes } = sessionSchema.parse(body)

    const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument
    const currentStatus = document.properties.Status.status.name
    const queueData = notionTextStringify(document.properties['Routing Queue'].rich_text)

    if (!['Sent', 'Partially Signed'].includes(currentStatus)) {
      throw new HTTPError({ statusCode: 403, statusMessage: `Document is not accepting signatures (Status: ${currentStatus})` })
    }

    if (!queueData) {
      throw new HTTPError({ statusCode: 500, statusMessage: 'Document envelope is corrupted or missing routing data.' })
    }

    const signers = JSON.parse(queueData)
    const targetSigner = signers.find((s: any) => s.email === signerEmail)

    if (!targetSigner) {
      throw new HTTPError({ statusCode: 403, statusMessage: 'Email address is not part of this document envelope.' })
    }

    if (targetSigner.status === 'SIGNED') {
      throw new HTTPError({ statusCode: 409, statusMessage: 'This user has already signed the document.' })
    }

    const routingType = document.properties['Routing Type'].select.name
    if (routingType === 'SEQUENTIAL') {
      const expectedSignerEmail = document.properties['Next Signer'].email
      if (expectedSignerEmail !== signerEmail) {
        throw new HTTPError({ statusCode: 403, statusMessage: `It is not ${signerEmail}'s turn to sign yet.` })
      }
    }

    const secret = config.private.jwtSecret

    const token = jwt.sign(
      {
        documentId: id,
        signerEmail: targetSigner.email,
        role: targetSigner.role,
      },
      secret,
      { expiresIn: `${expiresInMinutes}m` }
    )

    const magicLink = `/api/document/${id}/sign?token=${token}`

    return {
      signer: targetSigner.email,
      expiresAt: new Date(Date.now() + expiresInMinutes * 60_000).toISOString(),
      token,
      magicLink,
    }
  } catch (error: any) {
    console.error(`API /document/id/session POST`, error)

    if (error instanceof z.ZodError) {
      throw new HTTPError({ statusCode: 400, statusMessage: 'Invalid session payload' })
    }
    if (error instanceof HTTPError) throw error
    throw new HTTPError({ statusCode: 500, statusMessage: 'Failed to generate secure session' })
  }
})
