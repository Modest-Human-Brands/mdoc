import { HTTPError, createError } from 'nitro/h3'
import { ZodError } from 'zod'

export interface ApiValidationErrorDetail {
  field: string
  message: string
  code: string
}

export function handleApiError(error: unknown, context: string = 'API'): never {
  // 1. Zod Validation Errors -> 400 Bad Request
  if (error instanceof ZodError) {
    const errorDetails: ApiValidationErrorDetail[] = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }))

    const validationError = createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        errors: errorDetails,
      },
    })
    // h3 includes `stack` in dev (debug) mode; never expose server paths.
    validationError.stack = undefined
    throw validationError
  }

  // 2. Controlled H3/Nitro HTTP Errors -> preserve status
  if (error instanceof Error && 'statusCode' in error) {
    const httpErr = error as any

    // Strip accidental local absolute filesystem paths from message
    if (typeof httpErr.statusMessage === 'string' && /([A-Za-z]:[\\/]|\/home\/|\/var\/|\/usr\/)/.test(httpErr.statusMessage)) {
      httpErr.statusMessage = 'A server error occurred during request processing.'
    }

    httpErr.stack = undefined
    throw error
  }

  // 3. Unhandled Server Exceptions -> log server-side only, return clean 500
  console.error(`[${context} - Internal Error]`, error)

  const serverError = createError({
    statusCode: 500,
    statusMessage: 'Internal Server Error',
  })
  serverError.stack = undefined
  throw serverError
}
