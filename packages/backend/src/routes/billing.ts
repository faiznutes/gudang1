import type { FastifyInstance } from 'fastify'
import { BILLING_REQUEST_TYPES } from '@stockpilot/shared'
import { z } from 'zod'
import { billingRequestDto, createBillingRequest, includeBillingRequestRelations } from '../lib/billingRequests.js'
import { AppError } from '../lib/errors.js'
import { requireActiveSession, requireAuth, requireTenantRole } from '../middleware/auth.js'

function packageDto(planPackage: any) {
  return {
    id: planPackage.id,
    code: planPackage.code,
    name: planPackage.name,
    description: planPackage.description,
    status: planPackage.status,
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
    status: addon.status,
    monthly_price: addon.monthlyPrice,
    yearly_price: addon.yearlyPrice,
    feature_key: addon.featureKey,
    limit_key: addon.limitKey,
    limit_increment: addon.limitIncrement,
    sort_order: addon.sortOrder,
  }
}

const requestCreateSchema = z.object({
  type: z.enum(BILLING_REQUEST_TYPES),
  package_code: z.string().trim().min(1).optional(),
  package_id: z.string().trim().min(1).optional(),
  addon_code: z.string().trim().min(1).optional(),
  addon_id: z.string().trim().min(1).optional(),
  billing_cycle: z.enum(['monthly', 'yearly']).default('monthly'),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
  requested_limit_key: z.string().trim().min(1).max(60).optional(),
  requested_limit_value: z.coerce.number().int().min(1).max(999999).optional(),
  requested_activation_date: z.string().datetime().optional(),
  title: z.string().trim().min(3).max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
})

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

  app.get('/billing/requests', async (request) => {
    const ctx = await requireAuth(app, request)
    const query = z.object({
      status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
      type: z.enum(BILLING_REQUEST_TYPES).optional(),
    }).parse(request.query)
    const requests = await app.prisma.billingRequest.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {}),
      },
      include: includeBillingRequestRelations(),
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return requests.map(billingRequestDto)
  })

  app.post('/billing/requests', {
    config: {
      rateLimit: {
        max: 12,
        timeWindow: '1 minute',
      },
    },
  }, async (request) => {
    const ctx = await requireAuth(app, request)
    await requireActiveSession(app, ctx)
    requireTenantRole(ctx, ['admin', 'trial'])
    const body = requestCreateSchema.parse(request.body)
    return createBillingRequest(app, ctx, {
      type: body.type,
      packageCode: body.package_code,
      packageId: body.package_id,
      addonCode: body.addon_code,
      addonId: body.addon_id,
      billingCycle: body.billing_cycle,
      quantity: body.quantity,
      requestedLimitKey: body.requested_limit_key,
      requestedLimitValue: body.requested_limit_value,
      requestedActivationDate: body.requested_activation_date ? new Date(body.requested_activation_date) : null,
      title: body.title,
      notes: body.notes,
      metadata: body.metadata,
    })
  })

  app.post('/billing/change-plan', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  }, async (request) => {
    const ctx = await requireAuth(app, request)
    await requireActiveSession(app, ctx)
    requireTenantRole(ctx, ['admin', 'trial'])
    const body = z.object({
      plan: z.enum(['free', 'starter', 'growth', 'pro', 'custom']).optional(),
      package_code: z.string().trim().min(1).optional(),
      billing_cycle: z.enum(['monthly', 'yearly']).default('monthly'),
      notes: z.string().trim().max(2000).optional(),
    }).parse(request.body)
    const requestedCode = body.package_code ?? body.plan
    if (!requestedCode) throw new AppError('validation_error', 'Paket harus dipilih')
    return createBillingRequest(app, ctx, {
      type: 'plan_change',
      packageCode: requestedCode,
      billingCycle: body.billing_cycle,
      notes: body.notes,
    })
  })
}
