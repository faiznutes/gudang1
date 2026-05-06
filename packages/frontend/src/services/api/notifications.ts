import api from './client'

export type NotificationSeverity = 'info' | 'warning' | 'critical'

export interface NotificationItem {
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

export interface NotificationResponse {
  unread_count: number
  data: NotificationItem[]
}

export const notificationService = {
  async getNotifications(): Promise<NotificationResponse> {
    return api.get<NotificationResponse>('/notifications')
  },
}

export default notificationService
