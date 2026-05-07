import type { FastifyInstance, FastifyRequest } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { AppError } from '../lib/errors.js'
import { inventoryDto, productDto, stockMovementDto, supplierDto, userDto, warehouseDto } from '../lib/mappers.js'
import { requireAuth, requirePlatformRole } from '../middleware/auth.js'
import { getEntitlements } from '../lib/plans.js'

const tenantRoleSchema = z.enum(['admin', 'staff', 'supplier', 'trial'])
const supplierSchema = z.object({
  name: z.string().min(1),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
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

async function requirePlatformAdmin(app: FastifyInstance, request: any) {
  const ctx = await requireAuth(app, request)
  requirePlatformRole(ctx, ['super_admin'])
  return ctx
}

async function ensureWorkspace(app: FastifyInstance, workspaceId: string) {
  const workspace = await app.prisma.workspace.findUnique({ where: { id: workspaceId } })
  if (!workspace) throw new AppError('not_found', 'Tenant tidak ditemukan')
  return workspace
}

async function ensureCategory(app: FastifyInstance, workspaceId: string, name?: string) {
  const categoryName = name?.trim() || 'Umum'
  return app.prisma.category.upsert({
    where: { workspaceId_name: { workspaceId, name: categoryName } },
    update: {},
    create: { workspaceId, name: categoryName },
  })
}

async function ensureTenantUserAvailable(app: FastifyInstance, email: string, workspaceId: string) {
  const existing = await app.prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { memberships: true },
  })
  if (!existing) return null
  if (existing.role === 'super_admin') {
    throw new AppError('conflict', 'Email super admin tidak boleh digunakan sebagai user tenant')
  }
  const otherTenantMembership = existing.memberships.find(member => member.workspaceId !== workspaceId)
  if (otherTenantMembership) {
    throw new AppError('conflict', 'Email ini sudah terhubung ke tenant lain')
  }
  return existing
}

async function ensureWorkspaceProduct(app: FastifyInstance, workspaceId: string, productId: string) {
  const product = await app.prisma.product.findFirst({ where: { id: productId, workspaceId } })
  if (!product) throw new AppError('not_found', 'Produk tenant tidak ditemukan')
  return product
}

async function ensureWorkspaceWarehouse(app: FastifyInstance, workspaceId: string, warehouseId: string) {
  const warehouse = await app.prisma.warehouse.findFirst({ where: { id: warehouseId, workspaceId } })
  if (!warehouse) throw new AppError('not_found', 'Gudang tenant tidak ditemukan')
  return warehouse
}

async function ensureWorkspaceSupplier(app: FastifyInstance, workspaceId: string, supplierId: string) {
  const supplier = await app.prisma.supplier.findFirst({ where: { id: supplierId, workspaceId } })
  if (!supplier) throw new AppError('not_found', 'Supplier tenant tidak ditemukan')
  return supplier
}

async function ensureWorkspaceActivity(app: FastifyInstance, workspaceId: string, activityId: string) {
  const activity = await app.prisma.scheduledActivity.findFirst({ where: { id: activityId, workspaceId } })
  if (!activity) throw new AppError('not_found', 'Aktivitas tenant tidak ditemukan')
  return activity
}

async function writeTenantAuditLog(
  app: FastifyInstance,
  ctx: { userId: string },
  request: FastifyRequest,
  workspaceId: string,
  input: {
    action: string
    entityType: string
    entityId?: string | null
    metadata?: unknown
  },
) {
  return app.prisma.auditLog.create({
    data: {
      workspaceId,
      userId: ctx.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata === undefined ? undefined : input.metadata as any,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    },
  })
}

function scheduledActivityDto(activity: {
  id: string
  workspaceId: string
  title: string
  type: string
  status: string
  description: string | null
  dueAt: Date | null
  disabledAt: Date | null
  createdById: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: activity.id,
    workspace_id: activity.workspaceId,
    title: activity.title,
    type: activity.type,
    status: activity.status,
    description: activity.description ?? undefined,
    due_at: activity.dueAt?.toISOString() ?? null,
    disabled_at: activity.disabledAt?.toISOString() ?? null,
    created_by_id: activity.createdById ?? undefined,
    created_at: activity.createdAt.toISOString(),
    updated_at: activity.updatedAt.toISOString(),
  }
}

