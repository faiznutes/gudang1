import type { FastifyInstance } from 'fastify'
import type { BillingCycle, BillingRequestType, CustomizationClassification } from '@stockpilot/shared'
import type { AuthContext } from '../middleware/auth.js'
import { AppError } from './errors.js'
import { billingAmount, legacyPlanForCode } from './plans.js'
import { getPlatformWorkspaceId } from './settings.js'

const OPEN_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'] as const

export interface BillingRequestCreateInput {
  type: BillingRequestType
  packageCode?: string
  packageId?: string
  addonCode?: string
  addonId?: string
  billingCycle?: Exclude<BillingCycle, 'manual'> | BillingCycle
  quantity?: number
  requestedLimitKey?: string
  requestedLimitValue?: number
  requestedActivationDate?: Date | null
  title?: string
  notes?: string
  metadata?: Record<string, unknown>
}

export interface BillingRequestDecisionInput {
  notes?: string
  approvedAmount?: number
  promotionalAmount?: number
  approvedActivationDate?: Date | null
  temporaryAccessUntil?: Date | null
  classification?: CustomizationClassification
  rejectionReason?: string
}

function cycleEnd(start: Date, cycle: BillingCycle, temporaryAccessUntil?: Date | null) {
  if (temporaryAccessUntil) return temporaryAccessUntil
  if (cycle === 'manual') return null
  const end = new Date(start)
  if (cycle === 'yearly') end.setFullYear(end.getFullYear() + 1)
  else end.setMonth(end.getMonth() + 1)
  return end
}

function userMini(user: any) {
  if (!user) return null
  return { id: user.id, name: user.name, email: user.email }
}

function packageMini(planPackage: any) {
  if (!planPackage) return null
  return {
    id: planPackage.id,
    code: planPackage.code,
    name: planPackage.name,
    monthly_price: planPackage.monthlyPrice,
    yearly_price: planPackage.yearlyPrice,
  }
}

function addonDto(addon: any) {
  if (!addon) return null
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
    created_at: addon.createdAt?.toISOString?.(),
    updated_at: addon.updatedAt?.toISOString?.(),
  }
}

export function billingRequestDto(request: any) {
  return {
    id: request.id,
    workspace_id: request.workspaceId,
    workspace_name: request.workspace?.name,
    requested_by: userMini(request.requestedBy),
    reviewed_by: userMini(request.reviewedBy),
    type: request.type,
    status: request.status,
    title: request.title,
    current_package: packageMini(request.currentPlanPackage),
    requested_package: packageMini(request.requestedPlanPackage),
    addon: addonDto(request.addon),
    billing_cycle: request.billingCycle,
    quantity: request.quantity,
    requested_limit_key: request.requestedLimitKey,
    requested_limit_value: request.requestedLimitValue,
    current_amount: request.currentAmount,
    requested_amount: request.requestedAmount,
    billing_impact: request.billingImpact,
    approved_amount: request.approvedAmount,
    promotional_amount: request.promotionalAmount,
    temporary_access_until: request.temporaryAccessUntil?.toISOString?.() ?? null,
    requested_activation_date: request.requestedActivationDate?.toISOString?.() ?? null,
    approved_activation_date: request.approvedActivationDate?.toISOString?.() ?? null,
    notes: request.notes,
    admin_notes: request.adminNotes,
    rejection_reason: request.rejectionReason,
    classification: request.classification,
    metadata: request.metadata ?? null,
    decided_at: request.decidedAt?.toISOString?.() ?? null,
    created_at: request.createdAt.toISOString(),
    updated_at: request.updatedAt.toISOString(),
    history: (request.history ?? []).map((history: any) => ({
      id: history.id,
      action: history.action,
      from_status: history.fromStatus,
      to_status: history.toStatus,
      notes: history.notes,
      metadata: history.metadata ?? null,
      user: userMini(history.user),
      created_at: history.createdAt.toISOString(),
    })),
  }
}

export function includeBillingRequestRelations() {
  return {
    workspace: true,
    requestedBy: true,
    reviewedBy: true,
    currentPlanPackage: true,
    requestedPlanPackage: true,
    addon: true,
    history: {
      include: { user: true },
      orderBy: { createdAt: 'asc' as const },
    },
  }
}

