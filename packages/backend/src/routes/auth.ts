import type { FastifyInstance } from 'fastify'
import { createHmac, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { env } from '../config.js'
import { AppError } from '../lib/errors.js'
import { userDto, workspaceDto } from '../lib/mappers.js'
import { getEntitlements } from '../lib/plans.js'
import { requireAuth } from '../middleware/auth.js'
import { getPlatformSettings, getSessionPolicy } from '../lib/settings.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
    activity_session_expires_at: policy.expiresAt.toISOString(),
    session_policy: {
      timeout_minutes: policy.timeoutMinutes,
      lock_actions_after_expiry: policy.lockActionsAfterExpiry,
    },
  }
}

function signAccessToken(app: FastifyInstance, payload: { sub: string; workspaceId: string; role: string; sessionExpiresAt: string }) {
  return app.jwt.sign(payload, { expiresIn: '8h' })
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
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
    const token = signAccessToken(app, {
      sub: user.id,
      workspaceId: membership.workspaceId,
      role: membership.role,
      sessionExpiresAt: sessionPolicy.expiresAt.toISOString(),
    })
    setRefreshCookie(app, reply, {
      sub: user.id,
      workspaceId: membership.workspaceId,
      role: membership.role,
      sessionExpiresAt: sessionPolicy.expiresAt.toISOString(),
    })

    return {
      token,
      user: userDto(user),
      workspace: workspaceDto(membership.workspace),
      entitlements: await getEntitlements(app, membership.workspaceId),
      ...sessionDto(sessionPolicy),
    }
  })

  app.post('/register', async () => {
    throw new AppError(
      'forbidden',
      'Pendaftaran tenant baru diproses melalui WhatsApp dan diaktifkan oleh super admin.',
    )
  })

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie('refreshToken', { path: '/api/auth' })
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
      workspace: workspaceDto(member.workspace),
      entitlements: await getEntitlements(app, ctx.workspaceId),
      activity_session_expires_at: ctx.sessionExpiresAt?.toISOString() ?? null,
      session_policy: {
        timeout_minutes: settings.sessionTimeoutMinutes,
        lock_actions_after_expiry: settings.lockActionsAfterSessionExpiry,
      },
    }
  })

  app.post('/refresh', async (request, reply) => {
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

    const token = signAccessToken(app, {
      sub: payload.sub,
      workspaceId: payload.workspaceId,
      role: payload.role,
      sessionExpiresAt: payload.sessionExpiresAt ?? new Date().toISOString(),
    })
    setRefreshCookie(app, reply, payload)
    return { token }
  })
}
