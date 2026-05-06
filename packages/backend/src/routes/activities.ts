import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { stockMovementDto } from '../lib/mappers.js'
import { requireAuth } from '../middleware/auth.js'

export async function activityRoutes(app: FastifyInstance) {
  app.get('/activities', async (request) => {
    const ctx = await requireAuth(app, request)
    const query = z.object({
      product_id: z.string().optional(),
      warehouse_id: z.string().optional(),
      type: z.enum(['in', 'out', 'transfer']).optional(),
      limit: z.coerce.number().int().positive().max(100).default(50),
    }).parse(request.query)

    const movements = await app.prisma.stockMovement.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        ...(query.product_id ? { productId: query.product_id } : {}),
        ...(query.warehouse_id ? { warehouseId: query.warehouse_id } : {}),
        ...(query.type ? { type: query.type } : {}),
      },
      include: { product: true, warehouse: true, toWarehouse: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    })
    return movements.map(stockMovementDto)
  })
}