async function loadWorkspaceSnapshot(app: FastifyInstance, workspaceId: string) {
  const [workspace, usage, latestEvents] = await Promise.all([
    app.prisma.workspace.findUnique({ where: { id: workspaceId } }),
    Promise.all([
      app.prisma.warehouse.count({ where: { workspaceId, disabledAt: null } }),
      app.prisma.product.count({ where: { workspaceId, disabledAt: null } }),
      app.prisma.workspaceMember.count({ where: { workspaceId, user: { disabledAt: null } } }),
      app.prisma.supplier.count({ where: { workspaceId, disabledAt: null } }),
    ]),
    app.prisma.subscriptionEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])
  if (!workspace) throw new AppError('not_found', 'Workspace tidak ditemukan')
  return {
    workspace,
    usage: {
      warehouses: usage[0],
      products: usage[1],
      users: usage[2],
      suppliers: usage[3],
    },
    payment_history: latestEvents.map(event => ({
      type: event.type,
      created_at: event.createdAt.toISOString(),
      metadata: event.metadata,
    })),
  }
}

async function findCurrentSubscription(app: FastifyInstance, workspaceId: string) {
  return app.prisma.subscription.findFirst({
    where: {
      workspaceId,
      status: { in: [...OPEN_SUBSCRIPTION_STATUSES] as any },
    },
    include: { planPackage: true },
    orderBy: [{ currentPeriodEnd: 'desc' }, { createdAt: 'desc' }],
  })
}

async function findPlanPackage(app: FastifyInstance, codeOrId?: { code?: string; id?: string }) {
  if (!codeOrId?.id && !codeOrId?.code) return null
  const planPackage = codeOrId.id
    ? await app.prisma.planPackage.findUnique({ where: { id: codeOrId.id } })
    : await app.prisma.planPackage.findUnique({ where: { code: codeOrId.code ?? '' } })
  if (!planPackage || planPackage.status !== 'active') {
    throw new AppError('not_found', 'Paket aktif tidak ditemukan')
  }
  return planPackage
}

async function findAddon(app: FastifyInstance, codeOrId?: { code?: string; id?: string }) {
  if (!codeOrId?.id && !codeOrId?.code) return null
  const addon = codeOrId.id
    ? await app.prisma.addon.findUnique({ where: { id: codeOrId.id } })
    : await app.prisma.addon.findUnique({ where: { code: codeOrId.code ?? '' } })
  if (!addon || addon.status !== 'active') {
    throw new AppError('not_found', 'Add-on aktif tidak ditemukan')
  }
  return addon
}

async function createNotification(tx: any, workspaceId: string | null, userId: string | null, type: string, payload: Record<string, unknown>) {
  if (!tx.notificationDelivery?.create) return
  await tx.notificationDelivery.create({
    data: {
      workspaceId,
      userId,
      type,
      payload,
    },
  })
}

function requestTitle(type: BillingRequestType, input: BillingRequestCreateInput, planPackage: any, addon: any) {
  if (input.title?.trim()) return input.title.trim()
  if (type === 'plan_change') return `Request perubahan paket ke ${planPackage?.name ?? input.packageCode}`
  if (type === 'addon_activation') return `Request aktivasi add-on ${addon?.name ?? input.addonCode}`
  if (type === 'limit_increase') return `Request tambah limit ${input.requestedLimitKey ?? 'operasional'}`
  if (type === 'subscription_extension') return 'Request perpanjangan subscription'
  if (type === 'enterprise_customization') return 'Request kustomisasi enterprise'
  if (type === 'manual_adjustment') return 'Request penyesuaian billing manual'
  return 'Request fitur kustom'
}

