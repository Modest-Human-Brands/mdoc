import { defineEventHandler, getRouterParam, HTTPError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
import notion from '~/server/utils/notion'
import { getTemplateOrThrow, validateEnvelopeSigners } from '~/server/utils/signer-requirements'
import type { NotionDocument } from '~/server/types'

const envelopeSchema = z.object({
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

    const { signers, routingType } = await readValidatedBody(event, envelopeSchema)

    const document = (await notion.pages.retrieve({ page_id: id })) as unknown as NotionDocument
    const templateDef = getTemplateOrThrow(document.properties['Template ID']?.select?.name)
    const signerErrors = validateEnvelopeSigners(templateDef, signers)
    if (signerErrors.length > 0) {
      throw new HTTPError({ statusCode: 400, statusMessage: 'Bad Request', data: { errors: signerErrors } })
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
      error.stack = undefined
      throw error
    }

    console.error('document/[id]/envelope.post', error)
    const serverError = new HTTPError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    serverError.stack = undefined
    throw serverError
  }
})
