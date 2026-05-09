import { describe, expect, it, vi } from 'vitest'
import { runSubscriptionLifecycle } from './subscriptionLifecycle.js'

function appFor(subscriptions: any[]) {
  const tx = {
    subscription: { update: vi.fn() },
    subscriptionEvent: { create: vi.fn() },
    notificationDelivery: { create: vi.fn() },
  }
  return {
    prisma: {
      subscription: {
        findMany: vi.fn().mockResolvedValue(subscriptions),
      },
      notificationDelivery: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    },
    tx,
  } as any
}

describe('runSubscriptionLifecycle', () => {
  it('marks expired active subscriptions and queues one in-app notification', async () => {
    const now = new Date('2026-05-09T00:00:00.000Z')
    const app = appFor([
      {
        id: 'sub-expired',
        workspaceId: 'workspace-1',
        plan: 'starter',
        status: 'active',
        currentPeriodEnd: new Date('2026-05-07T00:00:00.000Z'),
        workspace: { name: 'Tenant A' },
        planPackage: { code: 'starter', name: 'Starter' },
      },
    ])

    const result = await runSubscriptionLifecycle(app, now)

    expect(result).toEqual({ expired: 1, reminders: 0 })
    expect(app.tx.subscription.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sub-expired' },
      data: expect.objectContaining({ status: 'expired', expiredProcessedAt: now }),
    }))
    expect(app.tx.notificationDelivery.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        workspaceId: 'workspace-1',
        channel: 'in_app',
        status: 'pending',
      }),
    }))
  })

  it('queues renewal reminders on configured day thresholds without expiring the subscription', async () => {
    const now = new Date('2026-05-09T00:00:00.000Z')
    const app = appFor([
      {
        id: 'sub-reminder',
        workspaceId: 'workspace-2',
        plan: 'growth',
        status: 'active',
        currentPeriodEnd: new Date('2026-05-12T00:00:00.000Z'),
        workspace: { name: 'Tenant B' },
        planPackage: { code: 'growth', name: 'Growth' },
      },
    ])

    const result = await runSubscriptionLifecycle(app, now)

    expect(result).toEqual({ expired: 0, reminders: 1 })
    expect(app.tx.subscription.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sub-reminder' },
      data: { renewalReminderSentAt: now },
    }))
    expect(app.tx.notificationDelivery.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: 'subscription.reminder.sub-reminder.3',
        payload: expect.objectContaining({ days_remaining: 3 }),
      }),
    }))
  })
})
