import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import notificationService, { type NotificationItem } from '@/services/api/notifications'

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<NotificationItem[]>([])
  const unreadCount = ref(0)
  const isLoading = ref(false)
  const lastError = ref<string | null>(null)

  const criticalCount = computed(() => items.value.filter(item => item.severity === 'critical').length)

  async function loadNotifications() {
    isLoading.value = true
    lastError.value = null
    try {
      const response = await notificationService.getNotifications()
      items.value = response.data
      unreadCount.value = response.unread_count
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Notifikasi gagal dimuat'
    } finally {
      isLoading.value = false
    }
  }

  function reset() {
    items.value = []
    unreadCount.value = 0
    lastError.value = null
  }

  return {
    items,
    unreadCount,
    criticalCount,
    isLoading,
    lastError,
    loadNotifications,
    reset,
  }
})
