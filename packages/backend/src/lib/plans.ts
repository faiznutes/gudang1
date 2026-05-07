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

export const PLAN_PRICES: Record<PlanType, { monthly: number; originalMonthly?: number }> = {
  free: { monthly: 0 },
  starter: { monthly: 250000 },
  growth: { monthly: 300000, originalMonthly: 500000 },
  pro: { monthly: 500000 },
  custom: { monthly: 0 },
}

export function planPrice(plan: string) {
  return PLAN_PRICES[plan as PlanType]?.monthly ?? 0
}

const PLAN_RANK: Record<PlanType, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  pro: 3,
  custom: 4,
}

function higherPlan(left: PlanType, right: PlanType) {
  return PLAN_RANK[right] > PLAN_RANK[left] ? right : left
}

function isFutureOrToday(date: Date, now: Date) {
  return date >= now
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
        orderBy: [
          { currentPeriodEnd: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 20,
      },
    },
  })

  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} tidak ditemukan`)
  }

  const latestSubscription = workspace.subscriptions[0]
  const activePaidSubscription = workspace.subscriptions.find(subscription => (
    subscription.status === 'active' && isFutureOrToday(subscription.currentPeriodEnd, now)
  ))
  const activeTrialSubscription = workspace.status === 'trial'
    ? workspace.subscriptions.find(subscription => (
      subscription.status === 'trialing' && isFutureOrToday(subscription.currentPeriodEnd, now)
    ))
    : null
  const workspaceTrialEndsAt = workspace.status === 'trial' && workspace.trialEndsAt && workspace.trialEndsAt > now
    ? workspace.trialEndsAt
    : null
  const activeTrialEndsAt = activeTrialSubscription?.currentPeriodEnd ?? workspaceTrialEndsAt
  const workspaceActivePlan = workspace.status === 'active' ? (workspace.plan as PlanType) : null

  let plan = PLAN_CATALOG.free.id
  let subscriptionStatus: SubscriptionStatus | 'none' = 'none'
  let subscriptionStartsAt: Date | null = latestSubscription?.currentPeriodStart ?? null
  let subscriptionEndsAt: Date | null = latestSubscription?.currentPeriodEnd ?? null
  let trialEndsAt: Date | null = null

  if (activePaidSubscription || workspaceActivePlan) {
    plan = (activePaidSubscription?.plan as PlanType | undefined) ?? 'free'
    if (workspaceActivePlan) {
      plan = higherPlan(plan, workspaceActivePlan)
    }
    subscriptionStatus = 'active'
    subscriptionStartsAt = activePaidSubscription?.currentPeriodStart ?? null
    subscriptionEndsAt = activePaidSubscription?.currentPeriodEnd ?? null
  } else if (activeTrialEndsAt) {
    plan = 'pro'
    subscriptionStatus = 'trialing'
    trialEndsAt = activeTrialEndsAt
    subscriptionStartsAt = activeTrialSubscription?.currentPeriodStart ?? null
    subscriptionEndsAt = activeTrialEndsAt
  } else if (latestSubscription) {
    subscriptionStatus = latestSubscription.currentPeriodEnd < now
      ? 'expired'
      : latestSubscription.status
  }

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
    app.prisma.warehouse.count({ where: { workspaceId, disabledAt: null } }),
    app.prisma.product.count({ where: { workspaceId, disabledAt: null } }),
    app.prisma.workspaceMember.count({ where: { workspaceId, user: { disabledAt: null } } }),
  ])

  return {
    plan,
    subscriptionStatus,
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    subscriptionStartsAt: subscriptionStartsAt?.toISOString() ?? null,
    subscriptionEndsAt: subscriptionEndsAt?.toISOString() ?? null,
    features,
    limits,
    usage: { warehouses, products, users },
  }
}
