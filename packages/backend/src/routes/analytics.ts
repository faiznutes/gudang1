import type { FastifyInstance } from 'fastify'
import { requireFeature, requireAuth } from '../middleware/auth.js'

export async function analyticsRoutes(app: FastifyInstance) {
  app.get('/analytics/summary', async (request) => {
    const ctx = await requireAuth(app, request)
    await requireFeature(app, ctx, 'analytics')

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [totalProducts, totalWarehouses, lowStockItems, stockIn, stockOut] = await Promise.all([
      app.prisma.product.count({ where: { workspaceId: ctx.workspaceId } }),
      app.prisma.warehouse.count({ where: { workspaceId: ctx.workspaceId } }),
      app.prisma.inventoryItem.findMany({
        where: { workspaceId: ctx.workspaceId },
        include: { product: true },
      }),
      app.prisma.stockMovement.aggregate({
        where: { workspaceId: ctx.workspaceId, type: 'in', createdAt: { gte: startOfMonth } },
        _sum: { quantity: true },
      }),
      app.prisma.stockMovement.aggregate({
        where: { workspaceId: ctx.workspaceId, type: 'out', createdAt: { gte: startOfMonth } },
        _sum: { quantity: true },
      }),
    ])

    return {
      total_products: totalProducts,
      total_warehouses: totalWarehouses,
      low_stock_count: lowStockItems.filter((item) => item.quantity <= item.product.minStock).length,
      stock_in_this_month: stockIn._sum.quantity ?? 0,
      stock_out_this_month: stockOut._sum.quantity ?? 0,
    }
  })
}
