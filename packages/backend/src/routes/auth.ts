import type { FastifyInstance, FastifyRequest } from 'fastify'
import { createHmac, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { env } from '../config.js'
import { AppError } from '../lib/errors.js'
import { userDto, workspaceDto } from '../lib/mappers.js'
import { writeAuditLog } from '../lib/audit.js'
import { getEntitlements } from '../lib/plans.js'
import { requireAuth } from '../middleware/auth.js'
import { getPlatformSettings, getSessionPolicy } from '../lib/settings.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const switchWorkspaceSchema = z.object({
  workspace_id: z.string().min(1),
})

function base64Url(value: string) {
  return Buffer.from(value).toString('base64url')
}

function signRefreshToken(payload: object) {
  const body = base64Url(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  }))
  const signature = createHmac('sha256', env.REFRESH_TOKEN_SECRET).update(body).digest('base64url')
  return `${body}.${signature}`
}

function verifyRefreshToken(token: string) {
  const [body, signature] = token.split('.')
  if (!body || !signature) throw new Error('Invalid token')

  const expected = createHmac('sha256', env.REFRESH_TOKEN_SECRET).update(body).digest('base64url')
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error('Invalid token')
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { exp?: number; sub?: string; workspaceId?: string; role?: string; sessionExpiresAt?: string }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Expired token')
  }
  return payload
}

function setRefreshCookie(_app: FastifyInstance, reply: any, payload: object) {
  const refreshToken = signRefreshToken(payload)

  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/api/auth',
    maxAge: 60 * 60 * 24 * 30,
  })
}

function sessionDto(policy: Awaited<ReturnType<typeof getSessionPolicy>>) {
  return {
    activity_session_expires_at: policy.lockActionsAfterExpiry ? policy.expiresAt.toISOString() : null,
    session_policy: {
      timeout_minutes: policy.timeoutMinutes,
      lock_actions_after_expiry: policy.lockActionsAfterExpiry,
    },
  }
}

function signAccessToken(app: FastifyInstance, payload: { sub: string; workspaceId: string; role: string; sessionExpiresAt: string }) {
  return app.jwt.sign(payload, { expiresIn: '8h' })
}

async function writeAuthAuditLog(
  app: FastifyInstance,
  request: FastifyRequest,
  input: {
    workspaceId: string
    userId: string
    action: string
    metadata?: unknown
  },
) {
  return writeAuditLog(app, {
    userId: input.userId,
    workspaceId: input.workspaceId,
  }, request, {
    action: input.action,
    entityType: 'auth_session',
    entityId: input.userId,
    metadata: input.metadata,
  })
}

async function getValidMembership(app: FastifyInstance, userId: string, workspaceId: string) {
  const membership = await app.prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { user: true, workspace: true },
  })

  if (!membership || membership.user.disabledAt || membership.workspace.status === 'suspended') {
    throw new AppError('forbidden', 'Tenant tidak aktif atau akses ditolak')
  }

  return membership
}