export async function createBillingRequest(app: FastifyInstance, ctx: AuthContext, input: BillingRequestCreateInput) {
  const type = input.type
  const billingCycle = input.billingCycle ?? 'monthly'
  const quantity = Math.max(1, input.quantity ?? 1)
  const currentSubscription = await findCurrentSubscription(app, ctx.workspaceId)
  const snapshot = await loadWorkspaceSnapshot(app, ctx.workspaceId)
  const currentPackage = currentSubscription?.planPackage
    ?? await findPlanPackage(app, { code: currentSubscription?.plan ?? snapshot.workspace.plan })
  const requestedPackage = type === 'plan_change'
    ? await findPlanPackage(app, { id: input.packageId, code: input.packageCode })
    : null
  const addon = type === 'addon_activation'
    ? await findAddon(app, { id: input.addonId, code: input.addonCode })
    : null

  if (type === 'plan_change' && !requestedPackage) {
    throw new AppError('validation_error', 'Paket tujuan harus dipilih')
  }
  if (type === 'addon_activation' && !addon) {
    throw new AppError('validation_error', 'Add-on harus dipilih')
  }
  if (type === 'limit_increase' && (!input.requestedLimitKey || !input.requestedLimitValue)) {
    throw new AppError('validation_error', 'Limit dan nilai baru harus diisi')
  }

  const currentAmount = currentSubscription?.amountSnapshot && currentSubscription.amountSnapshot > 0
    ? currentSubscription.amountSnapshot
    : currentPackage
      ? billingAmount(currentPackage, currentSubscription?.billingCycle ?? 'monthly')
      : 0
  const requestedAmount = requestedPackage
    ? billingAmount(requestedPackage, billingCycle)
    : addon
      ? billingAmount(addon, billingCycle) * quantity
      : 0
  const billingImpact = type === 'plan_change' ? requestedAmount - currentAmount : requestedAmount

  if (type === 'plan_change' || type === 'addon_activation') {
    const duplicate = await app.prisma.billingRequest.findFirst({
      where: {
        workspaceId: ctx.workspaceId,
        status: 'pending',
        type,
        ...(requestedPackage ? { requestedPlanPackageId: requestedPackage.id } : {}),
        ...(addon ? { addonId: addon.id } : {}),
      },
      select: { id: true },
    })
    if (duplicate) {
      throw new AppError('conflict', 'Request yang sama masih menunggu approval super admin')
    }
  }

  const platformWorkspaceId = await getPlatformWorkspaceId(app)
  const request = await app.prisma.$transaction(async (tx) => {
    const created = await tx.billingRequest.create({
      data: {
        workspaceId: ctx.workspaceId,
        requestedById: ctx.userId,
        type,
        currentPlanPackageId: currentPackage?.id,
        requestedPlanPackageId: requestedPackage?.id,
        addonId: addon?.id,
        billingCycle,
        quantity,
        requestedLimitKey: input.requestedLimitKey,
        requestedLimitValue: input.requestedLimitValue,
        currentAmount,
        requestedAmount,
        billingImpact,
        requestedActivationDate: input.requestedActivationDate ?? null,
        title: requestTitle(type, input, requestedPackage, addon),
        notes: input.notes,
        metadata: {
          ...(input.metadata ?? {}),
          usage: snapshot.usage,
          payment_history: snapshot.payment_history,
          current_subscription_status: currentSubscription?.status ?? 'none',
        },
      },
    })
    await tx.billingRequestHistory.create({
      data: {
        billingRequestId: created.id,
        userId: ctx.userId,
        action: 'tenant.request.created',
        toStatus: 'pending',
        notes: input.notes,
        metadata: { type, billing_impact: billingImpact },
      },
    })
    await tx.auditLog.create({
      data: {
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        action: 'billing.request.created',
        entityType: 'billing_request',
        entityId: created.id,
        metadata: { type, billing_impact: billingImpact, package_code: requestedPackage?.code, addon_code: addon?.code },
      },
    })
    await createNotification(tx, platformWorkspaceId, null, 'billing.request.created', {
      request_id: created.id,
      workspace_id: ctx.workspaceId,
      workspace_name: snapshot.workspace.name,
      type,
      title: created.title,
      billing_impact: billingImpact,
    })
    return tx.billingRequest.findUniqueOrThrow({ where: { id: created.id }, include: includeBillingRequestRelations() })
  })

  return billingRequestDto(request)
}

