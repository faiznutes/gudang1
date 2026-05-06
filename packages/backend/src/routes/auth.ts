import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { createHmac, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { env } from '../config.js'
import { AppError } from '../lib/errors.js'
import { userDto, workspaceDto } from '../lib/mappers.js'
import { getEntitlements } from '../lib/plans.js'
import { requireAuth } from '../middleware/auth.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  password_confirmation: z.string().min(6).optional(),
  workspace_name: z.string().min(2).optional(),
  plan: z.enum(['free', 'starter', 'growth', 'pro', 'custom']).default('free'),
  trial: z.boolean().default(false),
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

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { exp?: number; sub?: string; workspaceId?: string; role?: string }
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

function signAccessToken(app: FastifyInstance, payload: { sub: string; workspaceId: string; role: string }) {
  return app.jwt.sign(payload, { expiresIn: '15m' })
}

async function createStarterWorkspaceData(tx: Prisma.TransactionClient, workspaceId: string) {
  const category = await tx.category.create({
    data: {
      workspaceId,
      name: 'Umum',
      description: 'Kategori default',
    },
  })

  await tx.warehouse.create({
    data: {
      workspaceId,
      name: 'Gudang Utama',
      address: 'Lokasi utama',
      isDefault: true,
    },
  })

  return category
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
          take: 1,
        },
      },
    })

    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new AppError('unauthenticated', 'Email atau password salah')
    }

    const membership = user.memberships[0]
    if (!membership || membership.workspace.status === 'suspended') {
      throw new AppError('forbidden', 'Workspace tidak aktif')
    }

    const token = signAccessToken(app, {
      sub: user.id,
      workspaceId: membership.workspaceId,
      role: membership.role,
    })
    setRefreshCookie(app, reply, {
      sub: user.id,
      workspaceId: membership.workspaceId,
      role: membership.role,
    })

    return {
      token,
      user: userDto(user),
      workspace: workspaceDto(membership.workspace),
      entitlements: await getEntitlements(app, membership.workspaceId),
    }
  })

  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body)
    if (body.password_confirmation && body.password_confirmation !== body.password) {
      throw new AppError('validation_error', 'Konfirmasi password tidak cocok')
    }

    const existing = await app.prisma.user.findUnique({ where: { email: body.email.toLowerCase() } })
    if (existing) {
      throw new AppError('conflict', 'Email sudah terdaftar')
    }

    const passwordHash = await bcrypt.hash(body.password, 10)
    const trialEndsAt = body.trial ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null

    const result = await app.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: body.name,
          email: body.email.toLowerCase(),
          passwordHash,
          role: body.trial ? 'trial' : 'admin',
        },
      })

      const workspace = await tx.workspace.create({
        data: {
          name: body.workspace_name ?? `${body.name}'s Workspace`,
          plan: body.trial ? 'free' : body.plan,
          status: body.trial ? 'trial' : 'active',
          trialEndsAt,
        },
      })

      const member = await tx.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: body.trial ? 'trial' : 'admin',
        },
      })

      await tx.subscription.create({
        data: {
          workspaceId: workspace.id,
          plan: body.trial ? 'pro' : body.plan,
          status: body.trial ? 'trialing' : 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: body.trial ? trialEndsAt! : new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000),
        },
      })

      await createStarterWorkspaceData(tx, workspace.id)
      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          action: 'workspace.registered',
          entityType: 'workspace',
          entityId: workspace.id,
          metadata: { plan: body.plan, trial: body.trial },
        },
      })

      return { user, workspace, member }
    })

    const token = signAccessToken(app, {
      sub: result.user.id,
      workspaceId: result.workspace.id,
      role: result.member.role,
    })
    setRefreshCookie(app, reply, {
      sub: result.user.id,
      workspaceId: result.workspace.id,
      role: result.member.role,
    })

    return {
      token,
      user: userDto(result.user),
      workspace: workspaceDto(result.workspace),
      entitlements: await getEntitlements(app, result.workspace.id),
    }
  })

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie('refreshToken', { path: '/api/auth' })
    return { ok: true }
  })

  app.get('/me', async (request) => {
    const ctx = await requireAuth(app, request)
    const member = await app.prisma.workspaceMember.findUniqueOrThrow({
      where: { userId_workspaceId: { userId: ctx.userId, workspaceId: ctx.workspaceId } },
      include: { user: true, workspace: true },
    })

    return {
      user: userDto(member.user),
      workspace: workspaceDto(member.workspace),
      entitlements: await getEntitlements(app, ctx.workspaceId),
    }
  })

  app.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken
    if (!refreshToken) {
      throw new AppError('unauthenticated', 'Refresh token tidak ditemukan')
    }

    let payload: { sub?: string; workspaceId?: string; role?: string }
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
    })
    setRefreshCookie(app, reply, payload)
    return { token }
  })
}
