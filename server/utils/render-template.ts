// server/utils/render-template.ts
import { h } from 'vue'
import { renderToBuffer } from '@ceereals/vue-pdf'
import { HTTPError } from 'nitro/h3'

import type { TemplateDefinition } from '~/server/utils/template-registry'
import { resolveOrganization } from '~/server/utils/organization-store'
import type { ApiValidationErrorDetail } from '~/server/utils/api-error'

const RENDER_TIMEOUT_MS = 20_000

export function mergeTemplateVariables(templateDef: TemplateDefinition, variables: Record<string, any> = {}) {
  const orgInput = variables.organizationId || variables.organization || variables.orgId
  const organization = resolveOrganization(orgInput, templateDef.placeholders?.organization)

  return {
    ...templateDef.placeholders,
    ...variables,
    organization,
  }
}

function getPath(source: any, path: PropertyKey[]) {
  let cursor = source
  for (const key of path) {
    if (cursor == null) return undefined
    cursor = cursor[key as any]
  }
  return cursor
}

function setPath(target: any, path: PropertyKey[], value: any) {
  let cursor = target
  for (let i = 0; i < path.length - 1; i++) {
    cursor = cursor?.[path[i] as any]
    if (cursor == null) return
  }
  if (path.length > 0) cursor[path.at(-1) as any] = value
}

/**
 * Draft mode: never fail on schema errors. Each invalid field falls back to the
 * template placeholder and is reported as a warning, so the live preview keeps rendering.
 */
export function applyDraftFallbacks(templateDef: TemplateDefinition, merged: Record<string, any>) {
  const warnings: ApiValidationErrorDetail[] = []
  if (!templateDef.schema) return { variables: merged, warnings }

  const variables = structuredClone(merged)
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = templateDef.schema.safeParse(variables)
    if (result.success) break

    for (const issue of result.error.issues) {
      if (attempt === 0) {
        warnings.push({ field: issue.path.join('.'), message: issue.message, code: issue.code })
      }
      setPath(variables, issue.path, structuredClone(getPath(templateDef.placeholders, issue.path)))
    }
  }

  return { variables, warnings }
}

export async function renderTemplatePdf(templateDef: TemplateDefinition, variables: Record<string, any>): Promise<Buffer> {
  const render = async () => {
    const props = await templateDef.transformPayload(variables)
    const output = await renderToBuffer(h(templateDef.component, props))
    return Buffer.isBuffer(output) ? output : Buffer.from(output)
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new HTTPError({ statusCode: 504, statusMessage: 'PDF render timed out.' })), RENDER_TIMEOUT_MS)
  })

  try {
    return await Promise.race([render(), timeout])
  } finally {
    clearTimeout(timer)
  }
}

/** Count pages without parsing the PDF: every page object carries `/Type /Page` (not `/Pages`). */
export function countPdfPages(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length || 1
}
