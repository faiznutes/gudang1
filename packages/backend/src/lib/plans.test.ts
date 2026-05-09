import { describe, expect, it, vi } from 'vitest'
import { getEntitlements, PLAN_CATALOG, PLAN_PRICES, planPrice } from './plans.js'

function mockApp(workspace: any, usage = { warehouses: 0, products: 0, users: 0 }) {
  return {
    prisma: {
      workspace: {
        findUnique: vi.fn().mockResolvedValue(workspace),
      },
      warehouse: {
        count: vi.fn().mockResolvedValue(usage.warehouses),
      },
      product: {
        count: vi.fn().mockResolvedValue(usage.products),
      },
      workspaceMember: {
        count: vi.fn().mockResolvedValue(usage.users),
      },
    },
  } as any
}

function addDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

describe('PLAN_CATALOG', () => {
  it('keeps stock movement locked on free and unlocked on starter', () => {
    expect(PLAN_CATALOG.free.features.stockInOut).toBe(false)
    expect(PLAN_CATALOG.starter.features.stockInOut).toBe(true)
  })

  it('keeps analytics locked until growth', () => {
    expect(PLAN_CATALOG.starter.features.analytics).toBe(false)
    expect(PLAN_CATALOG.growth.features.analytics).toBe(true)
  })

  it('keeps paid package pricing aligned with the active promo', () => {
    expect(planPrice('starter')).toBe(250000)
    expect(planPrice('growth')).toBe(300000)
    expect(PLAN_PRICES.growth.originalMonthly).toBe(500000)
  })

  it('keeps export and batch import locked until pro', () => {
    expect(PLAN_CATALOG.starter.features.exportPDF).toBe(false)
    expect(PLAN_CATALOG.starter.features.batchImport).toBe(false)
    expect(PLAN_CATALOG.growth.features.exportPDF).toBe(false)
    expect(PLAN_CATALOG.growth.features.batchImport).toBe(false)
    expect(PLAN_CATALOG.pro.features.exportPDF).toBe(true)
    expect(PLAN_CATALOG.pro.features.batchImport).toBe(true)
  })

  it('prefers active billing over a stale workspace trial date', async () => {
    const now = new Date()
    const entitlements = await getEntitlements(mockApp({
      id: 'workspace-1',
      plan: 'growth',
      status: 'active',
      trialEndsAt: addDays(5),
      entitlements: [],
      subscriptions: [
        {
          plan: 'starter',
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: addDays(30),
        },
      ],
    }), 'workspace-1')

    expect(entitlements.plan).toBe('growth')
    expect(entitlements.subscriptionStatus).toBe('active')
    expect(entitlements.trialEndsAt).toBeNull()
    expect(entitlements.features.analytics).toBe(true)
  })

  it('keeps trial details only when the workspace is actually in trial mode', async () => {
    const now = new Date()
    const entitlements = await getEntitlements(mockApp({
      id: 'workspace-2',
      plan: 'starter',
      status: 'trial',
      trialEndsAt: addDays(5),
      entitlements: [],
      subscriptions: [
        {
          plan: 'pro',
          status: 'trialing',
          currentPeriodStart: now,
          currentPeriodEnd: addDays(5),
        },
      ],
    }), 'workspace-2')

    expect(entitlements.plan).toBe('pro')
    expect(entitlements.subscriptionStatus).toBe('trialing')
    expect(entitlements.trialEndsAt).not.toBeNull()
    expect(entitlements.features.batchImport).toBe(true)
  })

  it('uses an active DB package as the entitlement source of truth', async () => {
    const now = new Date()
    const entitlements = await getEntitlements(mockApp({
      id: 'workspace-3',
      plan: 'custom',
      status: 'active',
      trialEndsAt: null,
      entitlements: [],
      workspaceAddons: [],
      subscriptions: [
        {
          plan: 'custom',
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: addDays(30),
          planPackage: {
            code: 'growth-plus',
            name: 'Growth Plus',
            warehouseLimit: 8,
            productLimit: 4000,
            userLimit: 15,
            features: [
              { feature: 'stockInOut', enabled: true },
              { feature: 'multiWarehouse', enabled: true },
              { feature: 'analytics', enabled: true },
              { feature: 'exportPDF', enabled: false },
              { feature: 'batchImport', enabled: true },
              { feature: 'reports', enabled: true },
            ],
          },
        },
      ],
    }), 'workspace-3')

    expect(entitlements.plan).toBe('custom')
    expect(entitlements.packageCode).toBe('growth-plus')
    expect(entitlements.packageName).toBe('Growth Plus')
    expect(entitlements.limits).toMatchObject({ warehouses: 8, products: 4000, users: 15 })
    expect(entitlements.features.batchImport).toBe(true)
    expect(entitlements.features.exportPDF).toBe(false)
  })

  it('adds active add-on feature grants and limit increments after the base package', async () => {
    const now = new Date()
    const entitlements = await getEntitlements(mockApp({
      id: 'workspace-4',
      plan: 'starter',
      status: 'active',
      trialEndsAt: null,
      entitlements: [],
      workspaceAddons: [
        {
          status: 'active',
          quantity: 2,
          currentPeriodEnd: addDays(30),
          addon: {
            code: 'extra-users',
            name: 'Extra Users',
            featureKey: 'analytics',
            limitKey: 'users',
            limitIncrement: 3,
          },
        },
      ],
      subscriptions: [
        {
          plan: 'starter',
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: addDays(30),
        },
      ],
    }), 'workspace-4')

    expect(entitlements.features.analytics).toBe(true)
    expect(entitlements.limits.users).toBe(8)
    expect(entitlements.addons).toEqual([
      { code: 'extra-users', name: 'Extra Users', quantity: 2, current_period_end: expect.any(String) },
    ])
  })
})
