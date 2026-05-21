import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { AppError } from '../lib/errors.js'
import { userDto, workspaceDto } from '../lib/mappers.js'
import { requireAuth, requirePlatformRole } from '../middleware/auth.js'
import { billingAmount, legacyPlanForCode, PLAN_CATALOG, planPrice } from '../lib/plans.js'

const pageSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().optional(),
  status: z.string().optional(),
  plan: z.string().optional(),
  role: z.string().optional(),
  workspace_id: z.string().optional(),
})

const planSchema = z.enum(['free', 'starter', 'growth', 'pro', 'custom'])
const workspaceStatusSchema = z.enum(['active', 'suspended', 'trial'])
const subscriptionStatusSchema = z.enum(['active', 'cancelled', 'past_due', 'expired', 'trialing'])
const tenantRoleSchema = z.enum(['admin', 'staff', 'supplier', 'trial'])

const tenantCreateSchema = z.object({
  name: z.string().min(2),
  plan: planSchema.default('starter'),
  status: workspaceStatusSchema.default('active'),
  subscription_status: subscriptionStatusSchema.default('active'),
  current_period_start: z.string().datetime().optional(),
  current_period_end: z.string().datetime().optional(),
  owner: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
  }),
  warehouse: z.object({
    name: z.string().min(1).default('Gudang Utama'),
    address: z.string().optional(),
  }).default({ name: 'Gudang Utama' }),
  staff: z.array(z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: tenantRoleSchema.exclude(['trial']).default('staff'),
  })).max(20).default([]),
  suppliers: z.array(z.object({
    name: z.string().min(1),
    contact_person: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    notes: z.string().optional(),
  })).max(50).default([]),
})

function paginate<T>(data: T[], page: number, perPage: number, total: number) {
  return {
    data,
    meta: {
      current_page: page,
      per_page: perPage,
      total,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
    },
  }
}

function subscriptionDto(subscription: {
  id: string
  workspaceId: string
  plan: string
  status: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  billingCycle?: string
  amountSnapshot?: number
  planPackage?: { code: string; name: string; monthlyPrice: number; yearlyPrice?: number | null } | null
  workspace?: { id: string; name: string; plan: string; status: string } | null
}) {
  const amount = subscription.amountSnapshot && subscription.amountSnapshot > 0
    ? subscription.amountSnapshot
    : subscription.planPackage
      ? billingAmount(subscription.planPackage as any, subscription.billingCycle as any)
      : planPrice(subscription.plan)
  return {
    id: subscription.id,
    workspace_id: subscription.workspaceId,
    workspace: subscription.workspace
      ? {
          id: subscription.workspace.id,
          name: subscription.workspace.name,
          plan: subscription.workspace.plan,
          status: subscription.workspace.status,
        }
      : undefined,
    plan: subscription.plan,
    package_code: subscription.planPackage?.code ?? subscription.plan,
    package_name: subscription.planPackage?.name ?? undefined,
    status: subscription.status,
    amount,
    billing_cycle: subscription.billingCycle ?? 'monthly',
    current_period_start: subscription.currentPeriodStart.toISOString(),
    current_period_end: subscription.currentPeriodEnd.toISOString(),
    next_billing: subscription.cancelAtPeriodEnd ? null : subscription.currentPeriodEnd.toISOString(),
    cancel_at_period_end: subscription.cancelAtPeriodEnd,
  }
}

function auditCategory(log: { action: string; entityType: string }) {
  if (log.action.includes('login') || log.action.includes('logout') || log.action.includes('role')) return 'security'
  if (log.entityType.includes('subscription') || log.action.includes('subscription')) return 'subscription'
  if (log.entityType.includes('workspace') || log.action.includes('workspace')) return 'workspace'
  if (log.entityType.includes('system') || log.action.includes('settings')) return 'system'
  return 'user'
}

function auditLogDto(log: {
  id: string
  workspaceId: string
  userId: string | null
  action: string
  entityType: string
  entityId: string | null
  metadata: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  workspace?: { id: string; name: string } | null
  user?: { id: string; name: string; email: string } | null
}) {
  return {
    id: log.id,
    workspace_id: log.workspaceId,
    workspace: log.workspace ? { id: log.workspace.id, name: log.workspace.name } : undefined,
    user_id: log.userId ?? undefined,
    user: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email } : undefined,
    action: log.action,
    category: auditCategory(log),
    entity_type: log.entityType,
    entity_id: log.entityId ?? undefined,
    metadata: log.metadata ?? undefined,
    ip_address: log.ipAddress ?? undefined,
    user_agent: log.userAgent ?? undefined,
    created_at: log.createdAt.toISOString(),
  }
}

