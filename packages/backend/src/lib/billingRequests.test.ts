import { describe, expect, it, vi } from 'vitest'
import { approveBillingRequest, createBillingRequest } from './billingRequests.js'

function addDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

const workspace = {
  id: 'workspace-1',
  name: 'Tenant Demo',
  plan: 'starter',
  status: 'active',
}

const starterPackage = {
  id: 'pkg-starter',
  code: 'starter',
  name: 'Starter',
  status: 'active',
  monthlyPrice: 250000,
  yearlyPrice: 2500000,
}

const growthPackage = {
  id: 'pkg-growth',
  code: 'growth',
  name: 'Growth',
  status: 'active',
  monthlyPrice: 300000,
  yearlyPrice: 3000000,
}

const ctx = {
  userId: 'user-1',
  workspaceId: 'workspace-1',
  tokenWorkspaceId: 'workspace-1',
  tenantSource: 'token',
  role: 'admin',
  platformRole: 'admin',
  sessionExpiresAt: addDays(1),
} as any

function mockCreateApp() {
  const createdAt = new Date()
  const createdRequest = {
    id: 'req-1',
    workspaceId: workspace.id,
    requestedById: ctx.userId,
    type: 'plan_change',
    status: 'pending',
    currentPlanPackageId: starterPackage.id,
    requestedPlanPackageId: growthPackage.id,
    addonId: null,
    billingCycle: 'monthly',
    quantity: 1,
    requestedLimitKey: null,
    requestedLimitValue: null,
    currentAmount: 250000,
    requestedAmount: 300000,
    billingImpact: 50000,
    title: 'Request perubahan paket ke Growth',
    notes: null,
    metadata: {},
    createdAt,
    updatedAt: createdAt,
    currentPlanPackage: starterPackage,
    requestedPlanPackage: growthPackage,
    addon: null,
    workspace,
    requestedBy: { id: ctx.userId, name: 'Owner', email: 'owner@example.com' },
    reviewedBy: null,
    history: [],
  }
  const tx = {
    billingRequest: {
      create: vi.fn().mockResolvedValue(createdRequest),
      findUniqueOrThrow: vi.fn().mockResolvedValue(createdRequest),
    },
    billingRequestHistory: { create: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    notificationDelivery: { create: vi.fn().mockResolvedValue({}) },
  }
  return {
    tx,
    app: {
      prisma: {
        subscription: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'sub-1',
            workspaceId: workspace.id,
            status: 'active',
            plan: 'starter',
            billingCycle: 'monthly',
            amountSnapshot: 250000,
            currentPeriodEnd: addDays(20),
            planPackage: starterPackage,
          }),
        },
        workspace: {
          findUnique: vi.fn().mockImplementation(({ where }: any) => Promise.resolve(where.id === 'platform-admin-workspace' ? null : workspace)),
        },
        warehouse: { count: vi.fn().mockResolvedValue(1) },
        product: { count: vi.fn().mockResolvedValue(20) },
        workspaceMember: {
          count: vi.fn().mockResolvedValue(2),
          findFirst: vi.fn().mockResolvedValue({ workspaceId: 'platform-workspace' }),
        },
        supplier: { count: vi.fn().mockResolvedValue(3) },
        subscriptionEvent: { findMany: vi.fn().mockResolvedValue([]) },
        planPackage: {
          findUnique: vi.fn().mockImplementation(({ where }: any) => {
            if (where.id === growthPackage.id || where.code === 'growth') return Promise.resolve(growthPackage)
            if (where.id === starterPackage.id || where.code === 'starter') return Promise.resolve(starterPackage)
            return Promise.resolve(null)
          }),
        },
        billingRequest: { findFirst: vi.fn().mockResolvedValue(null) },
        $transaction: vi.fn((callback: any) => callback(tx)),
      },
    } as any,
  }
}

describe('billing request workflow', () => {
  it('creates a pending tenant plan request without mutating subscription state', async () => {
    const { app, tx } = mockCreateApp()

    const result = await createBillingRequest(app, ctx, {
      type: 'plan_change',
      packageCode: 'growth',
      billingCycle: 'monthly',
    })

    expect(result.status).toBe('pending')
    expect(result.billing_impact).toBe(50000)
    expect(tx.billingRequest.create).toHaveBeenCalledOnce()
    expect((tx as any).workspace?.update).toBeUndefined()
    expect((tx as any).subscription?.create).toBeUndefined()
  })

  it('activates package changes only when super admin approves the request', async () => {
    const now = new Date()
    const existingRequest = {
      id: 'req-1',
      workspaceId: workspace.id,
      requestedById: ctx.userId,
      type: 'plan_change',
      status: 'pending',
      requestedAmount: 300000,
      requestedPlanPackage: growthPackage,
      addon: null,
      billingCycle: 'monthly',
      quantity: 1,
      title: 'Request perubahan paket ke Growth',
      currentAmount: 250000,
      billingImpact: 50000,
      metadata: {},
      requestedBy: { id: ctx.userId, name: 'Owner', email: 'owner@example.com' },
    }
    const updatedRequest = {
      ...existingRequest,
      status: 'approved',
      reviewedBy: { id: 'admin-1', name: 'Super Admin', email: 'admin@example.com' },
      workspace,
      currentPlanPackage: starterPackage,
      requestedPlanPackage: growthPackage,
      history: [],
      createdAt: now,
      updatedAt: now,
      decidedAt: now,
    }
    const tx = {
      workspace: { update: vi.fn().mockResolvedValue(workspace) },
      subscription: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: 'sub-2' }),
      },
      subscriptionEvent: { create: vi.fn().mockResolvedValue({}) },
      billingRequest: {
        update: vi.fn().mockResolvedValue(updatedRequest),
        findUniqueOrThrow: vi.fn().mockResolvedValue(updatedRequest),
      },
      billingRequestHistory: { create: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      notificationDelivery: { create: vi.fn().mockResolvedValue({}) },
    }
    const app = {
      prisma: {
        billingRequest: { findUnique: vi.fn().mockResolvedValue(existingRequest) },
        $transaction: vi.fn((callback: any) => callback(tx)),
      },
    } as any

    const result = await approveBillingRequest(app, { ...ctx, userId: 'admin-1', platformRole: 'super_admin' }, 'req-1', {
      notes: 'Approved',
    })

    expect(result.status).toBe('approved')
    expect(tx.workspace.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: workspace.id },
      data: expect.objectContaining({ plan: 'growth', status: 'active' }),
    }))
    expect(tx.subscription.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        workspaceId: workspace.id,
        planPackageId: growthPackage.id,
        source: 'admin',
        amountSnapshot: 300000,
      }),
    }))
  })
})
