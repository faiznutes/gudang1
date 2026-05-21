import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import bcrypt from 'bcryptjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

import { authRoutes } from './auth.js'

describe('auth password change and session invalidation', () => {
  const currentPassword = 'oldpass123'
  const newPassword = 'newpass123'

  let userRecord: {
    id: string
    name: string
    email: string
    role: 'super_admin' | 'admin'
    disabledAt: null
    passwordHash: string
    sessionVersion: number
    createdAt: Date
    memberships: Array<any>
  }

  const prisma = {
    workspace: {
      findUnique: vi.fn(async () => null),
    },
    user: {
      findUnique: vi.fn(async () => ({
        ...userRecord,
        memberships: userRecord.memberships,
      })),
      findUniqueOrThrow: vi.fn(async () => ({
        ...userRecord,
        memberships: userRecord.memberships,
      })),
      update: vi.fn(async ({ data }: any) => {
        if (data.passwordHash) {
          userRecord.passwordHash = data.passwordHash
        }
        if (data.sessionVersion?.increment) {
          userRecord.sessionVersion += data.sessionVersion.increment
        }
        return { ...userRecord }
      }),
    },
    workspaceMember: {
      findUnique: vi.fn(async () => ({
        userId: userRecord.id,
        workspaceId: 'workspace-1',
        role: 'admin',
        user: { ...userRecord },
        workspace: {
          id: 'workspace-1',
          name: 'Tenant Test',
          plan: 'pro',
          status: 'active',
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
        },
      })),
      findFirst: vi.fn(async () => null),
      findUniqueOrThrow: vi.fn(async () => ({
        userId: userRecord.id,
        workspaceId: 'workspace-1',
        role: 'admin',
        user: { ...userRecord },
        workspace: {
          id: 'workspace-1',
          name: 'Tenant Test',
          plan: 'pro',
          status: 'active',
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
        },
      })),
    },
    systemSetting: {
      findMany: vi.fn(async () => []),
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

  beforeEach(() => {
    userRecord = {
      id: 'user-1',
      name: 'Super Admin',
      email: 'superadmin@example.com',
      role: 'super_admin',
      disabledAt: null,
      passwordHash: bcrypt.hashSync(currentPassword, 10),
      sessionVersion: 0,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
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
        },
      ],
    }
    vi.clearAllMocks()
  })

  it('rotates session version after password change and rejects the old token', async () => {
    const app = await buildApp()
    try {
      const oldToken = app.jwt.sign({
        sub: userRecord.id,
        workspaceId: 'workspace-1',
        role: 'admin',
        sessionExpiresAt: '2026-06-01T00:00:00.000Z',
        sessionVersion: userRecord.sessionVersion,
      })

      const changeResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        headers: {
          authorization: `Bearer ${oldToken}`,
        },
        payload: {
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirmation: newPassword,
        },
      })

      expect(changeResponse.statusCode).toBe(200)
      const changePayload = changeResponse.json()
      expect(changePayload.token).toBeTruthy()
      expect(userRecord.sessionVersion).toBe(1)
      expect(await bcrypt.compare(newPassword, userRecord.passwordHash)).toBe(true)

      const oldSessionCheck = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${oldToken}`,
        },
      })
      expect(oldSessionCheck.statusCode).toBe(401)

      const freshSessionCheck = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${changePayload.token}`,
        },
      })
      expect(freshSessionCheck.statusCode).toBe(200)
      expect(freshSessionCheck.json()).toMatchObject({
        user: {
          email: 'superadmin@example.com',
        },
      })

      const logoutAllResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/logout-all',
        headers: {
          authorization: `Bearer ${changePayload.token}`,
        },
      })
      expect(logoutAllResponse.statusCode).toBe(200)
      expect(userRecord.sessionVersion).toBe(2)

      const afterLogoutAll = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${changePayload.token}`,
        },
      })
      expect(afterLogoutAll.statusCode).toBe(401)
    } finally {
      await app.close()
    }
  })
})
