import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

export type ApiErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'feature_locked'
  | 'conflict'
  | 'validation_error'
  | 'not_found'
  | 'internal_error'

const statusByCode: Record<ApiErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  feature_locked: 402,
  conflict: 409,
  validation_error: 422,
  not_found: 404,
  internal_error: 500,
}

export class AppError extends Error {
  code: ApiErrorCode
  statusCode: number
  details?: unknown

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message)
    this.code = code
    this.statusCode = statusByCode[code]
    this.details = details
  }
}

export function installErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        details: error.details,
      })
      return
    }

    if (error instanceof ZodError) {
      reply.status(422).send({
        code: 'validation_error',
        message: 'Data yang dikirim belum valid',
        details: error.flatten(),
      })
      return
    }

    app.log.error(error)
    reply.status(500).send({
      code: 'internal_error',
      message: 'Terjadi kesalahan pada server',
    })
  })
}
