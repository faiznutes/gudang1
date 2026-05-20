import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import bcrypt from 'bcryptjs'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/plans.js', () => ({
  getEntitlements: vi.fn(async () => ({
    plan: 'pro',
    subscriptionStatus: 'active',
    subscriptionStartsAt: new Date('2026-05-01T00:00:00.000Z'),
    subscriptionEndsAt: new Date('2026-06-01T00:00:00.000Z'),
    trialEndsAt: null,
    features: {
      stockInOut: true,
      multiWarehouse: true,
      analytics: true,
      exportPDF: true,
      batchImport: true,
      reports: true,
    },
    limits: { warehouses: 10, products: 100, users: 10 },
    usage: { warehouses: 1, products: 1, users: 1 },
  })),
}))

vi.mock('../lib/settings.js', () => ({
  getPlatformSettings: vi.fn(async () => ({
    lockActionsAfterSessionExpiry: false,
    sessionTimeoutMinutes: 30,
  })),
  getSessionPolicy: vi.fn(async () => ({
    timeoutMinutes: 30,
    lockActionsAfterExpiry: true,
    expiresAt: new Date('2026-06-01T00:00:00.000Z'),
  })),
}))

vi.mock('../middleware/auth.js', () => ({
  requireAuth: vi.fn(),
}))

import { authRoutes } from './auth.js'

describe('auth login rate limit', () => {
  const password = 'password123'
  const passwordHash = bcrypt.hashSync(password, 10)

  const prisma = {
    user: {
      findUnique: vi.fn(async () => ({
        id: 'user-1',
        name: 'Tenant Admin',
        email: 'admin@example.com',
        role: 'admin',
        disabledAt: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        passwordHash,
        memberships: [
          {
            userId: 'user-1',
            workspaceId: 'workspace-1',
            role: 'admin',
            workspace: {
              id: 'workspace-1',
              name: 'Tenant Test',
              plan: 'pro',
              status: 'active',
              createdAt: new Date('2026-05-01T00:00:00.000Z'),
            },
            user: {
              id: 'user-1',
              name: 'Tenant Admin',
              email: 'admin@example.com',
              role: 'admin',
              disabledAt: null,
              createdAt: new Date('2026-05-01T00:00:00.000Z'),
            },
          },
        ],
      })),
    },
    workspaceMember: {
      findUnique: vi.fn(async () => ({
        userId: 'user-1',
        workspaceId: 'workspace-1',
        role: 'admin',
        user: {
          id: 'user-1',
          name: 'Tenant Admin',
          email: 'admin@example.com',
          role: 'admin',
          disabledAt: null,
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
        },
        workspace: {
          id: 'workspace-1',
          name: 'Tenant Test',
          plan: 'pro',
          status: 'active',
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
        },
      })),
    },
    auditLog: {
      create: vi.fn(async () => undefined),
    },
  }

  async function buildApp() {
    const app = Fastify()
    app.decorate('prisma', prisma as any)
    await app.register(cookie)
    await app.register(jwt, { secret: 'a'.repeat(16) })
    await app.register(rateLimit, {
      global: true,
      max: 120,
      timeWindow: '1 minute',
      errorResponseBuilder: () => ({
        statusCode: 429,
        code: 'rate_limited',
        message: 'Terlalu banyak percobaan. Coba lagi sebentar.',
      }),
    })
    await app.register(authRoutes, { prefix: '/api/auth' })
    return app
  }

  it('returns 429 after repeated login attempts', async () => {
    const app = await buildApp()
    try {
      for (let index = 0; index < 8; index += 1) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: {
            email: 'admin@example.com',
            password,
          },
        })
        expect(response.statusCode).toBe(200)
      }

      const blocked = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin@example.com',
          password,
        },
      })

      expect(blocked.statusCode).toBe(429)
      expect(blocked.json()).toMatchObject({ code: 'rate_limited' })
    } finally {
      await app.close()
    }
  })
})