export async function approveBillingRequest(app: FastifyInstance, ctx: AuthContext, id: string, input: BillingRequestDecisionInput) {
  const existing = await app.prisma.billingRequest.findUnique({
    where: { id },
    include: includeBillingRequestRelations(),
  })
  if (!existing) throw new AppError('not_found', 'Request billing tidak ditemukan')
  if (existing.status !== 'pending') throw new AppError('conflict', 'Request ini sudah diproses')

  const now = new Date()
  const approvedAmount = input.approvedAmount ?? input.promotionalAmount ?? existing.requestedAmount
  const approvedActivationDate = input.approvedActivationDate ?? now

  const updated = await app.prisma.$transaction(async (tx) => {
    let subscriptionId: string | null = null
    let workspaceAddonId: string | null = null

    if (existing.type === 'plan_change' && existing.requestedPlanPackage) {
      const planPackage = existing.requestedPlanPackage
      const periodEnd = cycleEnd(now, existing.billingCycle, input.temporaryAccessUntil)
      await tx.workspace.update({
        where: { id: existing.workspaceId },
        data: { plan: legacyPlanForCode(planPackage.code), status: 'active', trialEndsAt: null },
      })
      await tx.subscription.updateMany({
        where: { workspaceId: existing.workspaceId, status: { in: ['active', 'trialing', 'past_due'] } },
        data: { status: 'cancelled', cancelAtPeriodEnd: true },
      })
      const created = await tx.subscription.create({
        data: {
          workspaceId: existing.workspaceId,
          planPackageId: planPackage.id,
          plan: legacyPlanForCode(planPackage.code),
          status: 'active',
          billingCycle: existing.billingCycle,
          amountSnapshot: approvedAmount,
          source: 'admin',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd ?? cycleEnd(now, 'monthly')!,
        },
      })
      subscriptionId = created.id
      await tx.subscriptionEvent.create({
        data: {
          workspaceId: existing.workspaceId,
          subscriptionId: created.id,
          userId: ctx.userId,
          type: 'subscription.plan_change.approved',
          metadata: { request_id: existing.id, package_code: planPackage.code, approved_amount: approvedAmount },
        },
      })
    }

    if (existing.type === 'addon_activation' && existing.addon) {
      const periodEnd = cycleEnd(now, existing.billingCycle, input.temporaryAccessUntil)
      await tx.workspaceAddon.updateMany({
        where: { workspaceId: existing.workspaceId, addonId: existing.addon.id, status: 'active' },
        data: { status: 'cancelled', cancelAtPeriodEnd: true },
      })
      const created = await tx.workspaceAddon.create({
        data: {
          workspaceId: existing.workspaceId,
          addonId: existing.addon.id,
          status: 'active',
          billingCycle: existing.billingCycle,
          quantity: existing.quantity,
          amountSnapshot: approvedAmount,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          assignedById: ctx.userId,
        },
      })
      workspaceAddonId = created.id
      await tx.subscriptionEvent.create({
        data: {
          workspaceId: existing.workspaceId,
          workspaceAddonId: created.id,
          userId: ctx.userId,
          type: 'addon.activation.approved',
          metadata: { request_id: existing.id, addon_code: existing.addon.code, approved_amount: approvedAmount },
        },
      })
    }

    if (existing.type === 'limit_increase' && existing.requestedLimitKey && existing.requestedLimitValue) {
      await tx.entitlement.upsert({
        where: {
          workspaceId_feature: {
            workspaceId: existing.workspaceId,
            feature: existing.requestedLimitKey,
          },
        },
        update: {
          enabled: true,
          limit: existing.requestedLimitValue,
          expiresAt: input.temporaryAccessUntil ?? null,
        },
        create: {
          workspaceId: existing.workspaceId,
          feature: existing.requestedLimitKey,
          enabled: true,
          limit: existing.requestedLimitValue,
          expiresAt: input.temporaryAccessUntil ?? null,
        },
      })
      await tx.subscriptionEvent.create({
        data: {
          workspaceId: existing.workspaceId,
          userId: ctx.userId,
          type: 'limit.increase.approved',
          metadata: { request_id: existing.id, limit_key: existing.requestedLimitKey, limit_value: existing.requestedLimitValue },
        },
      })
    }

    if (existing.type === 'subscription_extension') {
      const extensionDays = Number((existing.metadata as any)?.extension_days ?? existing.requestedLimitValue ?? 30)
      const current = await tx.subscription.findFirst({
        where: { workspaceId: existing.workspaceId, status: { in: ['active', 'trialing', 'past_due', 'expired'] } },
        orderBy: [{ currentPeriodEnd: 'desc' }, { createdAt: 'desc' }],
      })
      if (current) {
        const startFrom = current.currentPeriodEnd > now ? current.currentPeriodEnd : now
        const nextEnd = new Date(startFrom)
        nextEnd.setDate(nextEnd.getDate() + Math.max(1, extensionDays))
        await tx.subscription.update({
          where: { id: current.id },
          data: { currentPeriodEnd: nextEnd, status: 'active', cancelAtPeriodEnd: false },
        })
        subscriptionId = current.id
      }
    }

    const changed = await tx.billingRequest.update({
      where: { id: existing.id },
      data: {
        status: 'approved',
        reviewedById: ctx.userId,
        adminNotes: input.notes,
        approvedAmount,
        promotionalAmount: input.promotionalAmount,
        approvedActivationDate,
        temporaryAccessUntil: input.temporaryAccessUntil,
        classification: input.classification,
        decidedAt: now,
      },
    })
    await tx.billingRequestHistory.create({
      data: {
        billingRequestId: existing.id,
        userId: ctx.userId,
        action: 'admin.request.approved',
        fromStatus: 'pending',
        toStatus: 'approved',
        notes: input.notes,
        metadata: {
          approved_amount: approvedAmount,
          promotional_amount: input.promotionalAmount,
          subscription_id: subscriptionId,
          workspace_addon_id: workspaceAddonId,
          classification: input.classification,
        },
      },
    })
    await tx.auditLog.create({
      data: {
        workspaceId: existing.workspaceId,
        userId: ctx.userId,
        action: 'billing.request.approved',
        entityType: 'billing_request',
        entityId: existing.id,
        metadata: { type: existing.type, approved_amount: approvedAmount, subscription_id: subscriptionId, workspace_addon_id: workspaceAddonId },
      },
    })
    await createNotification(tx, existing.workspaceId, existing.requestedById, 'billing.request.approved', {
      request_id: existing.id,
      title: existing.title,
      approved_amount: approvedAmount,
      classification: input.classification,
    })
    return tx.billingRequest.findUniqueOrThrow({ where: { id: changed.id }, include: includeBillingRequestRelations() })
  })

  return billingRequestDto(updated)
}

