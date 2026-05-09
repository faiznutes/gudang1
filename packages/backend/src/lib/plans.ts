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

const PLAN_NAMES: Record<PlanType, string> = {
  free: 'Free',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  custom: 'Kustom',
}

const PLAN_DESCRIPTIONS: Record<PlanType, string> = {
  free: 'Untuk coba-coba dan belajar operasional stok.',
  starter: 'Untuk bisnis rumahan dan toko kecil.',
  growth: 'Untuk bisnis yang mulai berkembang dengan beberapa gudang.',
  pro: 'Untuk operasional gudang yang butuh fitur lengkap.',
  custom: 'Paket manual untuk tenant khusus yang dikelola super admin.',
}

const PLAN_SORT_ORDER: Record<PlanType, number> = {
  free: 0,
  starter: 10,
  growth: 20,
  pro: 30,
  custom: 40,
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

export function legacyPlanForCode(code: string): PlanType {
  return (Object.keys(PLAN_CATALOG) as PlanType[]).includes(code as PlanType) ? code as PlanType : 'custom'
}

export function defaultPackagePayload(plan: PlanType) {
  const definition = PLAN_CATALOG[plan]
  const price = PLAN_PRICES[plan]
  return {
    code: plan,
    name: PLAN_NAMES[plan],
    description: PLAN_DESCRIPTIONS[plan],
    monthlyPrice: price.monthly,
    yearlyPrice: price.monthly > 0 ? price.monthly * 12 : 0,
    originalMonthlyPrice: price.originalMonthly ?? null,
    trialDays: plan === 'free' ? 0 : 14,
    sortOrder: PLAN_SORT_ORDER[plan],
    warehouseLimit: definition.limits.warehouses,
    productLimit: definition.limits.products,
    userLimit: definition.limits.users,
    features: definition.features,
  }
}

export const DEFAULT_PLAN_PACKAGES = (Object.keys(PLAN_CATALOG) as PlanType[])
  .map(plan => defaultPackagePayload(plan))

export function billingAmount(packageRow: { monthlyPrice: number; yearlyPrice?: number | null }, cycle: 'monthly' | 'yearly' | 'manual' = 'monthly') {
  if (cycle === 'yearly') return packageRow.yearlyPrice ?? packageRow.monthlyPrice * 12
  return packageRow.monthlyPrice
}

export async function seedDefaultPlanPackages(prisma: any) {
  if (!prisma.planPackage || !prisma.planFeature) return

  for (const packageInput of DEFAULT_PLAN_PACKAGES) {
    const planPackage = await prisma.planPackage.upsert({
      where: { code: packageInput.code },
      update: {
        name: packageInput.name,
        description: packageInput.description,
        monthlyPrice: packageInput.monthlyPrice,
        yearlyPrice: packageInput.yearlyPrice,
        originalMonthlyPrice: packageInput.originalMonthlyPrice,
        trialDays: packageInput.trialDays,
        sortOrder: packageInput.sortOrder,
        warehouseLimit: packageInput.warehouseLimit,
        productLimit: packageInput.productLimit,
        userLimit: packageInput.userLimit,
        status: 'active',
      },
      create: {
        code: packageInput.code,
        name: packageInput.name,
        description: packageInput.description,
        monthlyPrice: packageInput.monthlyPrice,
        yearlyPrice: packageInput.yearlyPrice,
        originalMonthlyPrice: packageInput.originalMonthlyPrice,
        trialDays: packageInput.trialDays,
        sortOrder: packageInput.sortOrder,
        warehouseLimit: packageInput.warehouseLimit,
        productLimit: packageInput.productLimit,
        userLimit: packageInput.userLimit,
        status: 'active',
      },
    })

    for (const feature of FEATURE_KEYS) {
      await prisma.planFeature.upsert({
        where: {
          planPackageId_feature: {
            planPackageId: planPackage.id,
            feature,
          },
        },
        update: {
          enabled: packageInput.features[feature],
        },
        create: {
          planPackageId: planPackage.id,
          feature,
          enabled: packageInput.features[feature],
        },
      })
    }

    await prisma.subscription.updateMany({
      where: {
        plan: packageInput.code,
        planPackageId: null,
      },
      data: {
        planPackageId: planPackage.id,
        amountSnapshot: packageInput.monthlyPrice,
      },
    })
  }
}

function emptyFeatures(): FeatureMap {
  return FEATURE_KEYS.reduce((result, feature) => {
    result[feature] = false
    return result
  }, {} as FeatureMap)
}

function planDefinitionFromPackage(packageRow: any): PlanDefinition & { name: string; code: string } {
  const features = emptyFeatures()
  for (const feature of packageRow.features ?? []) {
    if ((FEATURE_KEYS as readonly string[]).includes(feature.feature)) {
      features[feature.feature as FeatureKey] = feature.enabled
    }
  }

  return {
    id: legacyPlanForCode(packageRow.code),
    code: packageRow.code,
    name: packageRow.name,
    limits: {
      warehouses: packageRow.warehouseLimit,
      products: packageRow.productLimit,
      users: packageRow.userLimit,
    },
    features,
  }
}

async function getPackageByCode(app: FastifyInstance, code: string) {
  if (!(app.prisma as any).planPackage?.findUnique) return null
  return (app.prisma as any).planPackage.findUnique({
    where: { code },
    include: { features: true },
  })
}

async function packageDefinitionForCode(app: FastifyInstance, code: string) {
  const packageRow = await getPackageByCode(app, code)
  if (packageRow) return planDefinitionFromPackage(packageRow)
  const legacy = legacyPlanForCode(code)
  const fallback = PLAN_CATALOG[legacy] ?? PLAN_CATALOG.free
  return {
    ...fallback,
    code: legacy,
    name: PLAN_NAMES[legacy],
  }
}

export async function getEntitlements(app: FastifyInstance, workspaceId: string) {
  const now = new Date()
  const workspace = await app.prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      entitlements: true,
      workspaceAddons: {
        where: { status: 'active' },
        include: { addon: true },
      },
      subscriptions: {
        include: { planPackage: { include: { features: true } } },
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

  const subscriptions = workspace.subscriptions ?? []
  const workspaceAddons = (workspace as any).workspaceAddons ?? []
  const latestSubscription = subscriptions[0]
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
    plan = legacyPlanForCode((activePaidSubscription as any)?.planPackage?.code ?? activePaidSubscription?.plan ?? 'free')
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

  const activePackageCode = (activePaidSubscription as any)?.planPackage?.code ?? plan
  const activePackageName = (activePaidSubscription as any)?.planPackage?.name ?? PLAN_NAMES[legacyPlanForCode(activePackageCode)]
  const base = activePaidSubscription && (activePaidSubscription as any).planPackage
    ? planDefinitionFromPackage((activePaidSubscription as any).planPackage)
    : await packageDefinitionForCode(app, plan)
  const features: FeatureMap = { ...base.features }
  const limits = { ...base.limits }

  for (const assignment of workspaceAddons) {
    if (assignment.currentPeriodEnd && assignment.currentPeriodEnd <= now) continue
    const addon = assignment.addon
    const quantity = Math.max(1, assignment.quantity ?? 1)
    if (addon?.featureKey && (FEATURE_KEYS as readonly string[]).includes(addon.featureKey)) {
      features[addon.featureKey as FeatureKey] = true
    }
    if (addon?.limitKey && typeof addon.limitIncrement === 'number') {
      if (addon.limitKey === 'warehouses') limits.warehouses += addon.limitIncrement * quantity
      if (addon.limitKey === 'products') limits.products += addon.limitIncrement * quantity
      if (addon.limitKey === 'users') limits.users += addon.limitIncrement * quantity
    }
  }

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
    packageCode: activePackageCode,
    packageName: activePackageName,
    subscriptionStatus,
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    subscriptionStartsAt: subscriptionStartsAt?.toISOString() ?? null,
    subscriptionEndsAt: subscriptionEndsAt?.toISOString() ?? null,
    features,
    limits,
    usage: { warehouses, products, users },
    addons: workspaceAddons
      .filter((assignment: any) => !assignment.currentPeriodEnd || assignment.currentPeriodEnd > now)
      .map((assignment: any) => ({
        code: assignment.addon.code,
        name: assignment.addon.name,
        quantity: assignment.quantity,
        current_period_end: assignment.currentPeriodEnd?.toISOString() ?? null,
      })),
  }
}
