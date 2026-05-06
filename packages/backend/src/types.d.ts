import type { PrismaClient } from '@prisma/client'
import type { FastifyJWTOptions } from '@fastify/jwt'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    jwt: FastifyJWTOptions & {
      sign: (payload: object, options?: object) => string
      verify: <T = unknown>(token: string, options?: object) => T
    }
  }
}
