import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { billingAmount, getEntitlements, legacyPlanForCode } from '../lib/plans.js'
import { requireActiveSession, requireAuth, requireTenantRole } from '../middleware/auth.js'
import { AppError } from '../lib/errors.js'

function packageDto(planPackage: any) {
  return {
    id: planPackage.id,
    code: planPackage.code,
    name: planPackage.name,
    description: planPackage.description,
    monthly_price: planPackage.monthlyPrice,
    yearly_price: planPackage.yearlyPrice,
    original_monthly_price: planPackage.originalMonthlyPrice,
    trial_days: planPackage.trialDays,
    sort_order: planPackage.sortOrder,
    limits: {
      warehouses: planPackage.warehouseLimit,
      products: planPackage.productLimit,
      users: planPackage.userLimit,
    },
    features: Object.fromEntries(planPackage.features.map((feature: any) => [feature.feature, feature.enabled])),
  }
}

function addonDto(addon: any) {
  return {
    id: addon.id,
    code: addon.code,
    name: addon.name,
    description: addon.description,
    monthly_price: addon.monthlyPrice,
    yearly_price: addon.yearlyPrice,
    feature_key: addon.featureKey,
    limit_key: addon.limitKey,
    limit_increment: addon.limitIncrement,
  }
}

export async function billingRoutes(app: FastifyInstance) {
  app.get('/billing/packages', async (request) => {
    await requireAuth(app, request)
    const packages = await app.prisma.planPackage.findMany({
      where: { status: 'active' },
      include: { features: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return packages.map(packageDto)
  })

  app.get('/billing/addons', async (request) => {
    await requireAuth(app, request)
    const addons = await app.prisma.addon.findMany({
      where: { status: 'active' },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return addons.map(addonDto)
  })

  app.post('/billing/change-plan', async (request) => {
    const ctx = await requireAuth(app, request)
    requireActiveSession(ctx)
    requireTenantRole(ctx, ['admin', 'trial'])
    const body = z.object({
      plan: z.enum(['free', 'starter', 'growth', 'pro', 'custom']).optional(),
      package_code: z.string().trim().min(1).optional(),
      billing_cycle: z.enum(['monthly', 'yearly']).default('monthly'),
    }).parse(request.body)
    const requestedCode = body.package_code ?? body.plan
    if (!requestedCode) throw new AppError('validation_error', 'Paket harus dipilih')
    const planPackage = await app.prisma.planPackage.findUnique({
      where: { code: requestedCode },
      include: { features: true },
    })
    if (!planPackage || planPackage.status !== 'active') {
      throw new AppError('not_found', 'Paket aktif tidak ditemukan')
    }
    const now = new Date()
    const end = new Date(now)
    if (body.billing_cycle === 'yearly') {
      end.setFullYear(end.getFullYear() + 1)
    } else {
      end.setMonth(end.getMonth() + 1)
    }
    const legacyPlan = legacyPlanForCode(planPackage.code)

    await app.prisma.$transaction(async (tx) => {
      await tx.workspace.update({
        where: { id: ctx.workspaceId },
        data: { plan: legacyPlan, status: 'active', trialEndsAt: null },
      })
      await tx.subscription.updateMany({
        where: { workspaceId: ctx.workspaceId, status: { in: ['active', 'trialing'] } },
        data: { status: 'cancelled', cancelAtPeriodEnd: true },
      })
      const subscription = await tx.subscription.create({
        data: {
          workspaceId: ctx.workspaceId,
          planPackageId: planPackage.id,
          plan: legacyPlan,
          status: 'active',
          billingCycle: body.billing_cycle,
          amountSnapshot: billingAmount(planPackage, body.billing_cycle),
          source: 'tenant',
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
          metadata: { package_code: planPackage.code, plan: legacyPlan, billing_cycle: body.billing_cycle },
        },
      })
      await tx.subscriptionEvent.create({
        data: {
          workspaceId: ctx.workspaceId,
          subscriptionId: subscription.id,
          userId: ctx.userId,
          type: 'subscription.plan_changed',
          metadata: { package_code: planPackage.code, plan: legacyPlan, billing_cycle: body.billing_cycle },
        },
      })
    })

    return getEntitlements(app, ctx.workspaceId)
  })
}
