import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { getPlatformSettings } from '../lib/settings.js'
import { requireAuth } from '../middleware/auth.js'

const DAY_MS = 24 * 60 * 60 * 1000

type NotificationSeverity = 'info' | 'warning' | 'critical'

interface NotificationItem {
  id: string
  type: 'low_stock' | 'subscription_expiring' | 'subscription_expired'
  severity: NotificationSeverity
  title: string
  message: string
  created_at: string
  action_url?: string
  days_remaining?: number
  read: boolean
}

function daysUntil(date: Date, now: Date) {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS)
}

function severityForDays(days: number): NotificationSeverity {
  if (days <= 1) return 'critical'
  if (days <= 3) return 'warning'
  return 'info'
}

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/notifications', async (request) => {
    const ctx = await requireAuth(app, request)
    const settings = await getPlatformSettings(app)
    const now = new Date()
    const notifications: NotificationItem[] = []

    if (settings.lowStockAlertsEnabled && ctx.platformRole !== 'super_admin') {
      const lowStockItems = await app.prisma.inventoryItem.findMany({
        where: { workspaceId: ctx.workspaceId },
        include: { product: true, warehouse: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      })

      for (const item of lowStockItems.filter(row => row.quantity <= row.product.minStock)) {
        notifications.push({
          id: `low-stock:${item.id}`,
          type: 'low_stock',
          severity: item.quantity === 0 ? 'critical' : 'warning',
          title: 'Stok menipis',
          message: `${item.product.name} di ${item.warehouse.name} tersisa ${item.quantity}. Minimum aman ${item.product.minStock}.`,
          created_at: item.updatedAt.toISOString(),
          action_url: `/app/inventory/${item.productId}`,
          read: false,
        })
      }
    }

    if (settings.subscriptionRemindersEnabled) {
      const activeStatuses = ['active', 'trialing']
      const subscriptionWhere: Prisma.SubscriptionWhereInput =
        ctx.platformRole === 'super_admin'
          ? { status: { in: activeStatuses as any } }
          : { workspaceId: ctx.workspaceId, status: { in: activeStatuses as any } }

      const subscriptions = await app.prisma.subscription.findMany({
        where: subscriptionWhere,
        include: { workspace: true },
        orderBy: { currentPeriodEnd: 'asc' },
        take: ctx.platformRole === 'super_admin' ? 50 : 5,
      })

      for (const subscription of subscriptions) {
        const days = daysUntil(subscription.currentPeriodEnd, now)
        if (days < 0) {
          notifications.push({
            id: `subscription-expired:${subscription.id}`,
            type: 'subscription_expired',
            severity: 'critical',
            title: 'Langganan berakhir',
            message: `${subscription.workspace.name} sudah melewati masa aktif paket ${subscription.plan}.`,
            created_at: now.toISOString(),
            action_url: ctx.platformRole === 'super_admin' ? '/admin/subscriptions' : '/app/billing',
            days_remaining: 0,
            read: false,
          })
          continue
        }

        if (days >= 1 && days <= settings.subscriptionReminderDays) {
          notifications.push({
            id: `subscription-expiring:${subscription.id}:${days}`,
            type: 'subscription_expiring',
            severity: severityForDays(days),
            title: days === 1 ? 'Langganan berakhir besok' : `Langganan ${days} hari lagi`,
            message: `${subscription.workspace.name} paket ${subscription.plan} berakhir dalam ${days} hari.`,
            created_at: now.toISOString(),
            action_url: ctx.platformRole === 'super_admin' ? '/admin/subscriptions' : '/app/billing',
            days_remaining: days,
            read: false,
          })
        }
      }
    }

    notifications.sort((a, b) => {
      const rank: Record<NotificationSeverity, number> = { critical: 0, warning: 1, info: 2 }
      return rank[a.severity] - rank[b.severity] || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return {
      unread_count: notifications.length,
      data: notifications.slice(0, 20),
    }
  })
}
