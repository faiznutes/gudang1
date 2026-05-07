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
})
