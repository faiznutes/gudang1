import type { FastifyInstance } from 'fastify'
import type { FeatureKey, FeatureMap, PlanType, SubscriptionStatus } from '@stockpilot/shared'
import { FEATURE_KEYS } from '@stockpilot/shared'

export interface PlanDefinition {
  id: PlanType
  features: FeatureMap
  limits: {
    warehouses: number
    products: number
    users: number
  }
}

export const PLAN_CATALOG: Record<PlanType, PlanDefinition> = {
  free: {
    id: 'free',
    limits: { warehouses: 1, products: 100, users: 1 },
    features: {
      stockInOut: false,
      multiWarehouse: false,
      analytics: false,
      exportPDF: false,
      batchImport: false,
      reports: true,
    },
  },
  starter: {
    id: 'starter',
    limits: { warehouses: 1, products: 500, users: 2 },
    features: {
      stockInOut: true,
      multiWarehouse: false,
      analytics: false,
      exportPDF: false,
      batchImport: false,
      reports: true,
    },
  },
  growth: {
    id: 'growth',
    limits: { warehouses: 5, products: 2000, users: 10 },
    features: {
      stockInOut: true,
      multiWarehouse: true,
      analytics: true,
      exportPDF: false,
      batchImport: false,
      reports: true,
    },
  },
  pro: {
    id: 'pro',
    limits: { warehouses: 999, products: 99999, users: 999 },
    features: {
      stockInOut: true,
      multiWarehouse: true,
      analytics: true,
      exportPDF: true,
      batchImport: true,
      reports: true,
    },
  },
  custom: {
    id: 'custom',
    limits: { warehouses: 9999, products: 999999, users: 9999 },
    features: {
      stockInOut: true,
      multiWarehouse: true,
      analytics: true,
      exportPDF: true,
      batchImport: true,
      reports: true,
    },
  },
}

export async function getEntitlements(app: FastifyInstance, workspaceId: string) {
  const now = new Date()
  const workspace = await app.prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      entitlements: true,
      subscriptions: {
        where: {
          status: { in: ['active', 'trialing'] },
          currentPeriodEnd: { gte: now },
        },
        orderBy: { currentPeriodEnd: 'desc' },
        take: 1,
      },
    },
  })

  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} tidak ditemukan`)
  }

  const trialActive = !!workspace.trialEndsAt && workspace.trialEndsAt > now
  const activeSubscription = workspace.subscriptions[0]
  const plan = (trialActive ? 'pro' : activeSubscription?.plan ?? workspace.plan) as PlanType
  const subscriptionStatus = (trialActive ? 'trialing' : activeSubscription?.status ?? 'none') as SubscriptionStatus | 'none'
  const base = PLAN_CATALOG[plan] ?? PLAN_CATALOG.free
  const features: FeatureMap = { ...base.features }
  const limits = { ...base.limits }

  for (const override of workspace.entitlements) {
    if (override.expiresAt && override.expiresAt <= now) continue
    if ((FEATURE_KEYS as readonly string[]).includes(override.feature)) {
      features[override.feature as FeatureKey] = override.enabled
    }
    if (override.limit !== null) {
      if (override.feature === 'warehouses') limits.warehouses = override.limit
      if (override.feature === 'products') limits.products = override.limit
      if (override.feature === 'users') limits.users = override.limit
    }
  }

  const [warehouses, products, users] = await Promise.all([
    app.prisma.warehouse.count({ where: { workspaceId } }),
    app.prisma.product.count({ where: { workspaceId } }),
    app.prisma.workspaceMember.count({ where: { workspaceId } }),
  ])

  return {
    plan,
    subscriptionStatus,
    trialEndsAt: workspace.trialEndsAt?.toISOString() ?? null,
    features,
    limits,
    usage: { warehouses, products, users },
  }
}
