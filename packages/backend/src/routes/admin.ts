import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AppError } from '../lib/errors.js'
import { userDto, workspaceDto } from '../lib/mappers.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const pageSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().optional(),
  status: z.string().optional(),
  plan: z.string().optional(),
  role: z.string().optional(),
  workspace_id: z.string().optional(),
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

function planPrice(plan: string) {
  const prices: Record<string, number> = {
    free: 0,
    starter: 49000,
    growth: 149000,
    pro: 299000,
    custom: 0,
  }
  return prices[plan] ?? 0
}

function subscriptionDto(subscription: {
  id: string
  workspaceId: string
  plan: string
  status: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  workspace?: { id: string; name: string; plan: string; status: string } | null
}) {
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
    status: subscription.status,
    amount: planPrice(subscription.plan),
    billing_cycle: 'monthly',
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

function pickOwner(members: Array<{ role: string; user: { id: string; name: string; email: string } }>) {
  return members.find(member => member.role === 'admin') ?? members.find(member => member.role === 'super_admin') ?? members[0]
}

async function requirePlatformAdmin(app: FastifyInstance, request: any) {
  const ctx = await requireAuth(app, request)
  requireRole(ctx, ['super_admin'])
  return ctx
}

export async function adminRoutes(app: FastifyInstance) {
  app.get('/dashboard/stats', async (request) => {
    await requirePlatformAdmin(app, request)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [
      totalWorkspaces,
      activeWorkspaces,
      trialWorkspaces,
      totalUsers,
      subscriptions,
      recentSignupCount,
      recentUsers,
      recentWorkspaces,
      workspacesByPlan,
    ] = await Promise.all([
      app.prisma.workspace.count(),
      app.prisma.workspace.count({ where: { status: 'active' } }),
      app.prisma.workspace.count({ where: { status: 'trial' } }),
      app.prisma.user.count(),
      app.prisma.subscription.findMany({ where: { status: 'active', plan: { not: 'free' } } }),
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
    ])

    return {
      total_workspaces: totalWorkspaces,
      active_workspaces: activeWorkspaces,
      trial_workspaces: trialWorkspaces,
      total_users: totalUsers,
      total_revenue: subscriptions.reduce((sum, subscription) => sum + planPrice(subscription.plan), 0),
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
      system_health: [
        { service: 'API', status: 'healthy', uptime: 'online' },
        { service: 'Database', status: 'healthy', uptime: 'online' },
        { service: 'Auth', status: 'healthy', uptime: 'online' },
      ],
    }
  })

  app.get('/users', async (request) => {
    await requirePlatformAdmin(app, request)
    const query = pageSchema.parse(request.query)
    const where: any = {
      ...(query.role && query.role !== 'all' ? { role: query.role } : {}),
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

    return paginate(items.map(member => ({
      id: member.id,
      user_id: member.userId,
      workspace_id: member.workspaceId,
      role: member.role,
      user: userDto(member.user),
      workspace: workspaceDto(member.workspace),
      created_at: member.createdAt.toISOString(),
      last_login_at: null,
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
          subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
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
        mrr: latestSubscription?.status === 'active' ? planPrice(latestSubscription.plan) : 0,
      }
    }), query.page, query.per_page, total)
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
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
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
    await requirePlatformAdmin(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const body = z.object({
      name: z.string().min(1).optional(),
      status: z.enum(['active', 'suspended', 'trial']).optional(),
      plan: z.enum(['free', 'starter', 'growth', 'pro', 'custom']).optional(),
    }).parse(request.body)
    const workspace = await app.prisma.workspace.update({ where: { id: params.id }, data: body })
    return workspaceDto(workspace)
  })

  app.post('/workspaces/:id/suspend', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const workspace = await app.prisma.workspace.update({ where: { id: params.id }, data: { status: 'suspended' } })
    return workspaceDto(workspace)
  })

  app.post('/workspaces/:id/activate', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ id: z.string() }).parse(request.params)
    const workspace = await app.prisma.workspace.update({ where: { id: params.id }, data: { status: 'active' } })
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
    return paginate(items.map((member) => ({
      id: member.id,
      user_id: member.userId,
      workspace_id: member.workspaceId,
      role: member.role,
      user: userDto(member.user),
      workspace: workspaceDto(member.workspace),
      created_at: member.createdAt.toISOString(),
    })), query.page, query.per_page, total)
  })

  app.post('/workspaces/:workspaceId/users/invite', async (request) => {
    await requirePlatformAdmin(app, request)
    throw new AppError('validation_error', 'Undangan user belum mengirim email; gunakan create user dari panel admin setelah SMTP tersedia')
  })

  app.put('/workspaces/:workspaceId/users/:userId', async (request) => {
    await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string(), userId: z.string() }).parse(request.params)
    const body = z.object({ role: z.enum(['super_admin', 'admin', 'staff', 'supplier', 'trial']) }).parse(request.body)
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
    const where: any = {
      ...(query.status && query.status !== 'all' ? { status: query.status } : {}),
      ...(query.plan && query.plan !== 'all' ? { plan: query.plan } : {}),
      ...(query.workspace_id ? { workspaceId: query.workspace_id } : {}),
      ...(query.q ? { workspace: { name: { contains: query.q, mode: 'insensitive' } } } : {}),
    }
    const [items, total] = await Promise.all([
      app.prisma.subscription.findMany({
        where,
        include: { workspace: true },
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
      include: { workspace: true },
      orderBy: { createdAt: 'desc' },
    })
    return subscriptions.map(subscriptionDto)
  })

  app.post('/workspaces/:workspaceId/subscriptions/change-plan', async (request) => {
    const ctx = await requirePlatformAdmin(app, request)
    const params = z.object({ workspaceId: z.string() }).parse(request.params)
    const body = z.object({ plan: z.enum(['free', 'starter', 'growth', 'pro', 'custom']) }).parse(request.body)
    const now = new Date()
    const end = new Date(now)
    end.setMonth(end.getMonth() + 1)

    const subscription = await app.prisma.$transaction(async (tx) => {
      await tx.workspace.update({ where: { id: params.workspaceId }, data: { plan: body.plan, status: 'active', trialEndsAt: null } })
      await tx.subscription.updateMany({
        where: { workspaceId: params.workspaceId, status: { in: ['active', 'trialing'] } },
        data: { status: 'cancelled', cancelAtPeriodEnd: true },
      })
      const created = await tx.subscription.create({
        data: {
          workspaceId: params.workspaceId,
          plan: body.plan,
          status: 'active',
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
          metadata: { plan: body.plan },
        },
      })
      return created
    })

    const workspace = await app.prisma.workspace.findUnique({ where: { id: subscription.workspaceId } })
    return subscriptionDto({ ...subscription, workspace })
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
    return subscriptionDto({ ...updated, workspace })
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
