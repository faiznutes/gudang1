import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getEntitlements } from '../lib/plans.js'
import { requireActiveSession, requireAuth, requireRole } from '../middleware/auth.js'

export async function billingRoutes(app: FastifyInstance) {
  app.post('/billing/change-plan', async (request) => {
    const ctx = await requireAuth(app, request)
    requireActiveSession(ctx)
    requireRole(ctx, ['super_admin', 'admin', 'trial'])
    const body = z.object({ plan: z.enum(['free', 'starter', 'growth', 'pro', 'custom']) }).parse(request.body)
    const now = new Date()
    const end = new Date(now)
    end.setMonth(end.getMonth() + 1)

    await app.prisma.$transaction(async (tx) => {
      await tx.workspace.update({
        where: { id: ctx.workspaceId },
        data: { plan: body.plan, status: 'active', trialEndsAt: null },
      })
      await tx.subscription.updateMany({
        where: { workspaceId: ctx.workspaceId, status: { in: ['active', 'trialing'] } },
        data: { status: 'cancelled', cancelAtPeriodEnd: true },
      })
      const subscription = await tx.subscription.create({
        data: {
          workspaceId: ctx.workspaceId,
          plan: body.plan,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: end,
        },
      })
      await tx.auditLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: 'billing.plan_changed',
          entityType: 'subscription',
          entityId: subscription.id,
          metadata: { plan: body.plan },
        },
      })
    })

    return getEntitlements(app, ctx.workspaceId)
  })
}
