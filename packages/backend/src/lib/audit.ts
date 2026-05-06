import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { AuthContext } from '../middleware/auth.js'

export async function writeAuditLog(
  app: FastifyInstance,
  ctx: AuthContext,
  request: FastifyRequest,
  input: {
    action: string
    entityType: string
    entityId?: string | null
    metadata?: unknown
  },
) {
  return app.prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata === undefined ? undefined : input.metadata as any,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    },
  })
}
