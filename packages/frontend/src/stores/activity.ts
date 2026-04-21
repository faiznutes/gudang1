import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type StockMoveType = 'in' | 'out' | 'transfer'

export interface StockMove {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  warehouse_id: string
  warehouse_name: string
  to_warehouse_id?: string
  to_warehouse_name?: string
  type: StockMoveType
  quantity: number
  notes?: string
  user_id: string
  user_name: string
  created_at: string
}

export const useActivityStore = defineStore('activity', () => {
  const activities = ref<StockMove[]>([
    {
      id: 'a1',
      product_id: 'p1',
      product_name: 'Baju Kaos Polos',
      product_sku: 'SKU-001',
      warehouse_id: 'w1',
      warehouse_name: 'Gudang Utama',
      type: 'in',
      quantity: 50,
      notes: 'Pembelian dari supplier ABC',
      user_id: '1',
      user_name: 'Admin User',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'a2',
      product_id: 'p2',
      product_name: 'Celana Jeans Slim',
      product_sku: 'SKU-002',
      warehouse_id: 'w1',
      warehouse_name: 'Gudang Utama',
      type: 'in',
      quantity: 20,
      notes: 'Pembelian dari supplier XYZ',
      user_id: '1',
      user_name: 'Admin User',
      created_at: '2024-01-15T09:00:00Z',
    },
    {
      id: 'a3',
      product_id: 'p3',
      product_name: 'Sepatu Sneakers',
      product_sku: 'SKU-003',
      warehouse_id: 'w1',
      warehouse_name: 'Gudang Utama',
      type: 'out',
      quantity: 2,
      notes: 'Pesanan customer #123',
      user_id: '1',
      user_name: 'Admin User',
      created_at: '2024-01-14T15:00:00Z',
    },
    {
      id: 'a4',
      product_id: 'p1',
      product_name: 'Baju Kaos Polos',
      product_sku: 'SKU-001',
      warehouse_id: 'w1',
      warehouse_name: 'Gudang Utama',
      to_warehouse_id: 'w2',
      to_warehouse_name: 'Gudang Bandung',
      type: 'transfer',
      quantity: 20,
      notes: 'Transfer antar gudang',
      user_id: '1',
      user_name: 'Admin User',
      created_at: '2024-01-14T10:00:00Z',
    },
  ])

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

  function addActivity(activity: Omit<StockMove, 'id' | 'created_at'>) {
    const newActivity: StockMove = {
      ...activity,
      id: 'a' + Date.now(),
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

  return {
    activities,
    recentActivities,
    totalStockIn,
    totalStockOut,
    addActivity,
    getActivitiesByProduct,
    getActivitiesByWarehouse,
    getActivitiesByDateRange,
  }
})