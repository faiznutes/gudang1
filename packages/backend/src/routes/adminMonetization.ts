import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { FEATURE_KEYS } from '@stockpilot/shared'
import { AppError } from '../lib/errors.js'
import { billingAmount } from '../lib/plans.js'
import { runSubscriptionLifecycle } from '../lib/subscriptionLifecycle.js'
import { requireAuth, requirePlatformRole } from '../middleware/auth.js'

const featureSchema = z.enum(FEATURE_KEYS)
const billingCycleSchema = z.enum(['monthly', 'yearly', 'manual'])
const catalogStatusSchema = z.enum(['active', 'archived'])
const limitKeySchema = z.enum(['warehouses', 'products', 'users'])
const packageCodeSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{1,31}$/, 'Kode paket hanya boleh huruf kecil, angka, dash, dan underscore')

const packagePayloadSchema = z.object({
  code: packageCodeSchema.optional(),
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  status: catalogStatusSchema.optional(),
  monthly_price: z.coerce.number().int().min(0).optional(),
  yearly_price: z.coerce.number().int().min(0).nullable().optional(),
  original_monthly_price: z.coerce.number().int().min(0).nullable().optional(),
  trial_days: z.coerce.number().int().min(0).max(365).optional(),
  sort_order: z.coerce.number().int().min(0).max(9999).optional(),
  limits: z.object({
    warehouses: z.coerce.number().int().min(1).optional(),
    products: z.coerce.number().int().min(1).optional(),
    users: z.coerce.number().int().min(1).optional(),
  }).optional(),
  features: z.record(featureSchema, z.boolean()).optional(),
})

const addonPayloadSchema = z.object({
  code: packageCodeSchema.optional(),
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  status: catalogStatusSchema.optional(),
  monthly_price: z.coerce.number().int().min(0).optional(),
  yearly_price: z.coerce.number().int().min(0).nullable().optional(),
  feature_key: featureSchema.nullable().optional(),
  limit_key: limitKeySchema.nullable().optional(),
  limit_increment: z.coerce.number().int().min(0).nullable().optional(),
  sort_order: z.coerce.number().int().min(0).max(9999).optional(),
})

async function requirePlatformAdmin(app: FastifyInstance, request: any) {
  const ctx = await requireAuth(app, request, { tenantHeaderMode: 'ignore' })
  requirePlatformRole(ctx, ['super_admin'])
  return ctx
}

function featureMap(rows: Array<{ feature: string; enabled: boolean }>) {
  return FEATURE_KEYS.reduce((result, feature) => {
    result[feature] = rows.some(row => row.feature === feature && row.enabled)
    return result
  }, {} as Record<string, boolean>)
}

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
    features: featureMap(planPackage.features ?? []),
    created_at: planPackage.createdAt.toISOString(),
    updated_at: planPackage.updatedAt.toISOString(),
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
    created_at: addon.createdAt.toISOString(),
    updated_at: addon.updatedAt.toISOString(),
  }
}

function workspaceAddonDto(assignment: any) {
  return {
    id: assignment.id,
    workspace_id: assignment.workspaceId,
    addon: addonDto(assignment.addon),
    status: assignment.status,
    billing_cycle: assignment.billingCycle,
    quantity: assignment.quantity,
    amount: assignment.amountSnapshot,
    current_period_start: assignment.currentPeriodStart.toISOString(),
    current_period_end: assignment.currentPeriodEnd?.toISOString() ?? null,
    cancel_at_period_end: assignment.cancelAtPeriodEnd,
    created_at: assignment.createdAt.toISOString(),
  }
}

async function upsertPackageFeatures(tx: any, planPackageId: string, features: Record<string, boolean> | undefined) {
  const nextFeatures = features ?? {}
  for (const feature of FEATURE_KEYS) {
    if (nextFeatures[feature] === undefined) continue
    await tx.planFeature.upsert({
      where: { planPackageId_feature: { planPackageId, feature } },
      update: { enabled: nextFeatures[feature] },
      create: { planPackageId, feature, enabled: nextFeatures[feature] },
    })
  }
}

