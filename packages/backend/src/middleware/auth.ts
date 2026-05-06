import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { UserRole } from '@stockpilot/shared'
import { AppError } from '../lib/errors.js'
import { getEntitlements } from '../lib/plans.js'

export interface AuthContext {
  userId: string
  workspaceId: string
  role: UserRole
}

export async function requireAuth(app: FastifyInstance, request: FastifyRequest): Promise<AuthContext> {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) {
    throw new AppError('unauthenticated', 'Sesi tidak ditemukan')
  }

  let payload: { sub?: string; workspaceId?: string; role?: UserRole }
  try {
    payload = app.jwt.verify(token) as { sub?: string; workspaceId?: string; role?: UserRole }
  } catch {
    throw new AppError('unauthenticated', 'Sesi sudah tidak valid')
  }

  if (!payload.sub) {
    throw new AppError('unauthenticated', 'Sesi sudah tidak valid')
  }

  const membership = await app.prisma.workspaceMember.findFirst({
    where: {
      userId: payload.sub,
      ...(payload.workspaceId ? { workspaceId: payload.workspaceId } : {}),
    },
    include: { workspace: true },
  })

  if (!membership || membership.workspace.status === 'suspended') {
    throw new AppError('forbidden', 'Workspace tidak aktif atau akses ditolak')
  }

  return {
    userId: membership.userId,
    workspaceId: membership.workspaceId,
    role: membership.role as UserRole,
  }
}

export function requireRole(ctx: AuthContext, roles: UserRole[]) {
  if (!roles.includes(ctx.role)) {
    throw new AppError('forbidden', 'Anda tidak memiliki akses ke halaman ini')
  }
}

export async function requireFeature(app: FastifyInstance, ctx: AuthContext, feature: keyof Awaited<ReturnType<typeof getEntitlements>>['features']) {
  const entitlements = await getEntitlements(app, ctx.workspaceId)
  if (!entitlements.features[feature]) {
    throw new AppError('feature_locked', 'Fitur ini belum tersedia di paket Anda', {
      feature,
      plan: entitlements.plan,
    })
  }
  return entitlements
}
