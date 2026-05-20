import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: vi.fn(async () => ({
    userId: 'user-1',
    workspaceId: 'workspace-1',
    tokenWorkspaceId: 'workspace-1',
    tenantSource: 'token',
    role: 'admin',
    platformRole: 'admin',
    sessionExpiresAt: new Date('2026-06-01T00:00:00.000Z'),
  })),
  requireTenantRole: vi.fn(),
  requireActiveSession: vi.fn(),
  requireFeature: vi.fn(),
}))

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
    usage: { warehouses: 1, products: 2, users: 1 },
  })),
}))

vi.mock('../lib/settings.js', () => ({
  getPlatformSettings: vi.fn(async () => ({
    lockActionsAfterSessionExpiry: false,
    sessionTimeoutMinutes: 30,
  })),
}))

import { inventoryRoutes } from './inventory.js'

describe('inventory category lifecycle', () => {
  let categories: Array<{
    id: string
    workspaceId: string
    name: string
    description?: string | null
    disabledAt: Date | null
    createdAt: Date
    updatedAt: Date
  }>
  let products: Array<{
    id: string
    workspaceId: string
    categoryId: string
    disabledAt: Date | null
  }>

  const prisma = {
    category: {
      findMany: vi.fn(async ({ where }: any) => {
        return categories.filter(category => {
          if (where.workspaceId && category.workspaceId !== where.workspaceId) return false
          if (where.disabledAt === null && category.disabledAt !== null) return false
          if (where.disabledAt?.not === null && category.disabledAt === null) return false
          return true
        })
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        return categories.find(category => {
          if (where.id && category.id !== where.id) return false
          if (where.workspaceId && category.workspaceId !== where.workspaceId) return false
          if (where.name && category.name !== where.name) return false
          return true
        }) ?? null
      }),
      create: vi.fn(async ({ data }: any) => {
        const category = {
          id: `cat-${categories.length + 1}`,
          workspaceId: data.workspaceId,
          name: data.name,
          description: data.description ?? null,
          disabledAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        categories.push(category)
        return category
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const index = categories.findIndex(category => category.id === where.id)
        categories[index] = {
          ...categories[index],
          ...data,
          disabledAt: data.disabledAt === undefined ? categories[index].disabledAt : data.disabledAt,
          updatedAt: new Date(),
        }
        return categories[index]
      }),
    },
    product: {
      findFirst: vi.fn(async ({ where }: any) => {
        return products.find(product => product.id === where.id && product.workspaceId === where.workspaceId && product.disabledAt === null) ?? null
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0
        products = products.map(product => {
          if (product.workspaceId === where.workspaceId && product.categoryId === where.categoryId && product.disabledAt === null) {
            count += 1
            return { ...product, categoryId: data.categoryId }
          }
          return product
        })
        return { count }
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
    await app.register(inventoryRoutes, { prefix: '/api' })
    return app
  }

  beforeEach(() => {
    categories = [
      {
        id: 'cat-1',
        workspaceId: 'workspace-1',
        name: 'Umum',
        description: 'Kategori default',
        disabledAt: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      },
      {
        id: 'cat-2',
        workspaceId: 'workspace-1',
        name: 'Aksesoris',
        description: 'Barang pelengkap',
        disabledAt: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    ]
    products = [
      { id: 'product-1', workspaceId: 'workspace-1', categoryId: 'cat-2', disabledAt: null },
    ]
    vi.clearAllMocks()
  })

  it('supports active, archive, restore, and merge flows', async () => {
    const app = await buildApp()
    try {
      const listResponse = await app.inject({ method: 'GET', url: '/api/categories?status=all' })
      expect(listResponse.statusCode).toBe(200)
      expect(listResponse.json()).toHaveLength(2)

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/categories',
        payload: {
          name: 'Office',
          description: 'Perlengkapan kantor',
        },
      })
      expect(createResponse.statusCode).toBe(200)
      expect(createResponse.json()).toMatchObject({ name: 'Office', disabled_at: null })

      const archiveResponse = await app.inject({ method: 'POST', url: '/api/categories/cat-2/archive' })
      expect(archiveResponse.statusCode).toBe(200)
      expect(archiveResponse.json()).toMatchObject({ id: 'cat-2' })
      expect(categories.find(category => category.id === 'cat-2')?.disabledAt).not.toBeNull()

      const restoreResponse = await app.inject({ method: 'POST', url: '/api/categories/cat-2/restore' })
      expect(restoreResponse.statusCode).toBe(200)
      expect(restoreResponse.json()).toMatchObject({ id: 'cat-2', disabled_at: null })

      const mergeResponse = await app.inject({
        method: 'POST',
        url: '/api/categories/cat-2/merge',
        payload: { target_category_id: 'cat-1' },
      })
      expect(mergeResponse.statusCode).toBe(200)
      expect(mergeResponse.json()).toMatchObject({ id: 'cat-2' })
      expect(categories.find(category => category.id === 'cat-2')?.disabledAt).not.toBeNull()
      expect(products[0].categoryId).toBe('cat-1')
      expect(prisma.auditLog.create).toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })
})
