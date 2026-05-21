import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AppError } from '../lib/errors.js'
import { categoryDto, inventoryDto, productDto, stockMovementDto, warehouseDto } from '../lib/mappers.js'
import { getEntitlements } from '../lib/plans.js'
import { requireActiveSession, requireAuth, requireFeature, requireTenantRole } from '../middleware/auth.js'
import { runIdempotent } from '../lib/idempotency.js'
import { writeAuditLog } from '../lib/audit.js'

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category_id: z.string().min(1),
  min_stock: z.coerce.number().int().min(0).default(0),
  price: z.coerce.number().int().min(0).default(0),
})

const productUpdateSchema = productSchema.partial()

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

const categoryQuerySchema = z.object({
  status: z.enum(['active', 'archived', 'all']).default('all'),
})

const categoryMergeSchema = z.object({
  target_category_id: z.string().min(1),
})

const bulkIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

const warehouseSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  is_default: z.boolean().optional(),
})

const stockSchema = z.object({
  product_id: z.string().min(1),
  warehouse_id: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  notes: z.string().optional(),
})

const transferSchema = stockSchema.extend({
  to_warehouse_id: z.string().min(1),
})

function idempotencyKey(request: any) {
  const value = request.headers['idempotency-key']
  return Array.isArray(value) ? value[0] : value
}

async function ensureWorkspaceProduct(app: FastifyInstance, workspaceId: string, productId: string) {
  const product = await app.prisma.product.findFirst({ where: { id: productId, workspaceId, disabledAt: null }, include: { category: true } })
  if (!product) throw new AppError('not_found', 'Produk tidak ditemukan')
  return product
}

async function ensureWorkspaceProductIncludingDisabled(app: FastifyInstance, workspaceId: string, productId: string) {
  const product = await app.prisma.product.findFirst({ where: { id: productId, workspaceId }, include: { category: true } })
  if (!product) throw new AppError('not_found', 'Produk tidak ditemukan')
  return product
}

async function ensureWorkspaceCategory(app: FastifyInstance, workspaceId: string, categoryId: string) {
  const category = await app.prisma.category.findFirst({ where: { id: categoryId, workspaceId } })
  if (!category) throw new AppError('not_found', 'Kategori tidak ditemukan')
  return category
}

async function ensureWorkspaceWarehouse(app: FastifyInstance, workspaceId: string, warehouseId: string) {
  const warehouse = await app.prisma.warehouse.findFirst({ where: { id: warehouseId, workspaceId, disabledAt: null } })
  if (!warehouse) throw new AppError('not_found', 'Gudang tidak ditemukan')
  return warehouse
}

async function ensureWorkspaceWarehouseIncludingDisabled(app: FastifyInstance, workspaceId: string, warehouseId: string) {
  const warehouse = await app.prisma.warehouse.findFirst({ where: { id: warehouseId, workspaceId } })
  if (!warehouse) throw new AppError('not_found', 'Gudang tidak ditemukan')
  return warehouse
}

async function bulkSetProductDisabledAt(app: FastifyInstance, workspaceId: string, ids: string[], disabledAt: Date | null) {
  const products = await app.prisma.product.findMany({
    where: { workspaceId, id: { in: ids } },
    select: { id: true, disabledAt: true },
  })
  if (products.length !== ids.length) {
    throw new AppError('not_found', 'Sebagian produk tidak ditemukan')
  }
  return app.prisma.product.updateMany({
    where: { workspaceId, id: { in: ids } },
    data: { disabledAt },
  })
}

async function bulkSetCategoryDisabledAt(app: FastifyInstance, workspaceId: string, ids: string[], disabledAt: Date | null) {
  const categories = await app.prisma.category.findMany({
    where: { workspaceId, id: { in: ids } },
    select: { id: true, disabledAt: true },
  })
  if (categories.length !== ids.length) {
    throw new AppError('not_found', 'Sebagian kategori tidak ditemukan')
  }
  return app.prisma.category.updateMany({
    where: { workspaceId, id: { in: ids } },
    data: { disabledAt },
  })
}

