import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AppError } from '../lib/errors.js'
import { supplierDto } from '../lib/mappers.js'
import { requireActiveSession, requireAuth, requireTenantRole } from '../middleware/auth.js'
import { runIdempotent } from '../lib/idempotency.js'
import { writeAuditLog } from '../lib/audit.js'

const supplierSchema = z.object({
  name: z.string().min(1),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

const bulkIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

function idempotencyKey(request: any) {
  const value = request.headers['idempotency-key']
  return Array.isArray(value) ? value[0] : value
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

export async function supplierRoutes(app: FastifyInstance) {
  app.get('/suppliers', async (request) => {
    const ctx = await requireAuth(app, request)
    const suppliers = await app.prisma.supplier.findMany({
      where: { workspaceId: ctx.workspaceId, disabledAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return suppliers.map(supplierDto)
  })

  app.get('/suppliers/:id', async (request) => {
    const ctx = await requireAuth(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const supplier = await app.prisma.supplier.findFirst({ where: { id: params.id, workspaceId: ctx.workspaceId, disabledAt: null } })
    if (!supplier) throw new AppError('not_found', 'Supplier tidak ditemukan')
    return supplierDto(supplier)
  })

  app.post('/suppliers', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const body = supplierSchema.parse(request.body)
    return runIdempotent(app, ctx, idempotencyKey(request), 'supplier.create', body, async () => {
      const supplier = await app.prisma.supplier.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: body.name,
          contactPerson: body.contact_person,
          phone: body.phone,
          email: body.email || undefined,
          address: body.address,
          notes: body.notes,
        },
      })
      await writeAuditLog(app, ctx, request, {
        action: 'supplier.created',
        entityType: 'supplier',
        entityId: supplier.id,
        metadata: body,
      })
      return supplierDto(supplier)
    })
  })

  app.put('/suppliers/:id', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const body = supplierSchema.partial().parse(request.body)
    const current = await app.prisma.supplier.findFirst({ where: { id: params.id, workspaceId: ctx.workspaceId, disabledAt: null } })
    if (!current) throw new AppError('not_found', 'Supplier tidak ditemukan')
    const supplier = await app.prisma.supplier.update({
      where: { id: params.id },
      data: {
        name: body.name,
        contactPerson: body.contact_person,
        phone: body.phone,
        email: body.email || undefined,
        address: body.address,
        notes: body.notes,
      },
    })
    await writeAuditLog(app, ctx, request, {
      action: 'supplier.updated',
      entityType: 'supplier',
      entityId: supplier.id,
      metadata: body,
    })
    return supplierDto(supplier)
  })

  app.delete('/suppliers/:id', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const current = await app.prisma.supplier.findFirst({ where: { id: params.id, workspaceId: ctx.workspaceId, disabledAt: null } })
    if (!current) throw new AppError('not_found', 'Supplier tidak ditemukan')
    await app.prisma.supplier.update({ where: { id: params.id }, data: { disabledAt: new Date() } })
    await writeAuditLog(app, ctx, request, {
      action: 'supplier.disabled',
      entityType: 'supplier',
      entityId: params.id,
    })
    return { ok: true }
  })

  app.post('/suppliers/:id/archive', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const current = await app.prisma.supplier.findFirst({ where: { id: params.id, workspaceId: ctx.workspaceId, disabledAt: null } })
    if (!current) throw new AppError('not_found', 'Supplier tidak ditemukan')
    const supplier = await app.prisma.supplier.update({ where: { id: params.id }, data: { disabledAt: new Date() } })
    await writeAuditLog(app, ctx, request, {
      action: 'supplier.archived',
      entityType: 'supplier',
      entityId: supplier.id,
    })
    return supplierDto(supplier)
  })

  app.post('/suppliers/:id/restore', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const params = z.object({ id: z.string() }).parse(request.params)
    const supplier = await app.prisma.supplier.findFirst({ where: { id: params.id, workspaceId: ctx.workspaceId } })
    if (!supplier) throw new AppError('not_found', 'Supplier tidak ditemukan')
    const restored = await app.prisma.supplier.update({ where: { id: params.id }, data: { disabledAt: null } })
    await writeAuditLog(app, ctx, request, {
      action: 'supplier.restored',
      entityType: 'supplier',
      entityId: restored.id,
    })
    return supplierDto(restored)
  })

  app.post('/suppliers/bulk-archive', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const body = bulkIdsSchema.parse(request.body)
    const result = await bulkSetSupplierDisabledAt(app, ctx.workspaceId, body.ids, new Date())
    await writeAuditLog(app, ctx, request, {
      action: 'supplier.bulk_archived',
      entityType: 'supplier',
      metadata: {
        ids: body.ids,
        count: result.count,
      },
    })
    return { ok: true, count: result.count }
  })

  app.post('/suppliers/bulk-restore', async (request) => {
    const ctx = await requireAuth(app, request)
    requireTenantRole(ctx, ['admin', 'staff', 'trial'])
    await requireActiveSession(app, ctx)
    const body = bulkIdsSchema.parse(request.body)
    const result = await bulkSetSupplierDisabledAt(app, ctx.workspaceId, body.ids, null)
    await writeAuditLog(app, ctx, request, {
      action: 'supplier.bulk_restored',
      entityType: 'supplier',
      metadata: {
        ids: body.ids,
        count: result.count,
      },
    })
    return { ok: true, count: result.count }
  })
}
