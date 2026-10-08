// server/utils/render-template.ts
import { h } from 'vue'
import { renderToBuffer } from '@ceereals/vue-pdf'
import { HTTPError } from 'nitro/h3'

import type { TemplateDefinition } from '~/server/utils/template-registry'
import { neutralOrganization, resolveOrganization } from '~/server/utils/organization-store'
import { deepMerge, getTokenPayload } from '~/server/utils/token-payload'
import { ensureFonts, resolveBrandFont } from '~/server/utils/fonts'
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

function setPath(target: any, path: PropertyKey[], value: any) {
  let cursor = target
  for (let i = 0; i < path.length - 1; i++) {
    cursor = cursor?.[path[i] as any]
    if (cursor == null) return
  }
  if (path.length > 0) cursor[path.at(-1) as any] = value
}

export type PreviewVariant = 'sample' | 'branded' | 'filled'

/**
 * Variables for a preview variant. Every dynamic field the user has not filled shows its own `{{Field Label}}` token.
 * - sample:  neutral organisation + tokens (static picker images)
 * - branded: the client's organisation + tokens (Brand step)
 * - filled:  the client's organisation + the user's data over tokens (Details step, live)
 * Invalid user values never fail the render: they are dropped (the field shows its token again) and reported as warnings.
 */
export function buildVariantVariables(templateDef: TemplateDefinition, variant: PreviewVariant, variables: Record<string, any> = {}) {
  const warnings: ApiValidationErrorDetail[] = []
  const tokens = getTokenPayload(templateDef)

  if (variant === 'sample') {
    return { variables: { ...tokens, organization: neutralOrganization }, warnings }
  }

  const organization = resolveOrganization(variables.organizationId || variables.organization || variables.orgId, templateDef.placeholders?.organization)
  if (variant === 'branded') {
    return { variables: { ...tokens, organization }, warnings }
  }

  const userData = { ...variables }
  for (const key of ['organizationId', 'orgId', 'organization']) delete userData[key]

  const cleaned = structuredClone(userData)
  if (templateDef.schema) {
    // Validate against the demo placeholders so only the user's own values can fail
    const result = templateDef.schema.safeParse({ ...deepMerge(templateDef.placeholders, cleaned), organization })
    if (!result.success) {
      for (const issue of result.error.issues) {
        warnings.push({ field: issue.path.join('.'), message: issue.message, code: issue.code })
        setPath(cleaned, issue.path, undefined)
      }
    }
  }

  return { variables: { ...deepMerge(tokens, cleaned), organization }, warnings }
}

/** Makes sure the template's fonts and the organisation's brand font are registered; an unavailable brand font falls back to the default. */
async function prepareFonts(templateDef: TemplateDefinition, variables: Record<string, any>) {
  await ensureFonts(templateDef.fonts ?? [])

  const wanted = variables.organization?.branding?.font
  if (!wanted) return variables

  const font = await resolveBrandFont(wanted)
  if (font === wanted) return variables
  return { ...variables, organization: { ...variables.organization, branding: { ...variables.organization.branding, font } } }
}

export async function renderTemplatePdf(templateDef: TemplateDefinition, rawVariables: Record<string, any>): Promise<Buffer> {
  const render = async () => {
    const variables = await prepareFonts(templateDef, rawVariables)
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
