import type { FastifyInstance } from 'fastify'

const DAY_MS = 24 * 60 * 60 * 1000
const REMINDER_DAYS = [7, 3, 1]
const LIFECYCLE_INTERVAL_MS = 6 * 60 * 60 * 1000

function daysUntil(date: Date, now: Date) {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS)
}

function reminderDayFor(days: number) {
  return REMINDER_DAYS.find(reminderDay => days === reminderDay)
}

export async function runSubscriptionLifecycle(app: FastifyInstance, now = new Date()) {
  const reminderWindowEnd = new Date(now.getTime() + Math.max(...REMINDER_DAYS) * DAY_MS)
  const subscriptions = await app.prisma.subscription.findMany({
    where: {
      status: { in: ['active', 'trialing'] },
      currentPeriodEnd: { lte: reminderWindowEnd },
    },
    include: { workspace: true, planPackage: true },
    orderBy: { currentPeriodEnd: 'asc' },
  })

  let expired = 0
  let reminders = 0

  for (const subscription of subscriptions) {
    const days = daysUntil(subscription.currentPeriodEnd, now)
    const packageCode = subscription.planPackage?.code ?? subscription.plan
    const packageName = subscription.planPackage?.name ?? subscription.plan

    if (days < 0) {
      const eventType = `subscription.expired.${subscription.id}`
      const existing = await app.prisma.notificationDelivery.findFirst({
        where: { workspaceId: subscription.workspaceId, type: eventType },
      })

      await app.prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { status: 'expired', expiredProcessedAt: now },
        })
        await tx.subscriptionEvent.create({
          data: {
            workspaceId: subscription.workspaceId,
            subscriptionId: subscription.id,
            type: 'subscription.expired',
            metadata: { package_code: packageCode, ended_at: subscription.currentPeriodEnd.toISOString() },
          },
        })
        if (!existing) {
          await tx.notificationDelivery.create({
            data: {
              workspaceId: subscription.workspaceId,
              channel: 'in_app',
              type: eventType,
              status: 'pending',
              scheduledAt: now,
              payload: {
                subscription_id: subscription.id,
                package_code: packageCode,
                package_name: packageName,
                workspace_name: subscription.workspace.name,
                ended_at: subscription.currentPeriodEnd.toISOString(),
              },
            },
          })
        }
      })
      expired += 1
      continue
    }

    const reminderDay = reminderDayFor(days)
    if (!reminderDay) continue

    const eventType = `subscription.reminder.${subscription.id}.${reminderDay}`
    const existing = await app.prisma.notificationDelivery.findFirst({
      where: { workspaceId: subscription.workspaceId, type: eventType },
    })
    if (existing) continue

    await app.prisma.$transaction(async (tx) => {
      await tx.notificationDelivery.create({
        data: {
          workspaceId: subscription.workspaceId,
          channel: 'in_app',
          type: eventType,
          status: 'pending',
          scheduledAt: now,
          payload: {
            subscription_id: subscription.id,
            package_code: packageCode,
            package_name: packageName,
            workspace_name: subscription.workspace.name,
            days_remaining: reminderDay,
            ends_at: subscription.currentPeriodEnd.toISOString(),
          },
        },
      })
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { renewalReminderSentAt: now },
      })
      await tx.subscriptionEvent.create({
        data: {
          workspaceId: subscription.workspaceId,
          subscriptionId: subscription.id,
          type: 'subscription.reminder_queued',
          metadata: { package_code: packageCode, days_remaining: reminderDay },
        },
      })
    })
    reminders += 1
  }

  return { expired, reminders }
}

export function installSubscriptionLifecycle(app: FastifyInstance) {
  if (process.env.NODE_ENV === 'test') return

  const run = () => {
    runSubscriptionLifecycle(app).catch((error) => {
      app.log.error({ err: error }, 'Subscription lifecycle run failed')
    })
  }

  void app.ready().then(run)
  const timer = setInterval(run, LIFECYCLE_INTERVAL_MS)
  app.addHook('onClose', async () => {
    clearInterval(timer)
  })
}
