import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: vi.fn(async () => ({
    userId: 'admin-1',
    workspaceId: 'platform-workspace',
    tokenWorkspaceId: 'platform-workspace',
    tenantSource: 'token',
    role: 'super_admin',
    platformRole: 'super_admin',
    sessionExpiresAt: new Date('2026-06-01T00:00:00.000Z'),
  })),
  requirePlatformRole: vi.fn(),
}))

import { adminMonetizationRoutes } from './adminMonetization.js'

describe('admin monetization catalog flow', () => {
  const prisma = {
    planPackage: {
      findMany: vi.fn(async () => ([{
        id: 'pkg-1',
        code: 'growth',
        name: 'Growth',
        description: 'Paket growth',
        status: 'active',
        monthlyPrice: 150000,
        yearlyPrice: 1500000,
        originalMonthlyPrice: 200000,
        trialDays: 7,
        sortOrder: 1,
        warehouseLimit: 3,
        productLimit: 500,
        userLimit: 10,
        features: [
          { feature: 'stockInOut', enabled: true },
          { feature: 'multiWarehouse', enabled: true },
          { feature: 'analytics', enabled: true },
          { feature: 'exportPDF', enabled: true },
          { feature: 'batchImport', enabled: true },
          { feature: 'reports', enabled: true },
        ],
        _count: {
          subscriptions: 1,
          currentBillingRequests: 1,
          requestedBillingRequests: 0,
        },
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      }])),
      findUnique: vi.fn(async () => ({
        id: 'pkg-1',
        code: 'growth',
        name: 'Growth',
        monthlyPrice: 150000,
      })),
      delete: vi.fn(async () => undefined),
    },
    addon: {
      findMany: vi.fn(async () => ([{
        id: 'addon-1',
        code: 'extra-users',
        name: 'Extra Users',
        description: 'Tambah user',
        status: 'active',
        monthlyPrice: 25000,
        yearlyPrice: null,
        featureKey: null,
        limitKey: 'users',
        limitIncrement: 5,
        sortOrder: 1,
        _count: {
          assignments: 0,
          billingRequests: 2,
        },
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      }])),
      findUnique: vi.fn(async () => ({
        id: 'addon-1',
        code: 'extra-users',
        name: 'Extra Users',
      })),
      delete: vi.fn(async () => undefined),
      update: vi.fn(async ({ data }: any) => ({
        id: 'addon-1',
        code: 'extra-users',
        name: 'Extra Users',
        status: data.status,
        monthlyPrice: 25000,
        yearlyPrice: null,
        featureKey: null,
        limitKey: 'users',
        limitIncrement: 5,
        sortOrder: 1,
        _count: {
          assignments: 0,
          billingRequests: 2,
        },
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      })),
    },
    workspaceAddon: {
      count: vi.fn(async () => 0),
    },
    subscription: {
      count: vi.fn(async ({ where }: any) => {
        if (where?.planPackageId === 'pkg-1') return 1
        return 0
      }),
    },
    billingRequest: {
      count: vi.fn(async ({ where }: any) => {
        if (where?.addonId === 'addon-1') return 2
        if (where?.OR) return 1
        return 0
      }),
    },
    auditLog: {
      create: vi.fn(async () => undefined),
    },
    $transaction: vi.fn(async (callback: any) => callback(prisma)),
  }

  async function buildApp() {
    const app = Fastify()
    app.decorate('prisma', prisma as any)
    await app.register(adminMonetizationRoutes, { prefix: '/api/admin' })
    return app
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exposes usage counts and delete guards for packages and add-ons', async () => {
    const app = await buildApp()
    try {
      const packageResponse = await app.inject({ method: 'GET', url: '/api/admin/packages' })
      expect(packageResponse.statusCode).toBe(200)
      expect(packageResponse.json()[0]).toMatchObject({
        code: 'growth',
        usage: {
          subscriptions: 1,
          billing_requests: 1,
          total_references: 2,
        },
        can_delete: false,
      })

      const addonResponse = await app.inject({ method: 'GET', url: '/api/admin/addons' })
      expect(addonResponse.statusCode).toBe(200)
      expect(addonResponse.json()[0]).toMatchObject({
        code: 'extra-users',
        usage: {
          assignments: 0,
          billing_requests: 2,
          total_references: 2,
        },
        can_delete: false,
      })

      const deleteResponse = await app.inject({ method: 'DELETE', url: '/api/admin/packages/pkg-1' })
      expect(deleteResponse.statusCode).toBe(409)
      expect(deleteResponse.json()).toMatchObject({
        code: 'conflict',
      })
      expect(prisma.planPackage.delete).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })
})