export async function adminMonetizationRoutes(app: FastifyInstance) {
  app.post('/subscriptions/lifecycle/run', async (request) => {
    await requirePlatformAdmin(app, request)
    return runSubscriptionLifecycle(app)
  })

  app.get('/packages', async (request) => {
    await requirePlatformAdmin(app, request)
    const query = z.object({ status: catalogStatusSchema.optional() }).parse(request.query)
    const packages = await app.prisma.planPackage.findMany({
      where: query.status ? { status: query.status } : undefined,
      include: { features: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return packages.map(packageDto)
  })

  app.post('/packages', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const body = packagePayloadSchema.required({ code: true, name: true }).parse(request.body)
    const planPackage = await app.prisma.$transaction(async (tx) => {
      const created = await tx.planPackage.create({
        data: {
          code: body.code,
          name: body.name,
          description: body.description ?? null,
          status: body.status ?? 'active',
          monthlyPrice: body.monthly_price ?? 0,
          yearlyPrice: body.yearly_price ?? null,
          originalMonthlyPrice: body.original_monthly_price ?? null,
          trialDays: body.trial_days ?? 0,
          sortOrder: body.sort_order ?? 100,
          warehouseLimit: body.limits?.warehouses ?? 1,
          productLimit: body.limits?.products ?? 100,
          userLimit: body.limits?.users ?? 1,
        },
      })
      for (const feature of FEATURE_KEYS) {
        await tx.planFeature.create({
          data: {
            planPackageId: created.id,
            feature,
            enabled: body.features?.[feature] ?? false,
          },
        })
      }
      await tx.auditLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: 'admin.package.created',
          entityType: 'plan_package',
          entityId: created.id,
          metadata: { code: created.code, name: created.name },
        },
      })
      return tx.planPackage.findUniqueOrThrow({ where: { id: created.id }, include: { features: true } })
    })
    return packageDto(planPackage)
  })

  app.put('/packages/:id', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const body = packagePayloadSchema.parse(request.body)
    const existing = await app.prisma.planPackage.findUnique({ where: { id: params.id } })
    if (!existing) throw new AppError('not_found', 'Paket tidak ditemukan')

    const planPackage = await app.prisma.$transaction(async (tx) => {
      const updated = await tx.planPackage.update({
        where: { id: params.id },
        data: {
          code: body.code,
          name: body.name,
          description: body.description,
          status: body.status,
          monthlyPrice: body.monthly_price,
          yearlyPrice: body.yearly_price,
          originalMonthlyPrice: body.original_monthly_price,
          trialDays: body.trial_days,
          sortOrder: body.sort_order,
          warehouseLimit: body.limits?.warehouses,
          productLimit: body.limits?.products,
          userLimit: body.limits?.users,
        },
      })
      await upsertPackageFeatures(tx, updated.id, body.features)
      await tx.auditLog.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          action: 'admin.package.updated',
          entityType: 'plan_package',
          entityId: updated.id,
          metadata: { code: updated.code, name: updated.name },
        },
      })
      return tx.planPackage.findUniqueOrThrow({ where: { id: updated.id }, include: { features: true } })
    })
    return packageDto(planPackage)
  })

  app.post('/packages/:id/archive', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const planPackage = await app.prisma.planPackage.update({
      where: { id: params.id },
      data: { status: 'archived' },
      include: { features: true },
    })
    await app.prisma.auditLog.create({
      data: {
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: 'admin.package.archived',
        entityType: 'plan_package',
        entityId: planPackage.id,
        metadata: { code: planPackage.code },
      },
    })
    return packageDto(planPackage)
  })

  app.get('/addons', async (request) => {
    await requirePlatformAdmin(app, request)
    const query = z.object({ status: catalogStatusSchema.optional() }).parse(request.query)
    const addons = await app.prisma.addon.findMany({
      where: query.status ? { status: query.status } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return addons.map(addonDto)
  })

  app.post('/addons', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const body = addonPayloadSchema.required({ code: true, name: true }).parse(request.body)
    const addon = await app.prisma.addon.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        status: body.status ?? 'active',
        monthlyPrice: body.monthly_price ?? 0,
        yearlyPrice: body.yearly_price ?? null,
        featureKey: body.feature_key ?? null,
        limitKey: body.limit_key ?? null,
        limitIncrement: body.limit_increment ?? null,
        sortOrder: body.sort_order ?? 100,
      },
    })
    await app.prisma.auditLog.create({
      data: {
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: 'admin.addon.created',
        entityType: 'addon',
        entityId: addon.id,
        metadata: { code: addon.code, name: addon.name },
      },
    })
    return addonDto(addon)
  })

  app.put('/addons/:id', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const body = addonPayloadSchema.parse(request.body)
    const addon = await app.prisma.addon.update({
      where: { id: params.id },
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        status: body.status,
        monthlyPrice: body.monthly_price,
        yearlyPrice: body.yearly_price,
        featureKey: body.feature_key,
        limitKey: body.limit_key,
        limitIncrement: body.limit_increment,
        sortOrder: body.sort_order,
      },
    })
    await app.prisma.auditLog.create({
      data: {
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: 'admin.addon.updated',
        entityType: 'addon',
        entityId: addon.id,
        metadata: { code: addon.code, name: addon.name },
      },
    })
    return addonDto(addon)
  })

  app.post('/addons/:id/archive', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const addon = await app.prisma.addon.update({ where: { id: params.id }, data: { status: 'archived' } })
    await app.prisma.auditLog.create({
      data: {
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: 'admin.addon.archived',
        entityType: 'addon',
        entityId: addon.id,
        metadata: { code: addon.code },
      },
    })
    return addonDto(addon)
  })

  app.get('/workspaces/:workspaceId/addons', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const assignments = await app.prisma.workspaceAddon.findMany({
      where: { workspaceId: params.workspaceId },
      include: { addon: true },
      orderBy: { createdAt: 'desc' },
    })
    return assignments.map(workspaceAddonDto)
  })

  app.post('/workspaces/:workspaceId/addons', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const body = z.object({
      addon_id: z.string().optional(),
      addon_code: z.string().optional(),
      billing_cycle: billingCycleSchema.default('manual'),
      quantity: z.coerce.number().int().min(1).max(999).default(1),
      current_period_start: z.string().datetime().optional(),
      current_period_end: z.string().datetime().nullable().optional(),
    }).parse(request.body)
    const workspace = await app.prisma.workspace.findUnique({ where: { id: params.workspaceId } })
    if (!workspace) throw new AppError('not_found', 'Workspace tidak ditemukan')

    const addon = body.addon_id
      ? await app.prisma.addon.findUnique({ where: { id: body.addon_id } })
      : await app.prisma.addon.findUnique({ where: { code: body.addon_code ?? '' } })
    if (!addon || addon.status !== 'active') throw new AppError('not_found', 'Add-on aktif tidak ditemukan')

    const periodStart = body.current_period_start ? new Date(body.current_period_start) : new Date()
    const periodEnd = body.current_period_end ? new Date(body.current_period_end) : null
    if (periodEnd && periodEnd <= periodStart) {
      throw new AppError('validation_error', 'Tanggal akhir add-on harus setelah tanggal mulai')
    }

    const assignment = await app.prisma.$transaction(async (tx) => {
      await tx.workspaceAddon.updateMany({
        where: { workspaceId: params.workspaceId, addonId: addon.id, status: 'active' },
        data: { status: 'cancelled', cancelAtPeriodEnd: true },
      })
      const created = await tx.workspaceAddon.create({
        data: {
          workspaceId: params.workspaceId,
          addonId: addon.id,
          status: 'active',
          billingCycle: body.billing_cycle,
          quantity: body.quantity,
          amountSnapshot: billingAmount(addon, body.billing_cycle) * body.quantity,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          assignedById: ctx.userId,
        },
        include: { addon: true },
      })
      await tx.subscriptionEvent.create({
        data: {
          workspaceId: params.workspaceId,
          workspaceAddonId: created.id,
          userId: ctx.userId,
          type: 'addon.assigned',
          metadata: { addon_code: addon.code, quantity: body.quantity, billing_cycle: body.billing_cycle },
        },
      })
      await tx.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          userId: ctx.userId,
          action: 'admin.addon.assigned',
          entityType: 'workspace_addon',
          entityId: created.id,
          metadata: { addon_code: addon.code, quantity: body.quantity, billing_cycle: body.billing_cycle },
        },
      })
      return created
    })
    return workspaceAddonDto(assignment)
  })

  app.post('/workspaces/:workspaceId/addons/:assignmentId/cancel', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), assignmentId: z.string() }).parse(request.params)
    const assignment = await app.prisma.$transaction(async (tx) => {
      const updated = await tx.workspaceAddon.update({
        where: { id: params.assignmentId },
        data: { status: 'cancelled', cancelAtPeriodEnd: true },
        include: { addon: true },
      })
      if (updated.workspaceId !== params.workspaceId) throw new AppError('not_found', 'Add-on workspace tidak ditemukan')
      await tx.subscriptionEvent.create({
        data: {
          workspaceId: params.workspaceId,
          workspaceAddonId: updated.id,
          userId: ctx.userId,
          type: 'addon.cancelled',
          metadata: { addon_code: updated.addon.code },
        },
      })
      await tx.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          userId: ctx.userId,
          action: 'admin.addon.cancelled',
          entityType: 'workspace_addon',
          entityId: updated.id,
          metadata: { addon_code: updated.addon.code },
        },
      })
      return updated
    })
    return workspaceAddonDto(assignment)
  })
}