export async function rejectBillingRequest(app: FastifyInstance, ctx: AuthContext, id: string, input: BillingRequestDecisionInput) {
  const existing = await app.prisma.billingRequest.findUnique({ where: { id } })
  if (!existing) throw new AppError('not_found', 'Request billing tidak ditemukan')
  if (existing.status !== 'pending') throw new AppError('conflict', 'Request ini sudah diproses')

  const updated = await app.prisma.$transaction(async (tx) => {
    const changed = await tx.billingRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedById: ctx.userId,
        adminNotes: input.notes,
        rejectionReason: input.rejectionReason ?? input.notes,
        classification: input.classification ?? 'rejected',
        decidedAt: new Date(),
      },
    })
    await tx.billingRequestHistory.create({
      data: {
        billingRequestId: id,
        userId: ctx.userId,
        action: 'admin.request.rejected',
        fromStatus: 'pending',
        toStatus: 'rejected',
        notes: input.rejectionReason ?? input.notes,
        metadata: { classification: input.classification ?? 'rejected' },
      },
    })
    await tx.auditLog.create({
      data: {
        workspaceId: existing.workspaceId,
        userId: ctx.userId,
        action: 'billing.request.rejected',
        entityType: 'billing_request',
        entityId: id,
        metadata: { type: existing.type, classification: input.classification ?? 'rejected' },
      },
    })
    await createNotification(tx, existing.workspaceId, existing.requestedById, 'billing.request.rejected', {
      request_id: existing.id,
      title: existing.title,
      reason: input.rejectionReason ?? input.notes,
      classification: input.classification ?? 'rejected',
    })
    return tx.billingRequest.findUniqueOrThrow({ where: { id: changed.id }, include: includeBillingRequestRelations() })
  })

  return billingRequestDto(updated)
}
