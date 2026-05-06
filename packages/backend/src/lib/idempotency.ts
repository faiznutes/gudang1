import type { FastifyInstance } from 'fastify'
import type { AuthContext } from '../middleware/auth.js'

export async function runIdempotent<T>(
  app: FastifyInstance,
  ctx: AuthContext,
  key: string | undefined,
  operationType: string,
  payload: unknown,
  execute: () => Promise<T>,
): Promise<T> {
  if (!key) {
    return execute()
  }

  const existing = await app.prisma.syncOperation.findUnique({
    where: { workspaceId_key: { workspaceId: ctx.workspaceId, key } },
  })

  if (existing?.status === 'synced' && existing.response !== null) {
    return existing.response as T
  }

  if (!existing) {
    await app.prisma.syncOperation.create({
      data: {
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        key,
        operationType,
        payload: payload as object,
        status: 'pending',
      },
    })
  }

  try {
    const response = await execute()
    await app.prisma.syncOperation.update({
      where: { workspaceId_key: { workspaceId: ctx.workspaceId, key } },
      data: { status: 'synced', response: response as object, error: null },
    })
    return response
  } catch (error) {
    await app.prisma.syncOperation.update({
      where: { workspaceId_key: { workspaceId: ctx.workspaceId, key } },
      data: { status: 'failed', error: error instanceof Error ? error.message : 'Sync gagal' },
    })
    throw error
  }
}
