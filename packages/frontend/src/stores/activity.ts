import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { activityService, type StockMove } from '@/services/api/activities'

export type StockMoveType = 'in' | 'out' | 'transfer'
export type { StockMove }

export const useActivityStore = defineStore('activity', () => {
  const activities = ref<StockMove[]>([])
  const isLoading = ref(false)

  const recentActivities = computed(() => {
    return [...activities.value]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
  })

  const totalStockIn = computed(() => {
    return activities.value
      .filter(a => a.type === 'in')
      .reduce((sum, a) => sum + a.quantity, 0)
  })

  const totalStockOut = computed(() => {
    return activities.value
      .filter(a => a.type === 'out')
      .reduce((sum, a) => sum + a.quantity, 0)
  })

  async function loadActivities() {
    isLoading.value = true
    try {
      activities.value = await activityService.getActivities()
    } finally {
      isLoading.value = false
    }
  }

  function addActivity(activity: Omit<StockMove, 'id' | 'created_at'>) {
    const newActivity: StockMove = {
      ...activity,
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
    }
    activities.value.unshift(newActivity)
    return newActivity
  }

  function getActivitiesByProduct(productId: string) {
    return activities.value.filter(a => a.product_id === productId)
  }

  function getActivitiesByWarehouse(warehouseId: string) {
    return activities.value.filter(a => a.warehouse_id === warehouseId)
  }

  function getActivitiesByDateRange(start: Date, end: Date) {
    return activities.value.filter(a => {
      const date = new Date(a.created_at)
      return date >= start && date <= end
    })
  }

  function reset() {
    activities.value = []
  }

  return {
    activities,
    isLoading,
    recentActivities,
    totalStockIn,
    totalStockOut,
    loadActivities,
    addActivity,
    getActivitiesByProduct,
    getActivitiesByWarehouse,
    getActivitiesByDateRange,
    reset,
  }
})
