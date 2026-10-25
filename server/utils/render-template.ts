import { h } from 'vue'
import { renderToBuffer } from '@ceereals/vue-pdf'
import { HTTPError } from 'nitro/h3'

import type { TemplateDefinition } from '~/server/utils/template-registry'
import { neutralOrganization, organizationFrom } from '~/server/utils/organization-store'
import { deepMerge, getTokenPayload } from '~/server/utils/token-payload'
import { ensureFonts, resolveBrandFont } from '~/server/utils/fonts'
import type { ApiValidationErrorDetail } from '~/server/types'
import { organizationSchema } from '~/templates/document/_shared/organization'

const RENDER_TIMEOUT_MS = 20_000

export function mergeTemplateVariables(templateDef: TemplateDefinition, variables: Record<string, any> = {}) {
  const merged: Record<string, any> = {
    ...templateDef.placeholders,
    ...variables,
    organization: organizationFrom(variables, templateDef.placeholders.organization),
  }

  for (const [key, field] of Object.entries(templateDef.schema.shape)) {
    if (variables[key] === undefined && (field as { isOptional(): boolean }).isOptional()) delete merged[key]
  }

  return merged
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

function organizationWarnings(templateDef: TemplateDefinition, organization: Record<string, any>, includeSchemaIssues: boolean) {
  const warnings: ApiValidationErrorDetail[] = []

  if (includeSchemaIssues) {
    const result = organizationSchema.safeParse(organization)
    if (!result.success) warnings.push(...result.error.issues.map(({ path, message, code }) => ({ field: ['organization', ...path].join('.'), message, code })))
  }

  for (const key of templateDef.organizationFields ?? []) {
    const value = organization[key]
    const empty = key === 'accountDetails' ? !value || !Object.values(value).some(Boolean) : !value
    if (empty) warnings.push({ field: `organization.${key}`, message: `${key} is empty, so it will not appear on the document.`, code: 'missing_recommended' })
  }

  return warnings
}

export function buildVariantVariables(templateDef: TemplateDefinition, variant: PreviewVariant, variables: Record<string, any> = {}) {
  const warnings: ApiValidationErrorDetail[] = []
  const tokens = getTokenPayload(templateDef, { requiredOnly: variant === 'filled' })

  if (variant === 'sample') {
    return { variables: { ...tokens, organization: neutralOrganization }, warnings }
  }

  const organization = organizationFrom(variables, templateDef.placeholders.organization)
  if (variant === 'branded') {
    return { variables: { ...tokens, organization }, warnings: organizationWarnings(templateDef, organization, true) }
  }

  const userData = { ...variables }
  for (const key of ['organizationId', 'organization']) delete userData[key]

  const cleaned = structuredClone(userData)
  if (templateDef.schema) {
    const result = templateDef.schema.safeParse({ ...deepMerge(templateDef.placeholders, cleaned), organization })
    if (!result.success) {
      warnings.push(...result.error.issues.map(({ path, message, code }) => ({ field: path.join('.'), message, code })))
      for (const issue of result.error.issues) setPath(cleaned, issue.path, undefined)
    }
  }

  warnings.push(...organizationWarnings(templateDef, organization, false))

  return { variables: { ...deepMerge(tokens, cleaned), organization }, warnings }
}

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

export function countPdfPages(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length || 1
}