async function bulkSetWarehouseDisabledAt(app: FastifyInstance, workspaceId: string, ids: string[], disabledAt: Date | null) {
  const warehouses = await app.prisma.warehouse.findMany({
    where: { workspaceId, id: { in: ids } },
    select: { id: true, isDefault: true },
  })
  if (warehouses.length !== ids.length) {
    throw new AppError('not_found', 'Sebagian gudang tidak ditemukan')
  }
  if (disabledAt && warehouses.some(warehouse => warehouse.isDefault)) {
    throw new AppError('conflict', 'Gudang utama tidak bisa diarsipkan')
  }
  return app.prisma.warehouse.updateMany({
    where: { workspaceId, id: { in: ids } },
    data: { disabledAt },
  })
}

async function bulkSetSupplierDisabledAt(app: FastifyInstance, workspaceId: string, ids: string[], disabledAt: Date | null) {
  const suppliers = await app.prisma.supplier.findMany({
    where: { workspaceId, id: { in: ids } },
    select: { id: true },
  })
  if (suppliers.length !== ids.length) {
    throw new AppError('not_found', 'Sebagian supplier tidak ditemukan')
  }
  return app.prisma.supplier.updateMany({
    where: { workspaceId, id: { in: ids } },
    data: { disabledAt },
  })
}