async function issueSession(
  app: FastifyInstance,
  reply: any,
  membership: Awaited<ReturnType<typeof getValidMembership>>,
  sessionPolicy: Awaited<ReturnType<typeof getSessionPolicy>>,
) {
  const payload = {
    sub: membership.userId,
    workspaceId: membership.workspaceId,
    role: membership.role,
    sessionExpiresAt: sessionPolicy.expiresAt.toISOString(),
  }
  const token = signAccessToken(app, payload)
  setRefreshCookie(app, reply, payload)

  return {
    token,
    user: userDto(membership.user),
    platform_role: membership.user.role,
    workspace_role: membership.role,
    workspace: workspaceDto(membership.workspace),
    entitlements: await getEntitlements(app, membership.workspaceId),
    ...sessionDto(sessionPolicy),
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', {
    config: {
      rateLimit: {
        max: 8,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body)
    const user = await app.prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: {
        memberships: {
          include: { workspace: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!user || user.disabledAt || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new AppError('unauthenticated', 'Email atau password salah')
    }

    const activeMemberships = user.memberships.filter(member => member.workspace.status !== 'suspended')
    const membership =
      user.role === 'super_admin'
        ? activeMemberships.find(member => member.role === 'super_admin') ?? activeMemberships[0]
        : activeMemberships[0]

    if (!membership) {
      throw new AppError('forbidden', 'Workspace tidak aktif')
    }

    const sessionPolicy = await getSessionPolicy(app)
    const validMembership = await getValidMembership(app, user.id, membership.workspaceId)
    const session = await issueSession(app, reply, validMembership, sessionPolicy)
    await writeAuthAuditLog(app, request, {
      workspaceId: validMembership.workspaceId,
      userId: validMembership.userId,
      action: 'auth.login',
      metadata: {
        platform_role: validMembership.user.role,
        workspace_role: validMembership.role,
      },
    })
    return session
  })

  app.post('/register', async () => {
    throw new AppError(
      'forbidden',
      'Pendaftaran tenant baru diproses melalui WhatsApp dan diaktifkan oleh super admin.',
    )
  })

  app.post('/logout', async (request, reply) => {
    reply.clearCookie('refreshToken', { path: '/api/auth' })
    try {
      const ctx = await requireAuth(app, request)
      await writeAuthAuditLog(app, request, {
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: 'auth.logout',
      })
    } catch {
      // Logout should remain idempotent even if the token is already invalid.
    }
    return { ok: true }
  })

  app.get('/me', async (request) => {
    const ctx = await requireAuth(app, request)
    const settings = await getPlatformSettings(app)
    const member = await app.prisma.workspaceMember.findUniqueOrThrow({
      where: { userId_workspaceId: { userId: ctx.userId, workspaceId: ctx.workspaceId } },
      include: { user: true, workspace: true },
    })

    return {
      user: userDto(member.user),
      platform_role: member.user.role,
      workspace_role: member.role,
      workspace: workspaceDto(member.workspace),
      entitlements: await getEntitlements(app, ctx.workspaceId),
      activity_session_expires_at: settings.lockActionsAfterSessionExpiry ? ctx.sessionExpiresAt?.toISOString() ?? null : null,
      session_policy: {
        timeout_minutes: settings.sessionTimeoutMinutes,
        lock_actions_after_expiry: settings.lockActionsAfterSessionExpiry,
      },
    }
  })

  app.get('/workspaces', async (request) => {
    const ctx = await requireAuth(app, request, { tenantHeaderMode: 'ignore' })
    const memberships = await app.prisma.workspaceMember.findMany({
      where: {
        userId: ctx.userId,
        workspace: { status: { not: 'suspended' } },
      },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    })

    return {
      current_workspace_id: ctx.workspaceId,
      data: memberships.map((member) => ({
        role: member.role,
        workspace: workspaceDto(member.workspace),
      })),
    }
  })

  app.post('/switch-workspace', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const ctx = await requireAuth(app, request, { tenantHeaderMode: 'ignore' })
    const body = switchWorkspaceSchema.parse(request.body)
    const membership = await getValidMembership(app, ctx.userId, body.workspace_id)
    const sessionPolicy = await getSessionPolicy(app)
    const session = await issueSession(app, reply, membership, sessionPolicy)
    await writeAuthAuditLog(app, request, {
      workspaceId: membership.workspaceId,
      userId: membership.userId,
      action: 'auth.switch_workspace',
      metadata: {
        from_workspace_id: ctx.workspaceId,
        to_workspace_id: membership.workspaceId,
        workspace_role: membership.role,
      },
    })
    return session
  })

  app.post('/refresh', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const refreshToken = request.cookies.refreshToken
    if (!refreshToken) {
      throw new AppError('unauthenticated', 'Refresh token tidak ditemukan')
    }

    let payload: { sub?: string; workspaceId?: string; role?: string; sessionExpiresAt?: string }
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch {
      throw new AppError('unauthenticated', 'Refresh token tidak valid')
    }

    if (!payload.sub || !payload.workspaceId || !payload.role) {
      throw new AppError('unauthenticated', 'Refresh token tidak valid')
    }

    const membership = await getValidMembership(app, payload.sub, payload.workspaceId)
    const sessionPolicy = await getSessionPolicy(app)
    const sessionExpiresAt = payload.sessionExpiresAt ?? sessionPolicy.expiresAt.toISOString()

    const token = signAccessToken(app, {
      sub: membership.userId,
      workspaceId: membership.workspaceId,
      role: membership.role,
      sessionExpiresAt,
    })
    setRefreshCookie(app, reply, {
      sub: membership.userId,
      workspaceId: membership.workspaceId,
      role: membership.role,
      sessionExpiresAt,
    })
    return { token }
  })
}
