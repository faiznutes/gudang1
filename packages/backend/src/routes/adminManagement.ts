import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { AppError } from '../lib/errors.js'
import { productDto, supplierDto, userDto, warehouseDto } from '../lib/mappers.js'
import { requireAuth, requirePlatformRole } from '../middleware/auth.js'
import { writeAuditLog } from '../lib/audit.js'

const tenantRoleSchema = z.enum(['admin', 'staff', 'supplier', 'trial'])

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
    const user = await app.prisma.user.update({ where: { id: params.userId }, data: { disabledAt: new Date() } })
    await writeAuditLog(app, ctx, request, { action: 'admin.user.disabled', entityType: 'user', entityId: user.id })
    return userDto(user)
  })

  app.post('/workspaces/:workspaceId/users/:userId/enable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), userId: z.string() }).parse(request.params)
    const user = await app.prisma.user.update({ where: { id: params.userId }, data: { disabledAt: null } })
    await writeAuditLog(app, ctx, request, { action: 'admin.user.enabled', entityType: 'user', entityId: user.id })
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
    await writeAuditLog(app, ctx, request, { action: 'admin.product.created', entityType: 'product', entityId: product.id, metadata: body })
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
    await writeAuditLog(app, ctx, request, { action: 'admin.product.updated', entityType: 'product', entityId: product.id, metadata: body })
    return productDto(product)
  })

  app.post('/workspaces/:workspaceId/products/:productId/disable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), productId: z.string() }).parse(request.params)
    const product = await app.prisma.product.update({
      where: { id: params.productId },
      data: { disabledAt: new Date() },
      include: { category: true },
    })
    await writeAuditLog(app, ctx, request, { action: 'admin.product.disabled', entityType: 'product', entityId: product.id })
    return productDto(product)
  })

  app.post('/workspaces/:workspaceId/products/:productId/enable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), productId: z.string() }).parse(request.params)
    const product = await app.prisma.product.update({
      where: { id: params.productId },
      data: { disabledAt: null },
      include: { category: true },
    })
    await writeAuditLog(app, ctx, request, { action: 'admin.product.enabled', entityType: 'product', entityId: product.id })
    return productDto(product)
  })

  app.delete('/workspaces/:workspaceId/products/:productId', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), productId: z.string() }).parse(request.params)
    try {
      await app.prisma.product.delete({ where: { id: params.productId } })
    } catch {
      throw new AppError('conflict', 'Produk punya histori stok. Gunakan nonaktifkan agar histori tetap aman.')
    }
    await writeAuditLog(app, ctx, request, { action: 'admin.product.removed', entityType: 'product', entityId: params.productId })
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
    const count = await app.prisma.warehouse.count({ where: { workspaceId: params.workspaceId } })
    if (body.is_default || count === 0) {
      await app.prisma.warehouse.updateMany({ where: { workspaceId: params.workspaceId }, data: { isDefault: false } })
    }
    const warehouse = await app.prisma.warehouse.create({
      data: { workspaceId: params.workspaceId, name: body.name, address: body.address, isDefault: body.is_default ?? count === 0 },
    })
    await writeAuditLog(app, ctx, request, { action: 'admin.warehouse.created', entityType: 'warehouse', entityId: warehouse.id, metadata: body })
    return warehouseDto(warehouse)
  })

  app.put('/workspaces/:workspaceId/warehouses/:warehouseId', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), warehouseId: z.string() }).parse(request.params)
    const body = z.object({ name: z.string().min(1).optional(), address: z.string().optional(), is_default: z.boolean().optional() }).parse(request.body)
    if (body.is_default) {
      await app.prisma.warehouse.updateMany({ where: { workspaceId: params.workspaceId }, data: { isDefault: false } })
    }
    const warehouse = await app.prisma.warehouse.update({
      where: { id: params.warehouseId },
      data: { name: body.name, address: body.address, isDefault: body.is_default },
    })
    await writeAuditLog(app, ctx, request, { action: 'admin.warehouse.updated', entityType: 'warehouse', entityId: warehouse.id, metadata: body })
    return warehouseDto(warehouse)
  })

  app.post('/workspaces/:workspaceId/warehouses/:warehouseId/disable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), warehouseId: z.string() }).parse(request.params)
    const warehouse = await app.prisma.warehouse.update({ where: { id: params.warehouseId }, data: { disabledAt: new Date() } })
    await writeAuditLog(app, ctx, request, { action: 'admin.warehouse.disabled', entityType: 'warehouse', entityId: warehouse.id })
    return warehouseDto(warehouse)
  })

  app.post('/workspaces/:workspaceId/warehouses/:warehouseId/enable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), warehouseId: z.string() }).parse(request.params)
    const warehouse = await app.prisma.warehouse.update({ where: { id: params.warehouseId }, data: { disabledAt: null } })
    await writeAuditLog(app, ctx, request, { action: 'admin.warehouse.enabled', entityType: 'warehouse', entityId: warehouse.id })
    return warehouseDto(warehouse)
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
    await writeAuditLog(app, ctx, request, { action: 'admin.activity.created', entityType: 'scheduled_activity', entityId: activity.id, metadata: body })
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
    await writeAuditLog(app, ctx, request, { action: 'admin.activity.updated', entityType: 'scheduled_activity', entityId: activity.id, metadata: body })
    return scheduledActivityDto(activity)
  })

  app.post('/workspaces/:workspaceId/scheduled-activities/:activityId/disable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), activityId: z.string() }).parse(request.params)
    const activity = await app.prisma.scheduledActivity.update({ where: { id: params.activityId }, data: { disabledAt: new Date(), status: 'disabled' } })
    await writeAuditLog(app, ctx, request, { action: 'admin.activity.disabled', entityType: 'scheduled_activity', entityId: activity.id })
    return scheduledActivityDto(activity)
  })

  app.post('/workspaces/:workspaceId/scheduled-activities/:activityId/enable', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), activityId: z.string() }).parse(request.params)
    const activity = await app.prisma.scheduledActivity.update({ where: { id: params.activityId }, data: { disabledAt: null, status: 'pending' } })
    await writeAuditLog(app, ctx, request, { action: 'admin.activity.enabled', entityType: 'scheduled_activity', entityId: activity.id })
    return scheduledActivityDto(activity)
  })

  app.delete('/workspaces/:workspaceId/scheduled-activities/:activityId', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), activityId: z.string() }).parse(request.params)
    await app.prisma.scheduledActivity.delete({ where: { id: params.activityId } })
    await writeAuditLog(app, ctx, request, { action: 'admin.activity.removed', entityType: 'scheduled_activity', entityId: params.activityId })
    return { ok: true }
  })
}