export async function adminManagementRoutes(app: FastifyInstance) {
  app.post('/workspaces/:workspaceId/users', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const body = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6).default('password123'),
      role: tenantRoleSchema.default('staff'),
    }).parse(request.body)
    await ensureWorkspace(app, params.workspaceId)
    await ensureTenantUserAvailable(app, body.email, params.workspaceId)
    const entitlements = await getEntitlements(app, params.workspaceId)
    if (entitlements.usage.users >= entitlements.limits.users) {
      throw new AppError('feature_locked', `Limit user pada paket ${entitlements.plan} sudah tercapai`)
    }
    const passwordHash = await bcrypt.hash(body.password, 10)
    const result = await app.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email: body.email.toLowerCase() },
        update: { name: body.name, disabledAt: null },
        create: { name: body.name, email: body.email.toLowerCase(), passwordHash, role: body.role },
      })
      const member = await tx.workspaceMember.upsert({
        where: { userId_workspaceId: { userId: user.id, workspaceId: params.workspaceId } },
        update: { role: body.role },
        create: { userId: user.id, workspaceId: params.workspaceId, role: body.role },
        include: { user: true, workspace: true },
      })
      await tx.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          userId: ctx.userId,
          action: 'admin.user.created',
          entityType: 'user',
          entityId: user.id,
          metadata: { role: body.role },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      })
      return member
    })
    return {
      id: result.id,
      user_id: result.userId,
      workspace_id: result.workspaceId,
      role: result.role,
      user: userDto(result.user),
      workspace: {
        id: result.workspace.id,
        name: result.workspace.name,
        plan: result.workspace.plan,
        status: result.workspace.status,
        created_at: result.workspace.createdAt.toISOString(),
      },
      created_at: result.createdAt.toISOString(),
    }
  })

  app.put('/workspaces/:workspaceId/users/:userId/profile', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), userId: z.string() }).parse(request.params)
    const body = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      role: tenantRoleSchema.optional(),
    }).parse(request.body)
    await ensureWorkspace(app, params.workspaceId)
    if (body.email) {
      const existing = await ensureTenantUserAvailable(app, body.email, params.workspaceId)
      if (existing && existing.id !== params.userId) {
        throw new AppError('conflict', 'Email ini sudah digunakan user lain')
      }
    }
    const result = await app.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: params.userId },
        data: { name: body.name, email: body.email?.toLowerCase() },
      })
      if (body.role) {
        await tx.workspaceMember.update({
          where: { userId_workspaceId: { userId: params.userId, workspaceId: params.workspaceId } },
          data: { role: body.role },
        })
      }
      await tx.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          userId: ctx.userId,
          action: 'admin.user.updated',
          entityType: 'user',
          entityId: params.userId,
          metadata: body,
        },
      })
      return user
    })
    return userDto(result)
  })

  app.post('/workspaces/:workspaceId/users/:userId/disable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), userId: z.string() }).parse(request.params)
    const member = await app.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: params.userId, workspaceId: params.workspaceId } },
    })
    if (!member) throw new AppError('not_found', 'User tenant tidak ditemukan')
    const user = await app.prisma.user.update({ where: { id: params.userId }, data: { disabledAt: new Date() } })
    await app.prisma.auditLog.create({
      data: { workspaceId: params.workspaceId, userId: ctx.userId, action: 'admin.user.disabled', entityType: 'user', entityId: user.id },
    })
    return userDto(user)
  })

  app.post('/workspaces/:workspaceId/users/:userId/enable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), userId: z.string() }).parse(request.params)
    const member = await app.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: params.userId, workspaceId: params.workspaceId } },
    })
    if (!member) throw new AppError('not_found', 'User tenant tidak ditemukan')
    const user = await app.prisma.user.update({ where: { id: params.userId }, data: { disabledAt: null } })
    await app.prisma.auditLog.create({
      data: { workspaceId: params.workspaceId, userId: ctx.userId, action: 'admin.user.enabled', entityType: 'user', entityId: user.id },
    })
    return userDto(user)
  })

  app.get('/workspaces/:workspaceId/products', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    await ensureWorkspace(app, params.workspaceId)
    const products = await app.prisma.product.findMany({
      where: { workspaceId: params.workspaceId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })
    return products.map(productDto)
  })

  app.post('/workspaces/:workspaceId/products', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const body = z.object({
      sku: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      min_stock: z.coerce.number().int().min(0).default(0),
      price: z.coerce.number().int().min(0).default(0),
    }).parse(request.body)
    await ensureWorkspace(app, params.workspaceId)
    const entitlements = await getEntitlements(app, params.workspaceId)
    if (entitlements.usage.products >= entitlements.limits.products) {
      throw new AppError('feature_locked', `Limit produk pada paket ${entitlements.plan} sudah tercapai`)
    }
    const category = await ensureCategory(app, params.workspaceId, body.category)
    const product = await app.prisma.product.create({
      data: {
        workspaceId: params.workspaceId,
        sku: body.sku,
        name: body.name,
        description: body.description,
        categoryId: category.id,
        minStock: body.min_stock,
        price: body.price,
      },
      include: { category: true },
    })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.product.created', entityType: 'product', entityId: product.id, metadata: body })
    return productDto(product)
  })

  app.put('/workspaces/:workspaceId/products/:productId', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), productId: z.string() }).parse(request.params)
    const body = z.object({
      sku: z.string().min(1).optional(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      min_stock: z.coerce.number().int().min(0).optional(),
      price: z.coerce.number().int().min(0).optional(),
    }).parse(request.body)
    await ensureWorkspace(app, params.workspaceId)
    await ensureWorkspaceProduct(app, params.workspaceId, params.productId)
    const category = body.category ? await ensureCategory(app, params.workspaceId, body.category) : null
    const product = await app.prisma.product.update({
      where: { id: params.productId },
      data: {
        sku: body.sku,
        name: body.name,
        description: body.description,
        categoryId: category?.id,
        minStock: body.min_stock,
        price: body.price,
      },
      include: { category: true },
    })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.product.updated', entityType: 'product', entityId: product.id, metadata: body })
    return productDto(product)
  })

  app.post('/workspaces/:workspaceId/products/:productId/disable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), productId: z.string() }).parse(request.params)
    await ensureWorkspaceProduct(app, params.workspaceId, params.productId)
    const product = await app.prisma.product.update({
      where: { id: params.productId },
      data: { disabledAt: new Date() },
      include: { category: true },
    })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.product.disabled', entityType: 'product', entityId: product.id })
    return productDto(product)
  })

  app.post('/workspaces/:workspaceId/products/:productId/enable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), productId: z.string() }).parse(request.params)
    await ensureWorkspaceProduct(app, params.workspaceId, params.productId)
    const product = await app.prisma.product.update({
      where: { id: params.productId },
      data: { disabledAt: null },
      include: { category: true },
    })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.product.enabled', entityType: 'product', entityId: product.id })
    return productDto(product)
  })

  app.delete('/workspaces/:workspaceId/products/:productId', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), productId: z.string() }).parse(request.params)
    await ensureWorkspaceProduct(app, params.workspaceId, params.productId)
    const [inventoryCount, movementCount] = await Promise.all([
      app.prisma.inventoryItem.count({ where: { workspaceId: params.workspaceId, productId: params.productId } }),
      app.prisma.stockMovement.count({ where: { workspaceId: params.workspaceId, productId: params.productId } }),
    ])
    if (inventoryCount > 0 || movementCount > 0) {
      throw new AppError('conflict', 'Produk punya stok atau histori stok. Gunakan nonaktifkan agar histori tetap aman.')
    }
    try {
      await app.prisma.product.delete({ where: { id: params.productId } })
    } catch {
      throw new AppError('conflict', 'Produk punya histori stok. Gunakan nonaktifkan agar histori tetap aman.')
    }
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.product.removed', entityType: 'product', entityId: params.productId })
    return { ok: true }
  })

  app.get('/workspaces/:workspaceId/warehouses', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    await ensureWorkspace(app, params.workspaceId)
    const warehouses = await app.prisma.warehouse.findMany({ where: { workspaceId: params.workspaceId }, orderBy: { createdAt: 'desc' } })
    return warehouses.map(warehouseDto)
  })

  app.post('/workspaces/:workspaceId/warehouses', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const body = z.object({ name: z.string().min(1), address: z.string().optional(), is_default: z.boolean().optional() }).parse(request.body)
    const entitlements = await getEntitlements(app, params.workspaceId)
    if (entitlements.usage.warehouses >= entitlements.limits.warehouses) {
      throw new AppError('feature_locked', `Limit gudang pada paket ${entitlements.plan} sudah tercapai`)
    }
    if (entitlements.usage.warehouses > 0 && !entitlements.features.multiWarehouse) {
      throw new AppError('feature_locked', 'Multi gudang tersedia mulai paket Growth')
    }
    const count = await app.prisma.warehouse.count({ where: { workspaceId: params.workspaceId } })
    if (body.is_default || count === 0) {
      await app.prisma.warehouse.updateMany({ where: { workspaceId: params.workspaceId }, data: { isDefault: false } })
    }
    const warehouse = await app.prisma.warehouse.create({
      data: { workspaceId: params.workspaceId, name: body.name, address: body.address, isDefault: body.is_default ?? count === 0 },
    })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.warehouse.created', entityType: 'warehouse', entityId: warehouse.id, metadata: body })
    return warehouseDto(warehouse)
  })

  app.put('/workspaces/:workspaceId/warehouses/:warehouseId', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), warehouseId: z.string() }).parse(request.params)
    const body = z.object({ name: z.string().min(1).optional(), address: z.string().optional(), is_default: z.boolean().optional() }).parse(request.body)
    await ensureWorkspaceWarehouse(app, params.workspaceId, params.warehouseId)
    if (body.is_default) {
      await app.prisma.warehouse.updateMany({ where: { workspaceId: params.workspaceId }, data: { isDefault: false } })
    }
    const warehouse = await app.prisma.warehouse.update({
      where: { id: params.warehouseId },
      data: { name: body.name, address: body.address, isDefault: body.is_default },
    })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.warehouse.updated', entityType: 'warehouse', entityId: warehouse.id, metadata: body })
    return warehouseDto(warehouse)
  })

  app.post('/workspaces/:workspaceId/warehouses/:warehouseId/disable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), warehouseId: z.string() }).parse(request.params)
    await ensureWorkspaceWarehouse(app, params.workspaceId, params.warehouseId)
    const warehouse = await app.prisma.warehouse.update({ where: { id: params.warehouseId }, data: { disabledAt: new Date() } })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.warehouse.disabled', entityType: 'warehouse', entityId: warehouse.id })
    return warehouseDto(warehouse)
  })

  app.post('/workspaces/:workspaceId/warehouses/:warehouseId/enable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), warehouseId: z.string() }).parse(request.params)
    await ensureWorkspaceWarehouse(app, params.workspaceId, params.warehouseId)
    const warehouse = await app.prisma.warehouse.update({ where: { id: params.warehouseId }, data: { disabledAt: null } })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.warehouse.enabled', entityType: 'warehouse', entityId: warehouse.id })
    return warehouseDto(warehouse)
  })

  app.delete('/workspaces/:workspaceId/warehouses/:warehouseId', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), warehouseId: z.string() }).parse(request.params)
    await ensureWorkspaceWarehouse(app, params.workspaceId, params.warehouseId)
    const [inventoryCount, movementCount] = await Promise.all([
      app.prisma.inventoryItem.count({ where: { workspaceId: params.workspaceId, warehouseId: params.warehouseId } }),
      app.prisma.stockMovement.count({
        where: {
          workspaceId: params.workspaceId,
          OR: [{ warehouseId: params.warehouseId }, { toWarehouseId: params.warehouseId }],
        },
      }),
    ])
    if (inventoryCount > 0 || movementCount > 0) {
      throw new AppError('conflict', 'Gudang punya stok atau histori stok. Gunakan nonaktifkan agar histori tetap aman.')
    }
    try {
      await app.prisma.$transaction(async (tx) => {
        const warehouse = await tx.warehouse.delete({ where: { id: params.warehouseId } })
        if (warehouse.isDefault) {
          const replacement = await tx.warehouse.findFirst({
            where: { workspaceId: params.workspaceId, disabledAt: null },
            orderBy: { createdAt: 'asc' },
          })
          if (replacement) {
            await tx.warehouse.update({ where: { id: replacement.id }, data: { isDefault: true } })
          }
        }
      })
    } catch {
      throw new AppError('conflict', 'Gudang punya histori stok. Gunakan nonaktifkan agar histori tetap aman.')
    }
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.warehouse.removed', entityType: 'warehouse', entityId: params.warehouseId })
    return { ok: true }
  })

  app.get('/workspaces/:workspaceId/suppliers', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    await ensureWorkspace(app, params.workspaceId)
    const suppliers = await app.prisma.supplier.findMany({ where: { workspaceId: params.workspaceId }, orderBy: { createdAt: 'desc' } })
    return suppliers.map(supplierDto)
  })

  app.post('/workspaces/:workspaceId/suppliers', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const body = supplierSchema.parse(request.body)
    await ensureWorkspace(app, params.workspaceId)
    const supplier = await app.prisma.supplier.create({
      data: {
        workspaceId: params.workspaceId,
        name: body.name,
        contactPerson: body.contact_person,
        phone: body.phone,
        email: body.email || undefined,
        address: body.address,
        notes: body.notes,
      },
    })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.supplier.created', entityType: 'supplier', entityId: supplier.id, metadata: body })
    return supplierDto(supplier)
  })

  app.put('/workspaces/:workspaceId/suppliers/:supplierId', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), supplierId: z.string() }).parse(request.params)
    const body = supplierSchema.partial().parse(request.body)
    await ensureWorkspaceSupplier(app, params.workspaceId, params.supplierId)
    const supplier = await app.prisma.supplier.update({
      where: { id: params.supplierId },
      data: {
        name: body.name,
        contactPerson: body.contact_person,
        phone: body.phone,
        email: body.email || undefined,
        address: body.address,
        notes: body.notes,
      },
    })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.supplier.updated', entityType: 'supplier', entityId: supplier.id, metadata: body })
    return supplierDto(supplier)
  })

  app.post('/workspaces/:workspaceId/suppliers/:supplierId/disable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), supplierId: z.string() }).parse(request.params)
    await ensureWorkspaceSupplier(app, params.workspaceId, params.supplierId)
    const supplier = await app.prisma.supplier.update({ where: { id: params.supplierId }, data: { disabledAt: new Date() } })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.supplier.disabled', entityType: 'supplier', entityId: supplier.id })
    return supplierDto(supplier)
  })

  app.post('/workspaces/:workspaceId/suppliers/:supplierId/enable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), supplierId: z.string() }).parse(request.params)
    await ensureWorkspaceSupplier(app, params.workspaceId, params.supplierId)
    const supplier = await app.prisma.supplier.update({ where: { id: params.supplierId }, data: { disabledAt: null } })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.supplier.enabled', entityType: 'supplier', entityId: supplier.id })
    return supplierDto(supplier)
  })

  app.delete('/workspaces/:workspaceId/suppliers/:supplierId', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), supplierId: z.string() }).parse(request.params)
    await ensureWorkspaceSupplier(app, params.workspaceId, params.supplierId)
    await app.prisma.supplier.delete({ where: { id: params.supplierId } })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.supplier.removed', entityType: 'supplier', entityId: params.supplierId })
    return { ok: true }
  })

  app.post('/workspaces/:workspaceId/stock-in', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const body = stockSchema.parse(request.body)
    const product = await ensureWorkspaceProduct(app, params.workspaceId, body.product_id)
    const warehouse = await ensureWorkspaceWarehouse(app, params.workspaceId, body.warehouse_id)
    if (product.disabledAt) throw new AppError('feature_locked', 'Produk nonaktif tidak bisa menerima stok')
    if (warehouse.disabledAt) throw new AppError('feature_locked', 'Gudang nonaktif tidak bisa menerima stok')
    const item = await app.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventoryItem.upsert({
        where: { productId_warehouseId: { productId: body.product_id, warehouseId: body.warehouse_id } },
        update: { quantity: { increment: body.quantity } },
        create: { workspaceId: params.workspaceId, productId: body.product_id, warehouseId: body.warehouse_id, quantity: body.quantity },
        include: { product: { include: { category: true } }, warehouse: true },
      })
      await tx.stockMovement.create({
        data: {
          workspaceId: params.workspaceId,
          productId: body.product_id,
          warehouseId: body.warehouse_id,
          type: 'in',
          quantity: body.quantity,
          notes: body.notes,
          userId: ctx.userId,
        },
      })
      await tx.auditLog.create({
        data: { workspaceId: params.workspaceId, userId: ctx.userId, action: 'admin.stock.in', entityType: 'inventory_item', entityId: inventory.id, metadata: body },
      })
      return inventory
    })
    return inventoryDto(item)
  })

  app.post('/workspaces/:workspaceId/stock-out', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const body = stockSchema.parse(request.body)
    const product = await ensureWorkspaceProduct(app, params.workspaceId, body.product_id)
    const warehouse = await ensureWorkspaceWarehouse(app, params.workspaceId, body.warehouse_id)
    if (product.disabledAt) throw new AppError('feature_locked', 'Produk nonaktif tidak bisa dikeluarkan')
    if (warehouse.disabledAt) throw new AppError('feature_locked', 'Gudang nonaktif tidak bisa mengeluarkan stok')
    const item = await app.prisma.$transaction(async (tx) => {
      const changed = await tx.inventoryItem.updateMany({
        where: { workspaceId: params.workspaceId, productId: body.product_id, warehouseId: body.warehouse_id, quantity: { gte: body.quantity } },
        data: { quantity: { decrement: body.quantity } },
      })
      if (changed.count === 0) throw new AppError('conflict', 'Stok tidak cukup untuk transaksi ini')
      const inventory = await tx.inventoryItem.findUniqueOrThrow({
        where: { productId_warehouseId: { productId: body.product_id, warehouseId: body.warehouse_id } },
        include: { product: { include: { category: true } }, warehouse: true },
      })
      await tx.stockMovement.create({
        data: {
          workspaceId: params.workspaceId,
          productId: body.product_id,
          warehouseId: body.warehouse_id,
          type: 'out',
          quantity: body.quantity,
          notes: body.notes,
          userId: ctx.userId,
        },
      })
      await tx.auditLog.create({
        data: { workspaceId: params.workspaceId, userId: ctx.userId, action: 'admin.stock.out', entityType: 'inventory_item', entityId: inventory.id, metadata: body },
      })
      return inventory
    })
    return inventoryDto(item)
  })

  app.post('/workspaces/:workspaceId/stock-transfer', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const body = transferSchema.parse(request.body)
    if (body.warehouse_id === body.to_warehouse_id) throw new AppError('validation_error', 'Gudang asal dan tujuan harus berbeda')
    const product = await ensureWorkspaceProduct(app, params.workspaceId, body.product_id)
    const sourceWarehouse = await ensureWorkspaceWarehouse(app, params.workspaceId, body.warehouse_id)
    const destinationWarehouse = await ensureWorkspaceWarehouse(app, params.workspaceId, body.to_warehouse_id)
    if (product.disabledAt) throw new AppError('feature_locked', 'Produk nonaktif tidak bisa ditransfer')
    if (sourceWarehouse.disabledAt || destinationWarehouse.disabledAt) throw new AppError('feature_locked', 'Transfer hanya bisa dilakukan antar gudang aktif')
    const movement = await app.prisma.$transaction(async (tx) => {
      const source = await tx.inventoryItem.updateMany({
        where: { workspaceId: params.workspaceId, productId: body.product_id, warehouseId: body.warehouse_id, quantity: { gte: body.quantity } },
        data: { quantity: { decrement: body.quantity } },
      })
      if (source.count === 0) throw new AppError('conflict', 'Stok tidak cukup untuk transfer')
      await tx.inventoryItem.upsert({
        where: { productId_warehouseId: { productId: body.product_id, warehouseId: body.to_warehouse_id } },
        update: { quantity: { increment: body.quantity } },
        create: { workspaceId: params.workspaceId, productId: body.product_id, warehouseId: body.to_warehouse_id, quantity: body.quantity },
      })
      await tx.auditLog.create({
        data: { workspaceId: params.workspaceId, userId: ctx.userId, action: 'admin.stock.transfer', entityType: 'stock_movement', metadata: body },
      })
      return tx.stockMovement.create({
        data: {
          workspaceId: params.workspaceId,
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

  app.get('/workspaces/:workspaceId/scheduled-activities', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const activities = await app.prisma.scheduledActivity.findMany({ where: { workspaceId: params.workspaceId }, orderBy: { createdAt: 'desc' } })
    return activities.map(scheduledActivityDto)
  })

  app.post('/workspaces/:workspaceId/scheduled-activities', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const body = z.object({
      title: z.string().min(1),
      type: z.string().min(1).default('task'),
      status: z.string().min(1).default('pending'),
      description: z.string().optional(),
      due_at: z.string().datetime().optional().nullable(),
    }).parse(request.body)
    const activity = await app.prisma.scheduledActivity.create({
      data: {
        workspaceId: params.workspaceId,
        title: body.title,
        type: body.type,
        status: body.status,
        description: body.description,
        dueAt: body.due_at ? new Date(body.due_at) : null,
        createdById: ctx.userId,
      },
    })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.activity.created', entityType: 'scheduled_activity', entityId: activity.id, metadata: body })
    return scheduledActivityDto(activity)
  })

  app.put('/workspaces/:workspaceId/scheduled-activities/:activityId', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), activityId: z.string() }).parse(request.params)
    const body = z.object({
      title: z.string().min(1).optional(),
      type: z.string().min(1).optional(),
      status: z.string().min(1).optional(),
      description: z.string().optional(),
      due_at: z.string().datetime().optional().nullable(),
    }).parse(request.body)
    await ensureWorkspaceActivity(app, params.workspaceId, params.activityId)
    const activity = await app.prisma.scheduledActivity.update({
      where: { id: params.activityId },
      data: {
        title: body.title,
        type: body.type,
        status: body.status,
        description: body.description,
        dueAt: body.due_at === undefined ? undefined : body.due_at ? new Date(body.due_at) : null,
      },
    })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.activity.updated', entityType: 'scheduled_activity', entityId: activity.id, metadata: body })
    return scheduledActivityDto(activity)
  })

  app.post('/workspaces/:workspaceId/scheduled-activities/:activityId/disable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), activityId: z.string() }).parse(request.params)
    await ensureWorkspaceActivity(app, params.workspaceId, params.activityId)
    const activity = await app.prisma.scheduledActivity.update({ where: { id: params.activityId }, data: { disabledAt: new Date(), status: 'disabled' } })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.activity.disabled', entityType: 'scheduled_activity', entityId: activity.id })
    return scheduledActivityDto(activity)
  })

  app.post('/workspaces/:workspaceId/scheduled-activities/:activityId/enable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), activityId: z.string() }).parse(request.params)
    await ensureWorkspaceActivity(app, params.workspaceId, params.activityId)
    const activity = await app.prisma.scheduledActivity.update({ where: { id: params.activityId }, data: { disabledAt: null, status: 'pending' } })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.activity.enabled', entityType: 'scheduled_activity', entityId: activity.id })
    return scheduledActivityDto(activity)
  })

  app.delete('/workspaces/:workspaceId/scheduled-activities/:activityId', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), activityId: z.string() }).parse(request.params)
    await ensureWorkspaceActivity(app, params.workspaceId, params.activityId)
    await app.prisma.scheduledActivity.delete({ where: { id: params.activityId } })
    await writeTenantAuditLog(app, ctx, request, params.workspaceId, { action: 'admin.activity.removed', entityType: 'scheduled_activity', entityId: params.activityId })
    return { ok: true }
  })
}
