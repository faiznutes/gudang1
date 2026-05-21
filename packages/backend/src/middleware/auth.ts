import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { UserRole } from '@stockpilot/shared'
import { AppError } from '../lib/errors.js'
import { getEntitlements } from '../lib/plans.js'
import { getPlatformSettings } from '../lib/settings.js'

export interface AuthContext {
  userId: string
  workspaceId: string
  tokenWorkspaceId: string
  tenantSource: 'token' | 'header'
  role: UserRole
  platformRole: UserRole
  sessionExpiresAt: Date | null
}

type AccessTokenPayload = {
  sub?: string
  workspaceId?: string
  role?: UserRole
  sessionExpiresAt?: string
  sessionVersion?: number
}

export interface RequireAuthOptions {
  tenantHeaderMode?: 'allow' | 'ignore'
}

function headerValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

export function resolveTenantWorkspaceId(headers: FastifyRequest['headers'], tokenWorkspaceId?: string) {
  const workspaceHeader = headerValue(headers['x-workspace-id'])
  const tenantHeader = headerValue(headers['x-tenant-id'])

  if (workspaceHeader && tenantHeader && workspaceHeader !== tenantHeader) {
    throw new AppError('forbidden', 'Header tenant tidak konsisten')
  }

  const requestedWorkspaceId = workspaceHeader ?? tenantHeader ?? tokenWorkspaceId
  if (!requestedWorkspaceId) {
    throw new AppError('unauthenticated', 'Tenant aktif tidak ditemukan')
  }

  return {
    workspaceId: requestedWorkspaceId,
    source: workspaceHeader || tenantHeader ? 'header' as const : 'token' as const,
  }
}

export async function requireAuth(app: FastifyInstance, request: FastifyRequest, options: RequireAuthOptions = {}): Promise<AuthContext> {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) {
    throw new AppError('unauthenticated', 'Sesi tidak ditemukan')
  }

  let payload: AccessTokenPayload
  try {
    payload = app.jwt.verify(token) as AccessTokenPayload
  } catch {
    throw new AppError('unauthenticated', 'Sesi sudah tidak valid')
  }

  if (!payload.sub) {
    throw new AppError('unauthenticated', 'Sesi sudah tidak valid')
  }

  const requestedTenant =
    options.tenantHeaderMode === 'ignore'
      ? resolveTenantWorkspaceId({}, payload.workspaceId)
      : resolveTenantWorkspaceId(request.headers, payload.workspaceId)

  const membership = await app.prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: payload.sub,
        workspaceId: requestedTenant.workspaceId,
      },
    },
    include: { user: true, workspace: true },
  })

  if (!membership || membership.user.disabledAt || membership.workspace.status === 'suspended') {
    throw new AppError('forbidden', 'Tenant tidak aktif atau akses ditolak')
  }

  const tokenSessionVersion = payload.sessionVersion ?? 0
  const membershipSessionVersion = membership.user.sessionVersion ?? 0
  if (tokenSessionVersion !== membershipSessionVersion) {
    throw new AppError('unauthenticated', 'Sesi sudah tidak valid')
  }

  const sessionExpiresAt = payload.sessionExpiresAt ? new Date(payload.sessionExpiresAt) : null

  return {
    userId: membership.userId,
    workspaceId: membership.workspaceId,
    tokenWorkspaceId: payload.workspaceId ?? membership.workspaceId,
    tenantSource: requestedTenant.source,
    role: membership.role as UserRole,
    platformRole: membership.user.role as UserRole,
    sessionExpiresAt: sessionExpiresAt && Number.isFinite(sessionExpiresAt.getTime()) ? sessionExpiresAt : null,
  }
}

export function requireRole(ctx: AuthContext, roles: UserRole[]) {
  if (!roles.includes(ctx.role)) {
    throw new AppError('forbidden', 'Anda tidak memiliki akses ke halaman ini')
  }
}

export function requireTenantRole(ctx: AuthContext, roles: UserRole[]) {
  if (!roles.includes(ctx.role)) {
    throw new AppError('forbidden', 'Role tenant Anda tidak memiliki akses ke aksi ini')
  }
}

export function requirePlatformRole(ctx: AuthContext, roles: UserRole[]) {
  if (!roles.includes(ctx.platformRole)) {
    throw new AppError('forbidden', 'Anda tidak memiliki akses ke halaman ini')
  }
}

export async function requireActiveSession(app: FastifyInstance, ctx: AuthContext) {
  if (ctx.platformRole === 'super_admin') return
  const settings = await getPlatformSettings(app)
  if (!settings.lockActionsAfterSessionExpiry) return
  if (ctx.sessionExpiresAt && ctx.sessionExpiresAt <= new Date()) {
    throw new AppError('forbidden', 'Sesi aktivitas sudah berakhir. Anda masih bisa melihat laporan, tetapi tidak bisa mengubah data.')
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
