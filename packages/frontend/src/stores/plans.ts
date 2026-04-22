import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type PlanType = 'free' | 'starter' | 'growth' | 'pro'

export interface Plan {
  id: PlanType
  name: string
  price: number | null
  period: string
  description: string
  warehouses: number
  products: number
  users: number
  features: {
    stockInOut: boolean
    multiWarehouse: boolean
    analytics: boolean
    exportPDF: boolean
    batchImport: boolean
    reports: boolean
  }
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    description: 'Untuk coba-coba dan belajar',
    warehouses: 1,
    products: 100,
    users: 1,
    features: {
      stockInOut: false,
      multiWarehouse: false,
      analytics: false,
      exportPDF: false,
      batchImport: false,
      reports: true,
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 49000,
    period: 'bulan',
    description: 'Untuk bisnis rumahan & toko kecil',
    warehouses: 1,
    products: 500,
    users: 2,
    features: {
      stockInOut: true,
      multiWarehouse: false,
      analytics: false,
      exportPDF: false,
      batchImport: false,
      reports: true,
    },
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 149000,
    period: 'bulan',
    description: 'Untuk bisnis yang berkembang',
    warehouses: 5,
    products: 2000,
    users: 10,
    features: {
      stockInOut: true,
      multiWarehouse: true,
      analytics: true,
      exportPDF: false,
      batchImport: false,
      reports: true,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 299000,
    period: 'bulan',
    description: 'Untuk bisnis skala besar',
    warehouses: 999,
    products: 99999,
    users: 999,
    features: {
      stockInOut: true,
      multiWarehouse: true,
      analytics: true,
      exportPDF: true,
      batchImport: true,
      reports: true,
    },
  },
]

export const usePlansStore = defineStore('plans', () => {
  const currentPlan = ref<PlanType>('free')

  const currentPlanData = computed((): Plan => {
    return PLANS.find(p => p.id === currentPlan.value) || PLANS[0]
  })

  const canAccessFeature = computed(() => (feature: keyof Plan['features']) => {
    return currentPlanData.value.features[feature]
  })

  const canAccessStockInOut = computed(() => currentPlanData.value.features.stockInOut)
  const canAccessMultiWarehouse = computed(() => currentPlanData.value.features.multiWarehouse)
  const canAccessAnalytics = computed(() => currentPlanData.value.features.analytics)
  const canExportPDF = computed(() => currentPlanData.value.features.exportPDF)
  const canBatchImport = computed(() => currentPlanData.value.features.batchImport)

  function setPlan(plan: PlanType) {
    currentPlan.value = plan
  }

  function getPlanById(id: string): Plan | undefined {
    return PLANS.find(p => p.id === id)
  }

  function formatPrice(price: number | null): string {
    if (price === null || price === 0) return 'Gratis'
    return `Rp ${price.toLocaleString('id-ID')}`
  }

  return {
    currentPlan,
    currentPlanData,
    canAccessFeature,
    canAccessStockInOut,
    canAccessMultiWarehouse,
    canAccessAnalytics,
    canExportPDF,
    canBatchImport,
    setPlan,
    getPlanById,
    formatPrice,
  }
})