export async function inventoryRoutes(app: FastifyInstance) {
  app.get('/products', async (request) => {
    const ctx = await requireAuth(app, request)
    const products = await app.prisma.product.findMany({
      where: { workspaceId: ctx.workspaceId, disabledAt: null },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })
    return products.map(productDto)
  })

  app.get('/products/low-stock', async (request) => {
    const ctx = await requireAuth(app, request)
    const products = await app.prisma.product.findMany({
      where: { workspaceId: ctx.workspaceId, disabledAt: null },
      include: { category: true, inventoryItems: true },
    })
    return products
      .filter((product) => product.inventoryItems.some((item) => item.quantity <= product.minStock))
      .map(productDto)
  })

  app.get('/products/:id', async (request) => {
    const ctx = await requireAuth(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const product = await app.prisma.product.findFirst({
      where: { id: params.id, workspaceId: ctx.workspaceId, disabledAt: null },
      include: { category: true },
    })
    if (!product) throw new AppError('not_found', 'Produk tidak ditemukan')
    return productDto(product)
  })

  app.post('/products', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const body = productSchema.parse(request.body)
    const entitlements = await getEntitlements(app, ctx.workspaceId)
    if (entitlements.usage.products >= entitlements.limits.products) {
      throw new AppError('feature_locked', 'Limit produk pada paket ini sudah tercapai')
    }

    return runIdempotent(app, ctx, idempotencyKey(request), 'product.create', body, async () => {
      const category = await ensureWorkspaceCategory(app, ctx.workspaceId, body.category_id)
      if (category.disabledAt) throw new AppError('feature_locked', 'Kategori nonaktif tidak bisa dipakai untuk produk baru')

      const product = await app.prisma.product.create({
        data: {
          workspaceId: ctx.workspaceId,
          sku: body.sku,
          name: body.name,
          description: body.description,
          categoryId: body.category_id,
          minStock: body.min_stock,
          price: body.price,
        },
        include: { category: true },
      })
      await writeAuditLog(app, ctx, request, {
        action: 'product.created',
        entityType: 'product',
        entityId: product.id,
        metadata: body,
      })
      return productDto(product)
    })
  })

  app.put('/products/:id', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const body = productUpdateSchema.parse(request.body)
    const currentProduct = await ensureWorkspaceProduct(app, ctx.workspaceId, params.id)
    if (body.category_id) {
      const category = await ensureWorkspaceCategory(app, ctx.workspaceId, body.category_id)
      if (category.disabledAt && category.id !== currentProduct.categoryId) {
        throw new AppError('feature_locked', 'Kategori nonaktif tidak bisa dipilih untuk produk baru')
      }
    }

    const product = await app.prisma.product.update({
      where: { id: params.id },
      data: {
        sku: body.sku,
        name: body.name,
        description: body.description,
        categoryId: body.category_id,
        minStock: body.min_stock,
        price: body.price,
      },
      include: { category: true },
    })
    await writeAuditLog(app, ctx, request, {
      action: 'product.updated',
      entityType: 'product',
      entityId: product.id,
      metadata: body,
    })
    return productDto(product)
  })

  app.delete('/products/:id', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    await ensureWorkspaceProduct(app, ctx.workspaceId, params.id)
    await app.prisma.product.update({ where: { id: params.id }, data: { disabledAt: new Date() } })
    await writeAuditLog(app, ctx, request, {
      action: 'product.disabled',
      entityType: 'product',
      entityId: params.id,
    })
    return { ok: true }
  })

  app.post('/products/:id/archive', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    await ensureWorkspaceProduct(app, ctx.workspaceId, params.id)
    const product = await app.prisma.product.update({
      where: { id: params.id },
      data: { disabledAt: new Date() },
      include: { category: true },
    })
    await writeAuditLog(app, ctx, request, {
      action: 'product.archived',
      entityType: 'product',
      entityId: product.id,
    })
    return productDto(product)
  })

  app.post('/products/:id/restore', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const product = await ensureWorkspaceProductIncludingDisabled(app, ctx.workspaceId, params.id)
    const restored = await app.prisma.product.update({
      where: { id: product.id },
      data: { disabledAt: null },
      include: { category: true },
    })
    await writeAuditLog(app, ctx, request, {
      action: 'product.restored',
      entityType: 'product',
      entityId: restored.id,
    })
    return productDto(restored)
  })

  app.post('/products/bulk-archive', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const body = bulkIdsSchema.parse(request.body)
    const result = await bulkSetProductDisabledAt(app, ctx.workspaceId, body.ids, new Date())
    await writeAuditLog(app, ctx, request, {
      action: 'product.bulk_archived',
      entityType: 'product',
      metadata: {
        ids: body.ids,
        count: result.count,
      },
    })
    return { ok: true, count: result.count }
  })

  app.post('/products/bulk-restore', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const body = bulkIdsSchema.parse(request.body)
    const result = await bulkSetProductDisabledAt(app, ctx.workspaceId, body.ids, null)
    await writeAuditLog(app, ctx, request, {
      action: 'product.bulk_restored',
      entityType: 'product',
      metadata: {
        ids: body.ids,
        count: result.count,
      },
    })
    return { ok: true, count: result.count }
  })

  app.get('/categories', async (request) => {
    const ctx = await requireAuth(app, request)
    const query = categoryQuerySchema.parse(request.query)
    const categories = await app.prisma.category.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        ...(query.status === 'active' ? { disabledAt: null } : {}),
        ...(query.status === 'archived' ? { disabledAt: { not: null } } : {}),
      },
      orderBy: { name: 'asc' },
    })
    return categories.map(categoryDto)
  })

  app.post('/categories', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const body = categorySchema.parse(request.body)
    const existing = await app.prisma.category.findFirst({
      where: { workspaceId: ctx.workspaceId, name: body.name },
    })
    if (existing && !existing.disabledAt) {
      throw new AppError('conflict', 'Kategori dengan nama ini sudah ada')
    }

    const category = existing
      ? await app.prisma.category.update({
          where: { id: existing.id },
          data: {
            description: body.description,
            disabledAt: null,
          },
        })
      : await app.prisma.category.create({
          data: { workspaceId: ctx.workspaceId, name: body.name, description: body.description },
        })
    await writeAuditLog(app, ctx, request, {
      action: existing ? 'category.restored' : 'category.created',
      entityType: 'category',
      entityId: category.id,
      metadata: body,
    })
    return categoryDto(category)
  })

  app.put('/categories/:id', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const body = categorySchema.parse(request.body)
    const current = await ensureWorkspaceCategory(app, ctx.workspaceId, params.id)
    const duplicate = await app.prisma.category.findFirst({
      where: {
        workspaceId: ctx.workspaceId,
        name: body.name,
        id: { not: params.id },
      },
    })
    if (duplicate) {
      throw new AppError('conflict', 'Kategori dengan nama ini sudah ada')
    }
    const category = await app.prisma.category.update({
      where: { id: current.id },
      data: { name: body.name, description: body.description },
    })
    await writeAuditLog(app, ctx, request, {
      action: 'category.updated',
      entityType: 'category',
      entityId: category.id,
      metadata: body,
    })
    return categoryDto(category)
  })

  app.post('/categories/:id/archive', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const category = await ensureWorkspaceCategory(app, ctx.workspaceId, params.id)
    const archived = await app.prisma.category.update({
      where: { id: category.id },
      data: { disabledAt: new Date() },
    })
    await writeAuditLog(app, ctx, request, {
      action: 'category.archived',
      entityType: 'category',
      entityId: archived.id,
    })
    return categoryDto(archived)
  })

  app.post('/categories/:id/restore', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const category = await ensureWorkspaceCategory(app, ctx.workspaceId, params.id)
    const restored = await app.prisma.category.update({
      where: { id: category.id },
      data: { disabledAt: null },
    })
    await writeAuditLog(app, ctx, request, {
      action: 'category.restored',
      entityType: 'category',
      entityId: restored.id,
    })
    return categoryDto(restored)
  })

  app.post('/categories/:id/merge', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const body = categoryMergeSchema.parse(request.body)
    if (params.id === body.target_category_id) {
      throw new AppError('validation_error', 'Kategori sumber dan tujuan harus berbeda')
    }

    const source = await ensureWorkspaceCategory(app, ctx.workspaceId, params.id)
    const target = await ensureWorkspaceCategory(app, ctx.workspaceId, body.target_category_id)
    if (target.disabledAt) {
      throw new AppError('feature_locked', 'Kategori tujuan harus aktif')
    }

    const result = await app.prisma.$transaction(async (tx) => {
      const movedProducts = await tx.product.updateMany({
        where: { workspaceId: ctx.workspaceId, categoryId: source.id, disabledAt: null },
        data: { categoryId: target.id },
      })
      const merged = await tx.category.update({
        where: { id: source.id },
        data: { disabledAt: new Date() },
      })
      await tx.auditLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: 'category.merged',
          entityType: 'category',
          entityId: merged.id,
          metadata: {
            source_category_id: source.id,
            target_category_id: target.id,
            moved_products: movedProducts.count,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      })
      return merged
    })

    return categoryDto(result)
  })

  app.post('/categories/bulk-archive', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const body = bulkIdsSchema.parse(request.body)
    const result = await bulkSetCategoryDisabledAt(app, ctx.workspaceId, body.ids, new Date())
    await writeAuditLog(app, ctx, request, {
      action: 'category.bulk_archived',
      entityType: 'category',
      metadata: {
        ids: body.ids,
        count: result.count,
      },
    })
    return { ok: true, count: result.count }
  })

  app.post('/categories/bulk-restore', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const body = bulkIdsSchema.parse(request.body)
    const result = await bulkSetCategoryDisabledAt(app, ctx.workspaceId, body.ids, null)
    await writeAuditLog(app, ctx, request, {
      action: 'category.bulk_restored',
      entityType: 'category',
      metadata: {
        ids: body.ids,
        count: result.count,
      },
    })
    return { ok: true, count: result.count }
  })

  app.get('/warehouses', async (request) => {
    const ctx = await requireAuth(app, request)
    const warehouses = await app.prisma.warehouse.findMany({
      where: { workspaceId: ctx.workspaceId, disabledAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    return warehouses.map(warehouseDto)
  })

  app.get('/warehouses/:id', async (request) => {
    const ctx = await requireAuth(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const warehouse = await app.prisma.warehouse.findFirst({ where: { id: params.id, workspaceId: ctx.workspaceId, disabledAt: null } })
    if (!warehouse) throw new AppError('not_found', 'Gudang tidak ditemukan')
    return warehouseDto(warehouse)
  })

  app.post('/warehouses', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const body = warehouseSchema.parse(request.body)
    const entitlements = await getEntitlements(app, ctx.workspaceId)
    if (entitlements.usage.warehouses >= entitlements.limits.warehouses) {
      throw new AppError('feature_locked', 'Limit gudang pada paket ini sudah tercapai')
    }
    if (entitlements.usage.warehouses > 0 && !entitlements.features.multiWarehouse) {
      throw new AppError('feature_locked', 'Multi gudang tersedia mulai paket Growth')
    }

    return runIdempotent(app, ctx, idempotencyKey(request), 'warehouse.create', body, async () => {
      const count = await app.prisma.warehouse.count({ where: { workspaceId: ctx.workspaceId } })
      if (body.is_default || count === 0) {
        await app.prisma.warehouse.updateMany({ where: { workspaceId: ctx.workspaceId }, data: { isDefault: false } })
      }
      const warehouse = await app.prisma.warehouse.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: body.name,
          address: body.address,
          isDefault: body.is_default ?? count === 0,
        },
      })
      await writeAuditLog(app, ctx, request, {
        action: 'warehouse.created',
        entityType: 'warehouse',
        entityId: warehouse.id,
        metadata: body,
      })
      return warehouseDto(warehouse)
    })
  })

  app.put('/warehouses/:id', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const body = warehouseSchema.partial().parse(request.body)
    await ensureWorkspaceWarehouse(app, ctx.workspaceId, params.id)
    if (body.is_default) {
      await app.prisma.warehouse.updateMany({ where: { workspaceId: ctx.workspaceId }, data: { isDefault: false } })
    }
    const warehouse = await app.prisma.warehouse.update({
      where: { id: params.id },
      data: { name: body.name, address: body.address, isDefault: body.is_default },
    })
    await writeAuditLog(app, ctx, request, {
      action: 'warehouse.updated',
      entityType: 'warehouse',
      entityId: warehouse.id,
      metadata: body,
    })
    return warehouseDto(warehouse)
  })

  app.delete('/warehouses/:id', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const warehouse = await ensureWorkspaceWarehouse(app, ctx.workspaceId, params.id)
    if (warehouse.isDefault) {
      throw new AppError('conflict', 'Gudang utama tidak bisa dihapus')
    }
    await app.prisma.warehouse.update({ where: { id: params.id }, data: { disabledAt: new Date() } })
    await writeAuditLog(app, ctx, request, {
      action: 'warehouse.disabled',
      entityType: 'warehouse',
      entityId: params.id,
    })
    return { ok: true }
  })

  app.post('/warehouses/:id/archive', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const warehouse = await ensureWorkspaceWarehouse(app, ctx.workspaceId, params.id)
    if (warehouse.isDefault) {
      throw new AppError('conflict', 'Gudang utama tidak bisa diarsipkan')
    }
    const archived = await app.prisma.warehouse.update({ where: { id: params.id }, data: { disabledAt: new Date() } })
    await writeAuditLog(app, ctx, request, {
      action: 'warehouse.archived',
      entityType: 'warehouse',
      entityId: archived.id,
    })
    return warehouseDto(archived)
  })

  app.post('/warehouses/:id/restore', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const warehouse = await ensureWorkspaceWarehouseIncludingDisabled(app, ctx.workspaceId, params.id)
    const restored = await app.prisma.warehouse.update({ where: { id: params.id }, data: { disabledAt: null } })
    await writeAuditLog(app, ctx, request, {
      action: 'warehouse.restored',
      entityType: 'warehouse',
      entityId: restored.id,
    })
    return warehouseDto(restored)
  })

  app.post('/warehouses/bulk-archive', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const body = bulkIdsSchema.parse(request.body)
    const result = await bulkSetWarehouseDisabledAt(app, ctx.workspaceId, body.ids, new Date())
    await writeAuditLog(app, ctx, request, {
      action: 'warehouse.bulk_archived',
      entityType: 'warehouse',
      metadata: {
        ids: body.ids,
        count: result.count,
      },
    })
    return { ok: true, count: result.count }
  })

  app.post('/warehouses/bulk-restore', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const body = bulkIdsSchema.parse(request.body)
    const result = await bulkSetWarehouseDisabledAt(app, ctx.workspaceId, body.ids, null)
    await writeAuditLog(app, ctx, request, {
      action: 'warehouse.bulk_restored',
      entityType: 'warehouse',
      metadata: {
        ids: body.ids,
        count: result.count,
      },
    })
    return { ok: true, count: result.count }
  })

  app.get('/inventory', async (request) => {
    const ctx = await requireAuth(app, request)
    const query = z.object({ warehouse_id: z.string().optional() }).parse(request.query)
    const items = await app.prisma.inventoryItem.findMany({
      where: { workspaceId: ctx.workspaceId, ...(query.warehouse_id ? { warehouseId: query.warehouse_id } : {}), product: { disabledAt: null }, warehouse: { disabledAt: null } },
      include: { product: { include: { category: true } }, warehouse: true },
      orderBy: { updatedAt: 'desc' },
    })
    return items.map(inventoryDto)
  })

  app.post('/stock-in', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    await requireFeature(app, ctx, 'stockInOut')
    const body = stockSchema.parse(request.body)
    await ensureWorkspaceProduct(app, ctx.workspaceId, body.product_id)
    await ensureWorkspaceWarehouse(app, ctx.workspaceId, body.warehouse_id)

    return runIdempotent(app, ctx, idempotencyKey(request), 'stock.in', body, async () => {
      const result = await app.prisma.$transaction(async (tx) => {
        const item = await tx.inventoryItem.upsert({
          where: { productId_warehouseId: { productId: body.product_id, warehouseId: body.warehouse_id } },
          update: { quantity: { increment: body.quantity } },
          create: {
            workspaceId: ctx.workspaceId,
            productId: body.product_id,
            warehouseId: body.warehouse_id,
            quantity: body.quantity,
          },
          include: { product: { include: { category: true } }, warehouse: true },
        })

        await tx.stockMovement.create({
          data: {
            workspaceId: ctx.workspaceId,
            productId: body.product_id,
            warehouseId: body.warehouse_id,
            type: 'in',
            quantity: body.quantity,
            notes: body.notes,
            userId: ctx.userId,
          },
        })

        await tx.auditLog.create({
          data: {
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            action: 'stock.in',
            entityType: 'inventory_item',
            entityId: item.id,
            metadata: body,
          },
        })

        return item
      })
      return inventoryDto(result)
    })
  })

  app.post('/stock-out', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    await requireFeature(app, ctx, 'stockInOut')
    const body = stockSchema.parse(request.body)
    await ensureWorkspaceProduct(app, ctx.workspaceId, body.product_id)
    await ensureWorkspaceWarehouse(app, ctx.workspaceId, body.warehouse_id)

    return runIdempotent(app, ctx, idempotencyKey(request), 'stock.out', body, async () => {
      const result = await app.prisma.$transaction(async (tx) => {
        const updated = await tx.inventoryItem.updateMany({
          where: {
            workspaceId: ctx.workspaceId,
            productId: body.product_id,
            warehouseId: body.warehouse_id,
            quantity: { gte: body.quantity },
          },
          data: { quantity: { decrement: body.quantity } },
        })

        if (updated.count === 0) {
          throw new AppError('conflict', 'Stok tidak cukup untuk transaksi ini')
        }

        const item = await tx.inventoryItem.findUniqueOrThrow({
          where: { productId_warehouseId: { productId: body.product_id, warehouseId: body.warehouse_id } },
          include: { product: { include: { category: true } }, warehouse: true },
        })

        await tx.stockMovement.create({
          data: {
            workspaceId: ctx.workspaceId,
            productId: body.product_id,
            warehouseId: body.warehouse_id,
            type: 'out',
            quantity: body.quantity,
            notes: body.notes,
            userId: ctx.userId,
          },
        })

        await tx.auditLog.create({
          data: {
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            action: 'stock.out',
            entityType: 'inventory_item',
            entityId: item.id,
            metadata: body,
          },
        })

        return item
      })
      return inventoryDto(result)
    })
  })

  app.post('/stock-transfer', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    await requireFeature(app, ctx, 'stockInOut')
    await requireFeature(app, ctx, 'multiWarehouse')
    const body = transferSchema.parse(request.body)
    if (body.warehouse_id === body.to_warehouse_id) {
      throw new AppError('validation_error', 'Gudang asal dan tujuan harus berbeda')
    }
    await ensureWorkspaceProduct(app, ctx.workspaceId, body.product_id)
    await ensureWorkspaceWarehouse(app, ctx.workspaceId, body.warehouse_id)
    await ensureWorkspaceWarehouse(app, ctx.workspaceId, body.to_warehouse_id)

    return runIdempotent(app, ctx, idempotencyKey(request), 'stock.transfer', body, async () => {
      const movement = await app.prisma.$transaction(async (tx) => {
        const source = await tx.inventoryItem.updateMany({
          where: {
            workspaceId: ctx.workspaceId,
            productId: body.product_id,
            warehouseId: body.warehouse_id,
            quantity: { gte: body.quantity },
          },
          data: { quantity: { decrement: body.quantity } },
        })
        if (source.count === 0) throw new AppError('conflict', 'Stok tidak cukup untuk transfer')

        await tx.inventoryItem.upsert({
          where: { productId_warehouseId: { productId: body.product_id, warehouseId: body.to_warehouse_id } },
          update: { quantity: { increment: body.quantity } },
          create: {
            workspaceId: ctx.workspaceId,
            productId: body.product_id,
            warehouseId: body.to_warehouse_id,
            quantity: body.quantity,
          },
        })

        return tx.stockMovement.create({
          data: {
            workspaceId: ctx.workspaceId,
            productId: body.product_id,
            warehouseId: body.warehouse_id,
            toWarehouseId: body.to_warehouse_id,
            type: 'transfer',
            quantity: body.quantity,
            notes: body.notes,
            userId: ctx.userId,
          },
          include: { product: true, warehouse: true, toWarehouse: true, user: true },
        })
      })
      return stockMovementDto(movement)
    })
  })
}
