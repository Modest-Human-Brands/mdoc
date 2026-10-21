import { HTTPError } from 'nitro/h3'

import type { ApiValidationErrorDetail } from '~/server/types'
import { templateRegistry, type TemplateDefinition } from '~/server/utils/template-registry'

import '~/templates/document'

export function requiredSignerOrders(templateDef: Pick<TemplateDefinition, 'signerFields'>): number[] {
  return [...new Set((templateDef.signerFields ?? []).map((field) => Number(field.signerOrder)))].sort((a, b) => a - b)
}

export function getTemplateOrThrow(templateId: string | undefined): TemplateDefinition {
  const templateDef = templateId ? templateRegistry[templateId] : undefined
  if (!templateDef) {
    throw new HTTPError({ statusCode: 409, statusMessage: `Template "${templateId ?? 'unknown'}" is not registered, so its signers cannot be determined.` })
  }
  return templateDef
}

export function validateEnvelopeSigners(templateDef: TemplateDefinition, signers: { order: number }[]): ApiValidationErrorDetail[] {
  const required = requiredSignerOrders(templateDef)

  if (required.length === 0) {
    return [{ field: 'signers', message: `"${templateDef.label}" has no signature fields, so it cannot be sent for signing.`, code: 'no_signers_allowed' }]
  }

  const errors: ApiValidationErrorDetail[] = []
  const expected = `${required.length} signer${required.length === 1 ? '' : 's'} (order ${required.join(', ')})`
  const orders = signers.map((signer) => signer.order)

  if (signers.length !== required.length) {
    errors.push({
      field: 'signers',
      message: `"${templateDef.label}" requires exactly ${expected}, received ${signers.length}.`,
      code: signers.length > required.length ? 'too_many_signers' : 'too_few_signers',
    })
  }

  for (const [index, order] of orders.entries()) {
    if (!required.includes(order)) {
      errors.push({ field: `signers.${index}.order`, message: `Order ${order} has no signature fields in "${templateDef.label}". Allowed: ${required.join(', ')}.`, code: 'invalid_signer_order' })
    } else if (orders.indexOf(order) !== index) {
      errors.push({ field: `signers.${index}.order`, message: `Order ${order} is used more than once.`, code: 'duplicate_signer_order' })
    }
  }

  return errors
}
