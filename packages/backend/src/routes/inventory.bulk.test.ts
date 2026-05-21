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
}))

import { inventoryRoutes } from './inventory.js'
import { supplierRoutes } from './suppliers.js'

describe('inventory bulk master-data actions', () => {
  let products: Array<{
    id: string
    workspaceId: string
    disabledAt: Date | null
  }>
  let categories: Array<{
    id: string
    workspaceId: string
    disabledAt: Date | null
  }>
  let warehouses: Array<{
    id: string
    workspaceId: string
    disabledAt: Date | null
    isDefault: boolean
  }>
  let suppliers: Array<{
    id: string
    workspaceId: string
    disabledAt: Date | null
  }>

  const prisma = {
    product: {
      findMany: vi.fn(async ({ where }: any) => products.filter(product => {
        if (where.workspaceId && product.workspaceId !== where.workspaceId) return false
        if (where.id?.in && !where.id.in.includes(product.id)) return false
        return true
      })),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0
        products = products.map(product => {
          if (product.workspaceId === where.workspaceId && where.id?.in?.includes(product.id)) {
            count += 1
            return { ...product, disabledAt: data.disabledAt }
          }
          return product
        })
        return { count }
      }),
      findFirst: vi.fn(),
    },
    category: {
      findMany: vi.fn(async ({ where }: any) => categories.filter(category => {
        if (where.workspaceId && category.workspaceId !== where.workspaceId) return false
        if (where.id?.in && !where.id.in.includes(category.id)) return false
        return true
      })),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0
        categories = categories.map(category => {
          if (category.workspaceId === where.workspaceId && where.id?.in?.includes(category.id)) {
            count += 1
            return { ...category, disabledAt: data.disabledAt }
          }
          return category
        })
        return { count }
      }),
    },
    warehouse: {
      findMany: vi.fn(async ({ where }: any) => warehouses.filter(warehouse => {
        if (where.workspaceId && warehouse.workspaceId !== where.workspaceId) return false
        if (where.id?.in && !where.id.in.includes(warehouse.id)) return false
        return true
      })),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0
        warehouses = warehouses.map(warehouse => {
          if (warehouse.workspaceId === where.workspaceId && where.id?.in?.includes(warehouse.id)) {
            count += 1
            return { ...warehouse, disabledAt: data.disabledAt }
          }
          return warehouse
        })
        return { count }
      }),
      findFirst: vi.fn(),
    },
    supplier: {
      findMany: vi.fn(async ({ where }: any) => suppliers.filter(supplier => {
        if (where.workspaceId && supplier.workspaceId !== where.workspaceId) return false
        if (where.id?.in && !where.id.in.includes(supplier.id)) return false
        return true
      })),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0
        suppliers = suppliers.map(supplier => {
          if (supplier.workspaceId === where.workspaceId && where.id?.in?.includes(supplier.id)) {
            count += 1
            return { ...supplier, disabledAt: data.disabledAt }
          }
          return supplier
        })
        return { count }
      }),
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(async () => undefined),
    },
  }

  async function buildApp() {
    const app = Fastify()
    app.decorate('prisma', prisma as any)
    await app.register(inventoryRoutes, { prefix: '/api' })
    await app.register(supplierRoutes, { prefix: '/api' })
    return app
  }

  beforeEach(() => {
    products = [
      { id: 'product-1', workspaceId: 'workspace-1', disabledAt: null },
      { id: 'product-2', workspaceId: 'workspace-1', disabledAt: null },
    ]
    categories = [
      { id: 'cat-1', workspaceId: 'workspace-1', disabledAt: new Date('2026-05-01T00:00:00.000Z') },
      { id: 'cat-2', workspaceId: 'workspace-1', disabledAt: new Date('2026-05-01T00:00:00.000Z') },
    ]
    warehouses = [
      { id: 'wh-1', workspaceId: 'workspace-1', disabledAt: null, isDefault: false },
      { id: 'wh-2', workspaceId: 'workspace-1', disabledAt: null, isDefault: true },
    ]
    suppliers = [
      { id: 'sup-1', workspaceId: 'workspace-1', disabledAt: null },
      { id: 'sup-2', workspaceId: 'workspace-1', disabledAt: null },
    ]
    vi.clearAllMocks()
  })

  it('bulk archives products and keeps audit history', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/products/bulk-archive',
        payload: { ids: ['product-1', 'product-2'] },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({ ok: true, count: 2 })
      expect(products.every(product => product.disabledAt !== null)).toBe(true)
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          action: 'product.bulk_archived',
          entityType: 'product',
        }),
      }))
    } finally {
      await app.close()
    }
  })

  it('bulk restores archived categories', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/categories/bulk-restore',
        payload: { ids: ['cat-1', 'cat-2'] },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({ ok: true, count: 2 })
      expect(categories.every(category => category.disabledAt === null)).toBe(true)
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          action: 'category.bulk_restored',
          entityType: 'category',
        }),
      }))
    } finally {
      await app.close()
    }
  })

  it('rejects bulk archiving a default warehouse', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/warehouses/bulk-archive',
        payload: { ids: ['wh-1', 'wh-2'] },
      })

      expect(response.statusCode).toBe(409)
      expect(response.json()).toMatchObject({ code: 'conflict' })
      expect(prisma.warehouse.updateMany).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('bulk archives suppliers', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/suppliers/bulk-archive',
        payload: { ids: ['sup-1', 'sup-2'] },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({ ok: true, count: 2 })
      expect(suppliers.every(supplier => supplier.disabledAt !== null)).toBe(true)
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          action: 'supplier.bulk_archived',
          entityType: 'supplier',
        }),
      }))
    } finally {
      await app.close()
    }
  })
})
