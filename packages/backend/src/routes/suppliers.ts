import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AppError } from '../lib/errors.js'
import { supplierDto } from '../lib/mappers.js'
import { requireAuth } from '../middleware/auth.js'
import { runIdempotent } from '../lib/idempotency.js'

const supplierSchema = z.object({
  name: z.string().min(1),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

function idempotencyKey(request: any) {
  const value = request.headers['idempotency-key']
  return Array.isArray(value) ? value[0] : value
}

export async function supplierRoutes(app: FastifyInstance) {
  app.get('/suppliers', async (request) => {
    const ctx = await requireAuth(app, request)
    const suppliers = await app.prisma.supplier.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { createdAt: 'desc' },
    })
    return suppliers.map(supplierDto)
  })

  app.get('/suppliers/:id', async (request) => {
    const ctx = await requireAuth(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const supplier = await app.prisma.supplier.findFirst({ where: { id: params.id, workspaceId: ctx.workspaceId } })
    if (!supplier) throw new AppError('not_found', 'Supplier tidak ditemukan')
    return supplierDto(supplier)
  })

  app.post('/suppliers', async (request) => {
    const ctx = await requireAuth(app, request)
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
      return supplierDto(supplier)
    })
  })

  app.put('/suppliers/:id', async (request) => {
    const ctx = await requireAuth(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const body = supplierSchema.partial().parse(request.body)
    const current = await app.prisma.supplier.findFirst({ where: { id: params.id, workspaceId: ctx.workspaceId } })
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
    return supplierDto(supplier)
  })

  app.delete('/suppliers/:id', async (request) => {
    const ctx = await requireAuth(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const current = await app.prisma.supplier.findFirst({ where: { id: params.id, workspaceId: ctx.workspaceId } })
    if (!current) throw new AppError('not_found', 'Supplier tidak ditemukan')
    await app.prisma.supplier.delete({ where: { id: params.id } })
    return { ok: true }
  })
}
