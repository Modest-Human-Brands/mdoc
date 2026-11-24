import { HTTPError } from 'nitro/h3'
import { ZodError } from 'zod'

/** Maps whatever a route handler caught to the API's error contract: field errors, HTTP errors, or a plain 500. */
export function toRouteError(error: unknown, label: string, serverMessage = 'Internal Server Error'): never {
  if (error instanceof ZodError) {
    const validationError = new HTTPError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { errors: error.issues.map(({ path, message, code }) => ({ field: path.join('.'), message, code })) },
    })
    validationError.stack = undefined
    throw validationError
  }
  if (error instanceof Error && 'statusCode' in error) {
    error.stack = undefined
    throw error
  }

  console.error(label, error)
  const serverError = new HTTPError({ statusCode: 500, statusMessage: serverMessage })
  serverError.stack = undefined
  throw serverError
}
