import type { FastifyInstance } from 'fastify'
import { getEntitlements } from '../lib/plans.js'
import { requireAuth } from '../middleware/auth.js'

export async function entitlementRoutes(app: FastifyInstance) {
  app.get('/entitlements', async (request) => {
    const ctx = await requireAuth(app, request)
    return getEntitlements(app, ctx.workspaceId)
  })
}
