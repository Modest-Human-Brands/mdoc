import { defineEventHandler, getRouterParam, HTTPError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
import type { NotionDocument } from '~/server/types'
import notion from '~/server/utils/notion'

const envelopeSchema = z.object({
  expiresInDays: z.number().min(1).max(30).default(7),
  routingType: z.enum(['SEQUENTIAL', 'PARALLEL']).default('SEQUENTIAL'),
  signers: z
    .array(
      z.object({
        order: z.number(),
        name: z.string(),
        email: z.email(),
        role: z.string().default('Signer'),
        status: z.enum(['PENDING', 'SIGNED', 'DECLINED']).default('PENDING'),
      })
    )
    .min(1, 'At least one signer is required'),
})

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw new HTTPError({ statusCode: 400, statusMessage: 'Document ID is required' })

    const { signers, routingType, expiresInDays } = await readValidatedBody(event, envelopeSchema)

    const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument
    const currentStatus = document.properties.Status.status.name

    if (currentStatus !== 'Ready') {
      throw new HTTPError({ statusCode: 403, statusMessage: `Document need to be in Ready status. Currently ${currentStatus}` })
    }

    const sortedSigners = signers.sort((a, b) => a.order - b.order)
    const nextSigner = sortedSigners[0]

    await notion.pages.update({
      page_id: id,
      properties: {
        Status: { status: { name: 'Sent' } },
        'Routing Queue': {
          rich_text: [{ text: { content: JSON.stringify(sortedSigners) } }],
        },
        'Routing Type': { select: { name: routingType } },
        'Next Signer': { email: nextSigner.email },
      },
    })

    return {
      status: 'Sent',
      nextSigner: nextSigner.email,
      queueSize: sortedSigners.length,
    }
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    console.error(`API /document/id/envelope POST`, error)

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