async function lastLoginLookup(app: FastifyInstance, memberships: Array<{ userId: string; workspaceId: string }>) {
  if (memberships.length === 0) return new Map<string, string>()

  const logs = await app.prisma.auditLog.findMany({
    where: {
      action: 'auth.login',
      entityType: 'auth_session',
      OR: memberships.map(member => ({
        userId: member.userId,
        workspaceId: member.workspaceId,
      })),
    },
    select: {
      userId: true,
      workspaceId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const lookup = new Map<string, string>()
  for (const log of logs) {
    if (!log.userId) continue
    const key = `${log.userId}:${log.workspaceId}`
    if (!lookup.has(key)) lookup.set(key, log.createdAt.toISOString())
  }
  return lookup
}

function pickOwner(members: Array<{ role: string; user: { id: string; name: string; email: string } }>) {
  return members.find(member => member.role === 'admin') ?? members.find(member => member.role === 'super_admin') ?? members[0]
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

type DashboardGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly'

function startOfBucket(date: Date, granularity: DashboardGranularity) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  if (granularity === 'weekly') {
    const day = next.getDay()
    next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day))
  }
  if (granularity === 'monthly') {
    next.setDate(1)
  }
  if (granularity === 'yearly') {
    next.setMonth(0, 1)
  }
  return next
}

function addBucket(date: Date, granularity: DashboardGranularity, count = 1) {
  const next = new Date(date)
  if (granularity === 'daily') next.setDate(next.getDate() + count)
  if (granularity === 'weekly') next.setDate(next.getDate() + count * 7)
  if (granularity === 'monthly') next.setMonth(next.getMonth() + count)
  if (granularity === 'yearly') next.setFullYear(next.getFullYear() + count)
  return next
}

function bucketKey(date: Date, granularity: DashboardGranularity) {
  const bucket = startOfBucket(date, granularity)
  if (granularity === 'yearly') return String(bucket.getFullYear())
  if (granularity === 'monthly') return `${bucket.getFullYear()}-${String(bucket.getMonth() + 1).padStart(2, '0')}`
  return bucket.toISOString().slice(0, 10)
}

function buildDashboardBuckets(range: string, from?: string, to?: string) {
  const now = new Date()
  let granularity: DashboardGranularity = range === 'yearly' ? 'yearly' : range === 'weekly' ? 'weekly' : range === 'daily' ? 'daily' : 'monthly'
  let start: Date
  let end = now

  if (range === 'custom' && from && to) {
    start = new Date(from)
    end = new Date(to)
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    granularity = days > 120 ? 'monthly' : 'daily'
  } else if (granularity === 'daily') {
    start = addBucket(now, 'daily', -13)
  } else if (granularity === 'weekly') {
    start = addBucket(now, 'weekly', -7)
  } else if (granularity === 'yearly') {
    start = addBucket(now, 'yearly', -4)
  } else {
    start = addBucket(now, 'monthly', -11)
  }

  start = startOfBucket(start, granularity)
  end = addBucket(startOfBucket(end, granularity), granularity)
  const buckets: Array<{ key: string; label: string; start: Date }> = []
  for (let cursor = new Date(start); cursor < end; cursor = addBucket(cursor, granularity)) {
    buckets.push({ key: bucketKey(cursor, granularity), label: bucketKey(cursor, granularity), start: new Date(cursor) })
  }
  return { granularity, start, end, buckets }
}

async function ensureTenantUserAvailable(tx: any, email: string, workspaceId: string) {
  const normalizedEmail = email.toLowerCase()
  const existing = await tx.user.findUnique({
    where: { email: normalizedEmail },
    include: { memberships: true },
  })
  if (!existing) return null
  if (existing.role === 'super_admin') {
    throw new AppError('conflict', 'Email super admin tidak boleh digunakan sebagai user tenant')
  }
  const otherTenantMembership = existing.memberships.find((membership: { workspaceId: string }) => membership.workspaceId !== workspaceId)
  if (otherTenantMembership) {
    throw new AppError('conflict', 'Email ini sudah terhubung ke tenant lain')
  }
  return existing
}

async function requirePlatformAdmin(app: FastifyInstance, request: any) {
  const ctx = await requireAuth(app, request, { tenantHeaderMode: 'ignore' })
  requirePlatformRole(ctx, ['super_admin'])
  return ctx
}

export async function adminRoutes(app: FastifyInstance) {
  app.get('/dashboard/stats', async (request) => {
    await requirePlatformAdmin(app, request)
    const query = z.object({
      range: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']).default('monthly'),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    }).parse(request.query)
    const trendRange = buildDashboardBuckets(query.range, query.from, query.to)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const [
      totalWorkspaces,
      activeWorkspaces,
      trialWorkspaces,
      totalUsers,
      subscriptions,
      activeAddons,
      recentSignupCount,
      recentUsers,
      recentWorkspaces,
      workspacesByPlan,
      totalProducts,
      totalWarehouses,
      totalSuppliers,
      stockMovements7d,
      pendingApprovals,
      pendingBillingRequests,
      expiringSubscriptions,
      inventoryForLowStock,
      recentAuditLogs,
      trendSubscriptions,
      trendAddons,
      trendRequests,
      trendWorkspaces,
      trendMovements,
    ] = await Promise.all([
      app.prisma.workspace.count(),
      app.prisma.workspace.count({ where: { status: 'active' } }),
      app.prisma.workspace.count({ where: { status: 'trial' } }),
      app.prisma.user.count(),
      app.prisma.subscription.findMany({
        where: { status: 'active', plan: { not: 'free' } },
        include: { planPackage: true },
      }),
      app.prisma.workspaceAddon.findMany({
        where: { status: 'active' },
        include: { addon: true },
      }),
      app.prisma.workspace.count({ where: { createdAt: { gte: since } } }),
      app.prisma.workspaceMember.findMany({
        include: { user: true, workspace: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      app.prisma.workspace.findMany({
        include: { members: { include: { user: true } }, _count: { select: { members: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      app.prisma.workspace.groupBy({ by: ['plan'], _count: { _all: true } }),
      app.prisma.product.count({ where: { disabledAt: null } }),
      app.prisma.warehouse.count({ where: { disabledAt: null } }),
      app.prisma.supplier.count({ where: { disabledAt: null } }),
      app.prisma.stockMovement.count({ where: { createdAt: { gte: since } } }),
      app.prisma.scheduledActivity.count({
        where: {
          disabledAt: null,
          status: { in: ['pending', 'waiting_approval', 'approval_pending', 'review'] },
        },
      }),
      app.prisma.billingRequest.count({ where: { status: 'pending' } }),
      app.prisma.subscription.count({
        where: {
          status: { in: ['active', 'trialing'] },
          currentPeriodEnd: { gte: new Date(), lte: sevenDaysFromNow },
        },
      }),
      app.prisma.inventoryItem.findMany({
        select: {
          quantity: true,
          product: { select: { minStock: true, disabledAt: true } },
        },
      }),
      app.prisma.auditLog.findMany({
        include: {
          workspace: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      app.prisma.subscription.findMany({
        where: { createdAt: { gte: trendRange.start, lt: trendRange.end } },
        include: { planPackage: true },
      }),
      app.prisma.workspaceAddon.findMany({
        where: { createdAt: { gte: trendRange.start, lt: trendRange.end } },
        include: { addon: true },
      }),
      app.prisma.billingRequest.findMany({
        where: { createdAt: { gte: trendRange.start, lt: trendRange.end } },
      }),
      app.prisma.workspace.findMany({
        where: { createdAt: { gte: trendRange.start, lt: trendRange.end } },
        select: { createdAt: true, status: true, plan: true },
      }),
      app.prisma.stockMovement.findMany({
        where: { createdAt: { gte: trendRange.start, lt: trendRange.end } },
        select: { createdAt: true, type: true },
      }),
    ])

    const lowStockItems = inventoryForLowStock.filter(item => {
      if (item.product.disabledAt) return false
      return item.quantity <= item.product.minStock
    }).length

    const subscriptionRevenue = subscriptions.reduce((sum, subscription) => {
      const amount = subscription.amountSnapshot > 0
        ? subscription.amountSnapshot
        : subscription.planPackage
          ? billingAmount(subscription.planPackage, subscription.billingCycle)
          : planPrice(subscription.plan)
      return sum + amount
    }, 0)
    const addonRevenue = activeAddons.reduce((sum, assignment) => {
      const amount = assignment.amountSnapshot > 0
        ? assignment.amountSnapshot
        : billingAmount(assignment.addon, assignment.billingCycle) * assignment.quantity
      return sum + amount
    }, 0)

    const revenueBuckets = trendRange.buckets.map(bucket => ({
      ...bucket,
      subscription: 0,
      addon: 0,
      total: 0,
    }))
    const tenantBuckets = trendRange.buckets.map(bucket => ({ ...bucket, new_tenants: 0 }))
    const addonBuckets = trendRange.buckets.map(bucket => ({ ...bucket, count: 0, revenue: 0 }))
    const requestBuckets = trendRange.buckets.map(bucket => ({
      ...bucket,
      pending: 0,
      approved: 0,
      rejected: 0,
      plan_changes: 0,
      addon_requests: 0,
      custom_requests: 0,
    }))
    const movementBuckets = trendRange.buckets.map(bucket => ({ ...bucket, in: 0, out: 0, transfer: 0, total: 0 }))

    const revenueByKey = new Map(revenueBuckets.map(bucket => [bucket.key, bucket]))
    const tenantByKey = new Map(tenantBuckets.map(bucket => [bucket.key, bucket]))
    const addonByKey = new Map(addonBuckets.map(bucket => [bucket.key, bucket]))
    const requestByKey = new Map(requestBuckets.map(bucket => [bucket.key, bucket]))
    const movementByKey = new Map(movementBuckets.map(bucket => [bucket.key, bucket]))

    for (const subscription of trendSubscriptions) {
      const bucket = revenueByKey.get(bucketKey(subscription.createdAt, trendRange.granularity))
      if (!bucket) continue
      const amount = subscription.amountSnapshot > 0
        ? subscription.amountSnapshot
        : subscription.planPackage
          ? billingAmount(subscription.planPackage, subscription.billingCycle)
          : planPrice(subscription.plan)
      bucket.subscription += amount
      bucket.total += amount
    }
    for (const assignment of trendAddons) {
      const key = bucketKey(assignment.createdAt, trendRange.granularity)
      const revenueBucket = revenueByKey.get(key)
      const addonBucket = addonByKey.get(key)
      const amount = assignment.amountSnapshot > 0
        ? assignment.amountSnapshot
        : billingAmount(assignment.addon, assignment.billingCycle) * assignment.quantity
      if (revenueBucket) {
        revenueBucket.addon += amount
        revenueBucket.total += amount
      }
      if (addonBucket) {
        addonBucket.count += 1
        addonBucket.revenue += amount
      }
    }
    for (const workspace of trendWorkspaces) {
      const bucket = tenantByKey.get(bucketKey(workspace.createdAt, trendRange.granularity))
      if (bucket) bucket.new_tenants += 1
    }
    for (const billingRequest of trendRequests) {
      const bucket = requestByKey.get(bucketKey(billingRequest.createdAt, trendRange.granularity))
      if (!bucket) continue
      if (billingRequest.status === 'pending') bucket.pending += 1
      if (billingRequest.status === 'approved') bucket.approved += 1
      if (billingRequest.status === 'rejected') bucket.rejected += 1
      if (billingRequest.type === 'plan_change') bucket.plan_changes += 1
      if (billingRequest.type === 'addon_activation') bucket.addon_requests += 1
      if (['custom_feature', 'enterprise_customization'].includes(billingRequest.type)) bucket.custom_requests += 1
    }
    for (const movement of trendMovements) {
      const bucket = movementByKey.get(bucketKey(movement.createdAt, trendRange.granularity))
      if (!bucket) continue
      bucket.total += 1
      if (movement.type === 'in') bucket.in += 1
      if (movement.type === 'out') bucket.out += 1
      if (movement.type === 'transfer') bucket.transfer += 1
    }

    const recentUserLoginMap = await lastLoginLookup(
      app,
      recentUsers.map(member => ({
        userId: member.userId,
        workspaceId: member.workspaceId,
      })),
    )

    return {
      total_workspaces: totalWorkspaces,
      active_workspaces: activeWorkspaces,
      trial_workspaces: trialWorkspaces,
      total_users: totalUsers,
      total_revenue: subscriptionRevenue + addonRevenue,
      subscription_revenue: subscriptionRevenue,
      addon_revenue: addonRevenue,
      active_addons: activeAddons.length,
      active_subscriptions: subscriptions.length,
      pending_approvals: pendingApprovals + pendingBillingRequests,
      pending_billing_requests: pendingBillingRequests,
      expiring_subscriptions: expiringSubscriptions,
      low_stock_items: lowStockItems,
      total_products: totalProducts,
      total_warehouses: totalWarehouses,
      total_suppliers: totalSuppliers,
      stock_movements_7d: stockMovements7d,
      recent_signups: recentSignupCount,
      recent_users: recentUsers.map(member => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
        workspace_id: member.workspaceId,
        workspace_name: member.workspace.name,
        plan: member.workspace.plan,
        created_at: member.createdAt.toISOString(),
        last_login_at: recentUserLoginMap.get(`${member.userId}:${member.workspaceId}`) ?? null,
      })),
      recent_workspaces: recentWorkspaces.map(workspace => {
        const owner = pickOwner(workspace.members)
        return {
          ...workspaceDto(workspace),
          owner_name: owner?.user.name ?? '-',
          owner_email: owner?.user.email ?? '-',
          users: workspace._count.members,
        }
      }),
      plan_distribution: workspacesByPlan.map(item => ({
        plan: item.plan,
        count: item._count._all,
      })),
      active_vs_expired_tenants: {
        active: activeWorkspaces,
        trial: trialWorkspaces,
        suspended: Math.max(0, totalWorkspaces - activeWorkspaces - trialWorkspaces),
        expiring_soon: expiringSubscriptions,
      },
      analytics_range: {
        range: query.range,
        granularity: trendRange.granularity,
        from: trendRange.start.toISOString(),
        to: trendRange.end.toISOString(),
      },
      revenue_trends: revenueBuckets.map(({ key, label, subscription, addon, total }) => ({ key, label, subscription, addon, total })),
      tenant_growth_trends: tenantBuckets.map(({ key, label, new_tenants }) => ({ key, label, new_tenants })),
      addon_sales_trends: addonBuckets.map(({ key, label, count, revenue }) => ({ key, label, count, revenue })),
      request_trends: requestBuckets.map(({ key, label, pending, approved, rejected, plan_changes, addon_requests, custom_requests }) => ({
        key,
        label,
        pending,
        approved,
        rejected,
        plan_changes,
        addon_requests,
        custom_requests,
      })),
      feature_usage_trends: movementBuckets.map(({ key, label, in: stockIn, out, transfer, total }) => ({
        key,
        label,
        stock_in: stockIn,
        stock_out: out,
        transfer,
        total,
      })),
      recent_audit_logs: recentAuditLogs.map(auditLogDto),
      system_health: [
        { service: 'API', status: 'healthy', uptime: 'online' },
        { service: 'Database', status: 'healthy', uptime: 'online' },
        {
          service: 'Permission Engine',
          status: pendingApprovals >= 0 ? 'healthy' : 'warning',
          uptime: 'role-based access active',
        },
      ],
    }
  })

  app.get('/users', async (request) => {
    await requirePlatformAdmin(app, request)
    const query = pageSchema.parse(request.query)
    const roleFilter = query.role && query.role !== 'all' ? query.role : undefined
    const where: any = {
      ...(roleFilter && roleFilter !== 'super_admin' ? { role: roleFilter } : {}),
      ...(roleFilter === 'super_admin' ? { user: { role: 'super_admin' } } : {}),
      ...(query.workspace_id ? { workspaceId: query.workspace_id } : {}),
      ...(query.status && query.status !== 'all' ? { workspace: { status: query.status } } : {}),
      ...(query.q
        ? {
            OR: [
              { user: { name: { contains: query.q, mode: 'insensitive' } } },
              { user: { email: { contains: query.q, mode: 'insensitive' } } },
              { workspace: { name: { contains: query.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      app.prisma.workspaceMember.findMany({
        where,
        include: { user: true, workspace: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.per_page,
        take: query.per_page,
      }),
      app.prisma.workspaceMember.count({ where }),
    ])
    const lastLoginMap = await lastLoginLookup(app, items.map(member => ({
      userId: member.userId,
      workspaceId: member.workspaceId,
    })))

    return paginate(items.map(member => ({
      id: member.id,
      user_id: member.userId,
      workspace_id: member.workspaceId,
      role: member.role,
      user: userDto(member.user),
      workspace: workspaceDto(member.workspace),
      created_at: member.createdAt.toISOString(),
      last_login_at: lastLoginMap.get(`${member.userId}:${member.workspaceId}`) ?? null,
    })), query.page, query.per_page, total)
  })

  app.get('/workspaces', async (request) => {
    await requirePlatformAdmin(app, request)
    const query = pageSchema.parse(request.query)
    const where: any = {
      ...(query.status && query.status !== 'all' ? { status: query.status } : {}),
      ...(query.plan && query.plan !== 'all' ? { plan: query.plan } : {}),
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
    }
    const [items, total] = await Promise.all([
      app.prisma.workspace.findMany({
        where,
        include: {
          members: { include: { user: true }, orderBy: { createdAt: 'asc' } },
          subscriptions: { include: { planPackage: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { members: true, products: true, warehouses: true, suppliers: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.per_page,
        take: query.per_page,
      }),
      app.prisma.workspace.count({ where }),
    ])
    return paginate(items.map((workspace) => {
      const owner = pickOwner(workspace.members)
      const latestSubscription = workspace.subscriptions[0]
      return {
        ...workspaceDto(workspace),
        owner_id: owner?.user.id ?? '',
        owner_name: owner?.user.name ?? '-',
        owner_email: owner?.user.email ?? '-',
        users: workspace._count.members,
        products: workspace._count.products,
        warehouses: workspace._count.warehouses,
        suppliers: workspace._count.suppliers,
        mrr: latestSubscription?.status === 'active'
          ? latestSubscription.amountSnapshot > 0
            ? latestSubscription.amountSnapshot
            : latestSubscription.planPackage
              ? billingAmount(latestSubscription.planPackage, latestSubscription.billingCycle)
              : planPrice(latestSubscription.plan)
          : 0,
      }
    }), query.page, query.per_page, total)
  })

  app.post('/workspaces', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const body = tenantCreateSchema.parse(request.body)
    const periodStart = body.current_period_start ? new Date(body.current_period_start) : new Date()
    const periodEnd = body.current_period_end ? new Date(body.current_period_end) : addMonths(periodStart, 1)
    if (periodEnd <= periodStart) {
      throw new AppError('validation_error', 'Tanggal akhir subscription harus setelah tanggal mulai')
    }

    const effectivePlan = body.subscription_status === 'trialing' ? 'pro' : body.plan
    const planLimit = PLAN_CATALOG[effectivePlan].limits.users
    const effectivePackage = await app.prisma.planPackage.findUnique({ where: { code: effectivePlan } })
    const amountSnapshot = effectivePackage ? billingAmount(effectivePackage, 'monthly') : planPrice(effectivePlan)
    const requestedUsers = 1 + body.staff.length
    if (requestedUsers > planLimit) {
      throw new AppError('feature_locked', `Paket ${effectivePlan} hanya mengizinkan ${planLimit} user`)
    }

    const duplicateEmails = [body.owner.email, ...body.staff.map(member => member.email)]
      .map(email => email.toLowerCase())
      .filter((email, index, emails) => emails.indexOf(email) !== index)
    if (duplicateEmails.length > 0) {
      throw new AppError('validation_error', 'Email owner dan staff tidak boleh duplikat')
    }

    const result = await app.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: body.name,
          plan: body.plan,
          status: body.subscription_status === 'trialing' ? 'trial' : body.status,
          trialEndsAt: body.subscription_status === 'trialing' ? periodEnd : null,
        },
      })

      const ownerExisting = await ensureTenantUserAvailable(tx, body.owner.email, workspace.id)
      const ownerPasswordHash = await bcrypt.hash(body.owner.password, 10)
      const owner = ownerExisting
        ? await tx.user.update({
            where: { id: ownerExisting.id },
            data: { name: body.owner.name, passwordHash: ownerPasswordHash, role: 'admin', disabledAt: null },
          })
        : await tx.user.create({
            data: {
              name: body.owner.name,
              email: body.owner.email.toLowerCase(),
              passwordHash: ownerPasswordHash,
              role: 'admin',
            },
          })

      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: owner.id, role: 'admin' },
      })

      await tx.subscription.create({
        data: {
          workspaceId: workspace.id,
          planPackageId: effectivePackage?.id,
          plan: effectivePlan,
          status: body.subscription_status,
          billingCycle: 'monthly',
          amountSnapshot,
          source: 'admin',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      })

      await tx.category.create({
        data: { workspaceId: workspace.id, name: 'Umum', description: 'Kategori default tenant' },
      })

      await tx.warehouse.create({
        data: {
          workspaceId: workspace.id,
          name: body.warehouse.name,
          address: body.warehouse.address,
          isDefault: true,
        },
      })

      for (const staffMember of body.staff) {
        const existing = await ensureTenantUserAvailable(tx, staffMember.email, workspace.id)
        const passwordHash = await bcrypt.hash(staffMember.password, 10)
        const user = existing
          ? await tx.user.update({
              where: { id: existing.id },
              data: { name: staffMember.name, passwordHash, role: staffMember.role, disabledAt: null },
            })
          : await tx.user.create({
              data: {
                name: staffMember.name,
                email: staffMember.email.toLowerCase(),
                passwordHash,
                role: staffMember.role,
              },
            })
        await tx.workspaceMember.create({
          data: { workspaceId: workspace.id, userId: user.id, role: staffMember.role },
        })
      }

      for (const supplier of body.suppliers) {
        await tx.supplier.create({
          data: {
            workspaceId: workspace.id,
            name: supplier.name,
            contactPerson: supplier.contact_person,
            phone: supplier.phone,
            email: supplier.email || undefined,
            address: supplier.address,
            notes: supplier.notes,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          userId: ctx.userId,
          action: 'admin.tenant.created',
          entityType: 'workspace',
          entityId: workspace.id,
          metadata: {
            plan: body.plan,
            subscription_status: body.subscription_status,
            staff_count: body.staff.length,
            supplier_count: body.suppliers.length,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      })

      return { workspace, owner }
    })

    return {
      ...workspaceDto(result.workspace),
      owner_id: result.owner.id,
      owner_name: result.owner.name,
      owner_email: result.owner.email,
      users: requestedUsers,
      products: 0,
      warehouses: 1,
      suppliers: body.suppliers.length,
      mrr: body.subscription_status === 'active' ? amountSnapshot : 0,
    }
  })

  app.get('/workspaces/:id', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const workspace = await app.prisma.workspace.findUnique({ where: { id: params.id } })
    if (!workspace) throw new AppError('not_found', 'Workspace tidak ditemukan')
    return workspaceDto(workspace)
  })

  app.get('/workspaces/:id/summary', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const workspace = await app.prisma.workspace.findUnique({
      where: { id: params.id },
      include: {
        members: { include: { user: true }, orderBy: { createdAt: 'asc' } },
        subscriptions: { include: { planPackage: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        auditLogs: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: { select: { members: true, products: true, warehouses: true, suppliers: true, movements: true } },
      },
    })
    if (!workspace) throw new AppError('not_found', 'Workspace tidak ditemukan')

    const inventoryItems = await app.prisma.inventoryItem.findMany({
      where: { workspaceId: workspace.id },
      include: { product: true, warehouse: true },
    })
    const owner = pickOwner(workspace.members)
    const latestSubscription = workspace.subscriptions[0]
    const totalStock = inventoryItems.reduce((sum, item) => sum + item.quantity, 0)
    const lowStockItems = inventoryItems.filter(item => item.quantity <= item.product.minStock).length

    return {
      workspace: {
        ...workspaceDto(workspace),
        owner_id: owner?.user.id ?? '',
        owner_name: owner?.user.name ?? '-',
        owner_email: owner?.user.email ?? '-',
      },
      users: workspace.members.map(member => ({
        id: member.id,
        user_id: member.userId,
        role: member.role,
        user: userDto(member.user),
        created_at: member.createdAt.toISOString(),
      })),
      subscription: latestSubscription ? subscriptionDto({ ...latestSubscription, workspace }) : null,
      usage: {
        users: workspace._count.members,
        products: workspace._count.products,
        warehouses: workspace._count.warehouses,
        suppliers: workspace._count.suppliers,
        stock_movements: workspace._count.movements,
        total_stock: totalStock,
        low_stock_items: lowStockItems,
      },
      recent_audit_logs: workspace.auditLogs.map(log => auditLogDto({ ...log, workspace })),
    }
  })

  app.get('/workspaces/:id/inventory-summary', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const workspace = await app.prisma.workspace.findUnique({ where: { id: params.id } })
    if (!workspace) throw new AppError('not_found', 'Workspace tidak ditemukan')
    const items = await app.prisma.inventoryItem.findMany({
      where: { workspaceId: params.id },
      include: { product: true, warehouse: true },
      orderBy: { updatedAt: 'desc' },
    })
    return {
      workspace: workspaceDto(workspace),
      totals: {
        items: items.length,
        stock: items.reduce((sum, item) => sum + item.quantity, 0),
        low_stock: items.filter(item => item.quantity <= item.product.minStock).length,
      },
      items: items.slice(0, 50).map(item => ({
        id: item.id,
        product_id: item.productId,
        product_name: item.product.name,
        product_sku: item.product.sku,
        warehouse_id: item.warehouseId,
        warehouse_name: item.warehouse.name,
        quantity: item.quantity,
        min_stock: item.product.minStock,
        status: item.quantity <= item.product.minStock ? 'low_stock' : 'ok',
        updated_at: item.updatedAt.toISOString(),
      })),
    }
  })

  app.put('/workspaces/:id', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const body = z.object({
      name: z.string().min(1).optional(),
      status: z.enum(['active', 'suspended', 'trial']).optional(),
      plan: z.enum(['free', 'starter', 'growth', 'pro', 'custom']).optional(),
    }).parse(request.body)

    const current = await app.prisma.workspace.findUnique({ where: { id: params.id } })
    if (!current) throw new AppError('not_found', 'Workspace tidak ditemukan')

    const nextStatus = body.status ?? current.status
    const nextPlan = body.plan ?? current.plan
    const nextPackage = await app.prisma.planPackage.findUnique({ where: { code: nextPlan } })
    const now = new Date()

    const workspace = await app.prisma.$transaction(async (tx) => {
      const updated = await tx.workspace.update({
        where: { id: params.id },
        data: {
          ...body,
          trialEndsAt: nextStatus === 'active' ? null : undefined,
        },
      })

      if (nextStatus === 'active' && (body.plan || current.status === 'trial')) {
        const currentSubscription = await tx.subscription.findFirst({
          where: {
            workspaceId: params.id,
            status: { in: ['active', 'trialing'] },
            currentPeriodEnd: { gte: now },
          },
          orderBy: { currentPeriodEnd: 'desc' },
        })

        if (currentSubscription) {
          await tx.subscription.update({
            where: { id: currentSubscription.id },
            data: {
              planPackageId: nextPackage?.id,
              plan: nextPlan,
              status: 'active',
              amountSnapshot: nextPackage ? billingAmount(nextPackage, currentSubscription.billingCycle) : currentSubscription.amountSnapshot,
              cancelAtPeriodEnd: false,
            },
          })
        } else if (nextPlan !== 'free') {
          const end = new Date(now)
          end.setMonth(end.getMonth() + 1)
          await tx.subscription.create({
            data: {
              workspaceId: params.id,
              planPackageId: nextPackage?.id,
              plan: nextPlan,
              status: 'active',
              billingCycle: 'monthly',
              amountSnapshot: nextPackage ? billingAmount(nextPackage, 'monthly') : planPrice(nextPlan),
              source: 'admin',
              currentPeriodStart: now,
              currentPeriodEnd: end,
            },
          })
        }
      }

      await tx.auditLog.create({
        data: {
          workspaceId: params.id,
          userId: ctx.userId,
          action: 'admin.tenant.updated',
          entityType: 'workspace',
          entityId: params.id,
          metadata: { name: body.name, plan: body.plan, status: body.status },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      })

      return updated
    })

    return workspaceDto(workspace)
  })

  app.post('/workspaces/:id/suspend', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const workspace = await app.prisma.workspace.update({ where: { id: params.id }, data: { status: 'suspended' } })
    return workspaceDto(workspace)
  })

  app.post('/workspaces/:id/activate', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const current = await app.prisma.workspace.findUnique({ where: { id: params.id } })
    if (!current) throw new AppError('not_found', 'Workspace tidak ditemukan')
    const now = new Date()
    const currentPackage = await app.prisma.planPackage.findUnique({ where: { code: current.plan } })
    const workspace = await app.prisma.$transaction(async (tx) => {
      const updated = await tx.workspace.update({ where: { id: params.id }, data: { status: 'active', trialEndsAt: null } })
      const trialSubscription = await tx.subscription.findFirst({
        where: {
          workspaceId: params.id,
          status: 'trialing',
          currentPeriodEnd: { gte: now },
        },
        orderBy: { currentPeriodEnd: 'desc' },
      })
      if (trialSubscription) {
        await tx.subscription.update({
          where: { id: trialSubscription.id },
          data: {
            planPackageId: currentPackage?.id,
            plan: current.plan,
            status: 'active',
            amountSnapshot: currentPackage ? billingAmount(currentPackage, trialSubscription.billingCycle) : trialSubscription.amountSnapshot,
            cancelAtPeriodEnd: false,
          },
        })
      }
      await tx.auditLog.create({
        data: {
          workspaceId: params.id,
          userId: ctx.userId,
          action: 'admin.tenant.activated',
          entityType: 'workspace',
          entityId: params.id,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      })
      return updated
    })
    return workspaceDto(workspace)
  })

  app.get('/workspaces/:workspaceId/users', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const query = pageSchema.parse(request.query)
    const [items, total] = await Promise.all([
      app.prisma.workspaceMember.findMany({
        where: { workspaceId: params.workspaceId },
        include: { user: true, workspace: true },
        skip: (query.page - 1) * query.per_page,
        take: query.per_page,
      }),
      app.prisma.workspaceMember.count({ where: { workspaceId: params.workspaceId } }),
    ])
    const lastLoginMap = await lastLoginLookup(app, items.map(member => ({
      userId: member.userId,
      workspaceId: member.workspaceId,
    })))
    return paginate(items.map((member) => ({
      id: member.id,
      user_id: member.userId,
      workspace_id: member.workspaceId,
      role: member.role,
      user: userDto(member.user),
      workspace: workspaceDto(member.workspace),
      created_at: member.createdAt.toISOString(),
      last_login_at: lastLoginMap.get(`${member.userId}:${member.workspaceId}`) ?? null,
    })), query.page, query.per_page, total)
  })

  app.post('/workspaces/:workspaceId/users/invite', async (request) => {
    await requirePlatformAdmin(app, request)
    throw new AppError('validation_error', 'Undangan user belum mengirim email; gunakan create user dari panel admin setelah SMTP tersedia')
  })

  app.put('/workspaces/:workspaceId/users/:userId', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), userId: z.string() }).parse(request.params)
    const body = z.object({ role: z.enum(['admin', 'staff', 'supplier', 'trial']) }).parse(request.body)
    const member = await app.prisma.workspaceMember.update({
      where: { userId_workspaceId: { userId: params.userId, workspaceId: params.workspaceId } },
      data: { role: body.role },
      include: { user: true, workspace: true },
    })
    return {
      id: member.id,
      user_id: member.userId,
      workspace_id: member.workspaceId,
      role: member.role,
      user: userDto(member.user),
      workspace: workspaceDto(member.workspace),
      created_at: member.createdAt.toISOString(),
    }
  })

  app.delete('/workspaces/:workspaceId/users/:userId', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), userId: z.string() }).parse(request.params)
    await app.prisma.workspaceMember.delete({
      where: { userId_workspaceId: { userId: params.userId, workspaceId: params.workspaceId } },
    })
    return { ok: true }
  })

  app.get('/subscriptions', async (request) => {
    await requirePlatformAdmin(app, request)
    const query = pageSchema.parse(request.query)
    const planFilter = query.plan && query.plan !== 'all' ? query.plan : undefined
    const where: any = {
      ...(query.status && query.status !== 'all' ? { status: query.status } : {}),
      ...(planFilter
        ? {
            OR: [
              ...(Object.keys(PLAN_CATALOG).includes(planFilter) ? [{ plan: planFilter }] : []),
              { planPackage: { code: planFilter } },
            ],
          }
        : {}),
      ...(query.workspace_id ? { workspaceId: query.workspace_id } : {}),
      ...(query.q ? { workspace: { name: { contains: query.q, mode: 'insensitive' } } } : {}),
    }
    const [items, total] = await Promise.all([
      app.prisma.subscription.findMany({
        where,
        include: { workspace: true, planPackage: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.per_page,
        take: query.per_page,
      }),
      app.prisma.subscription.count({ where }),
    ])
    return paginate(items.map(subscriptionDto), query.page, query.per_page, total)
  })

  app.get('/workspaces/:workspaceId/subscriptions', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const subscriptions = await app.prisma.subscription.findMany({
      where: { workspaceId: params.workspaceId },
      include: { workspace: true, planPackage: true },
      orderBy: { createdAt: 'desc' },
    })
    return subscriptions.map(subscriptionDto)
  })

  app.post('/workspaces/:workspaceId/subscriptions/change-plan', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const body = z.object({
      plan: z.enum(['free', 'starter', 'growth', 'pro', 'custom']).optional(),
      package_code: z.string().trim().min(1).optional(),
      billing_cycle: z.enum(['monthly', 'yearly', 'manual']).default('monthly'),
    }).parse(request.body)
    const requestedCode = body.package_code ?? body.plan
    if (!requestedCode) throw new AppError('validation_error', 'Paket harus dipilih')
    const planPackage = await app.prisma.planPackage.findUnique({ where: { code: requestedCode } })
    if (!planPackage || planPackage.status !== 'active') throw new AppError('not_found', 'Paket aktif tidak ditemukan')
    const legacyPlan = legacyPlanForCode(planPackage.code)
    const now = new Date()
    const end = new Date(now)
    if (body.billing_cycle === 'yearly') {
      end.setFullYear(end.getFullYear() + 1)
    } else {
      end.setMonth(end.getMonth() + 1)
    }

    const subscription = await app.prisma.$transaction(async (tx) => {
      await tx.workspace.update({ where: { id: params.workspaceId }, data: { plan: legacyPlan, status: 'active', trialEndsAt: null } })
      await tx.subscription.updateMany({
        where: { workspaceId: params.workspaceId, status: { in: ['active', 'trialing'] } },
        data: { status: 'cancelled', cancelAtPeriodEnd: true },
      })
      const created = await tx.subscription.create({
        data: {
          workspaceId: params.workspaceId,
          planPackageId: planPackage.id,
          plan: legacyPlan,
          status: 'active',
          billingCycle: body.billing_cycle,
          amountSnapshot: billingAmount(planPackage, body.billing_cycle),
          source: 'admin',
          currentPeriodStart: now,
          currentPeriodEnd: end,
        },
      })
      await tx.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          userId: ctx.userId,
          action: 'subscription.plan_changed',
          entityType: 'subscription',
          entityId: created.id,
          metadata: { package_code: planPackage.code, plan: legacyPlan, billing_cycle: body.billing_cycle },
        },
      })
      await tx.subscriptionEvent.create({
        data: {
          workspaceId: params.workspaceId,
          subscriptionId: created.id,
          userId: ctx.userId,
          type: 'subscription.plan_changed',
          metadata: { package_code: planPackage.code, plan: legacyPlan, billing_cycle: body.billing_cycle },
        },
      })
      return created
    })

    const workspace = await app.prisma.workspace.findUnique({ where: { id: subscription.workspaceId } })
    return subscriptionDto({ ...subscription, workspace, planPackage })
  })

  app.put('/workspaces/:workspaceId/subscriptions/:subscriptionId/period', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), subscriptionId: z.string() }).parse(request.params)
    const body = z.object({
      current_period_start: z.string().datetime().optional(),
      current_period_end: z.string().datetime(),
      status: subscriptionStatusSchema.optional(),
      reason: z.string().max(250).optional(),
    }).parse(request.body)

    const current = await app.prisma.subscription.findFirst({
      where: { id: params.subscriptionId, workspaceId: params.workspaceId },
      include: { planPackage: true },
    })
    if (!current) throw new AppError('not_found', 'Subscription tenant tidak ditemukan')

    const periodStart = body.current_period_start ? new Date(body.current_period_start) : current.currentPeriodStart
    const periodEnd = new Date(body.current_period_end)
    if (periodEnd <= periodStart) {
      throw new AppError('validation_error', 'Tanggal akhir subscription harus setelah tanggal mulai')
    }
    const nextStatus = body.status ?? (periodEnd < new Date() ? 'expired' : current.status === 'expired' ? 'active' : current.status)

    const updated = await app.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.update({
        where: { id: current.id },
        data: {
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          status: nextStatus,
          cancelAtPeriodEnd: nextStatus === 'cancelled' ? true : current.cancelAtPeriodEnd,
        },
      })
      await tx.workspace.update({
        where: { id: params.workspaceId },
        data: {
          plan: subscription.plan,
          status: nextStatus === 'trialing' ? 'trial' : nextStatus === 'active' ? 'active' : undefined,
          trialEndsAt: nextStatus === 'trialing' ? periodEnd : null,
        },
      })
      await tx.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          userId: ctx.userId,
          action: 'subscription.period_updated',
          entityType: 'subscription',
          entityId: subscription.id,
          metadata: {
            previous_start: current.currentPeriodStart.toISOString(),
            previous_end: current.currentPeriodEnd.toISOString(),
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            status: nextStatus,
            reason: body.reason,
          },
        },
      })
      return subscription
    })

    const workspace = await app.prisma.workspace.findUnique({ where: { id: updated.workspaceId } })
    return subscriptionDto({ ...updated, workspace, planPackage: current.planPackage })
  })

  app.post('/workspaces/:workspaceId/subscriptions/cancel', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const subscription = await app.prisma.subscription.findFirst({
      where: { workspaceId: params.workspaceId, status: { in: ['active', 'trialing'] } },
      orderBy: { currentPeriodEnd: 'desc' },
    })
    if (!subscription) throw new AppError('not_found', 'Subscription aktif tidak ditemukan')
    const updated = await app.prisma.$transaction(async (tx) => {
      const changed = await tx.subscription.update({
        where: { id: subscription.id },
        data: { status: 'cancelled', cancelAtPeriodEnd: true },
      })
      await tx.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          userId: ctx.userId,
          action: 'subscription.cancelled',
          entityType: 'subscription',
          entityId: changed.id,
        },
      })
      return changed
    })
    const workspace = await app.prisma.workspace.findUnique({ where: { id: updated.workspaceId } })
    const planPackage = updated.planPackageId ? await app.prisma.planPackage.findUnique({ where: { id: updated.planPackageId } }) : null
    return subscriptionDto({ ...updated, workspace, planPackage })
  })

  app.get('/audit-logs', async (request) => {
    await requirePlatformAdmin(app, request)
    const query = pageSchema.extend({
      action: z.string().optional(),
      category: z.string().optional(),
    }).parse(request.query)
    const categoryEntity: Record<string, string[]> = {
      user: ['user', 'product', 'supplier', 'inventory', 'stock_movement'],
      workspace: ['workspace', 'warehouse'],
      subscription: ['subscription'],
      system: ['system', 'setting'],
      security: ['auth', 'role'],
    }
    const where: any = {
      ...(query.workspace_id ? { workspaceId: query.workspace_id } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.category && query.category !== 'all' && categoryEntity[query.category]
        ? { entityType: { in: categoryEntity[query.category] } }
        : {}),
      ...(query.q
        ? {
            OR: [
              { action: { contains: query.q, mode: 'insensitive' } },
              { entityType: { contains: query.q, mode: 'insensitive' } },
              { workspace: { name: { contains: query.q, mode: 'insensitive' } } },
              { user: { name: { contains: query.q, mode: 'insensitive' } } },
              { user: { email: { contains: query.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      app.prisma.auditLog.findMany({
        where,
        include: { workspace: true, user: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.per_page,
        take: query.per_page,
      }),
      app.prisma.auditLog.count({ where }),
    ])
    return paginate(items.map(auditLogDto), query.page, query.per_page, total)
  })

  app.get('/workspaces/:workspaceId/audit-logs', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const query = pageSchema.extend({
      user_id: z.string().optional(),
      action: z.string().optional(),
    }).parse(request.query)
    const where: any = {
      workspaceId: params.workspaceId,
      ...(query.user_id ? { userId: query.user_id } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
    }
    const [items, total] = await Promise.all([
      app.prisma.auditLog.findMany({
        where,
        include: { workspace: true, user: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.per_page,
        take: query.per_page,
      }),
      app.prisma.auditLog.count({ where }),
    ])
    return paginate(items.map(auditLogDto), query.page, query.per_page, total)
  })

  app.get('/settings', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const settings = await app.prisma.systemSetting.findMany({ where: { workspaceId: ctx.workspaceId } })
    return settings.map((setting) => ({
      key: setting.key,
      value: setting.value,
      description: setting.description ?? undefined,
      updated_at: setting.updatedAt.toISOString(),
    }))
  })

  app.put('/settings/:key', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ key: z.string() }).parse(request.params)
    const body = z.object({ value: z.string(), description: z.string().optional() }).parse(request.body)
    const setting = await app.prisma.systemSetting.upsert({
      where: { workspaceId_key: { workspaceId: ctx.workspaceId, key: params.key } },
      update: { value: body.value, description: body.description },
      create: { workspaceId: ctx.workspaceId, key: params.key, value: body.value, description: body.description },
    })
    return {
      key: setting.key,
      value: setting.value,
      description: setting.description ?? undefined,
      updated_at: setting.updatedAt.toISOString(),
    }
  })
}
