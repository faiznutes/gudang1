import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AppError } from '../lib/errors.js'
import { categoryDto, inventoryDto, productDto, stockMovementDto, warehouseDto } from '../lib/mappers.js'
import { getEntitlements } from '../lib/plans.js'
import { requireActiveSession, requireAuth, requireFeature } from '../middleware/auth.js'
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
  const product = await app.prisma.product.findFirst({ where: { id: productId, workspaceId, disabledAt: null } })
  if (!product) throw new AppError('not_found', 'Produk tidak ditemukan')
  return product
}

async function ensureWorkspaceWarehouse(app: FastifyInstance, workspaceId: string, warehouseId: string) {
  const warehouse = await app.prisma.warehouse.findFirst({ where: { id: warehouseId, workspaceId, disabledAt: null } })
  if (!warehouse) throw new AppError('not_found', 'Gudang tidak ditemukan')
  return warehouse
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
    requireActiveSession(ctx)
    const body = productSchema.parse(request.body)
    const entitlements = await getEntitlements(app, ctx.workspaceId)
    if (entitlements.usage.products >= entitlements.limits.products) {
      throw new AppError('feature_locked', 'Limit produk pada paket ini sudah tercapai')
    }

    return runIdempotent(app, ctx, idempotencyKey(request), 'product.create', body, async () => {
      const category = await app.prisma.category.findFirst({ where: { id: body.category_id, workspaceId: ctx.workspaceId } })
      if (!category) throw new AppError('not_found', 'Kategori tidak ditemukan')

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
    requireActiveSession(ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const body = productUpdateSchema.parse(request.body)
    await ensureWorkspaceProduct(app, ctx.workspaceId, params.id)
    if (body.category_id) {
      const category = await app.prisma.category.findFirst({ where: { id: body.category_id, workspaceId: ctx.workspaceId } })
      if (!category) throw new AppError('not_found', 'Kategori tidak ditemukan')
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
    requireActiveSession(ctx)
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

  app.get('/categories', async (request) => {
    const ctx = await requireAuth(app, request)
    requireActiveSession(ctx)
    const categories = await app.prisma.category.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { name: 'asc' },
    })
    return categories.map(categoryDto)
  })

  app.post('/categories', async (request) => {
    const ctx = await requireAuth(app, request)
    const body = categorySchema.parse(request.body)
    const category = await app.prisma.category.create({
      data: { workspaceId: ctx.workspaceId, name: body.name, description: body.description },
    })
    await writeAuditLog(app, ctx, request, {
      action: 'category.created',
      entityType: 'category',
      entityId: category.id,
      metadata: body,
    })
    return categoryDto(category)
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
    requireActiveSession(ctx)
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
    requireActiveSession(ctx)
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
    requireActiveSession(ctx)
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
    requireActiveSession(ctx)
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
    requireActiveSession(ctx)
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
    requireActiveSession(ctx)
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
