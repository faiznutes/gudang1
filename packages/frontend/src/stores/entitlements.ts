import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { entitlementService } from '@/services/api/entitlements'
import type { EntitlementResponse } from '@/services/api/auth'

const defaultEntitlements: EntitlementResponse = {
  plan: 'free',
  subscriptionStatus: 'none',
  trialEndsAt: null,
  features: {
    stockInOut: false,
    multiWarehouse: false,
    analytics: false,
    exportPDF: false,
    batchImport: false,
    reports: true,
  },
  limits: {
    warehouses: 1,
    products: 100,
    users: 1,
  },
  usage: {
    warehouses: 0,
    products: 0,
    users: 0,
  },
}

export const useEntitlementsStore = defineStore('entitlements', () => {
  const entitlements = ref<EntitlementResponse>({ ...defaultEntitlements })
  const isLoading = ref(false)
  const lastError = ref<string | null>(null)

  const currentPlan = computed(() => entitlements.value.plan)
  const isTrial = computed(() => {
    if (!entitlements.value.trialEndsAt) return false
    return new Date(entitlements.value.trialEndsAt) > new Date()
  })

  function setEntitlements(value: EntitlementResponse | null | undefined) {
    entitlements.value = value ? { ...value } : { ...defaultEntitlements }
  }

  async function refresh() {
    isLoading.value = true
    lastError.value = null
    try {
      setEntitlements(await entitlementService.getEntitlements())
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Gagal memuat entitlement'
      throw error
    } finally {
      isLoading.value = false
    }
  }

  function canAccessFeature(feature: keyof EntitlementResponse['features']) {
    return entitlements.value.features[feature]
  }

  function reset() {
    setEntitlements(defaultEntitlements)
    lastError.value = null
  }

  return {
    entitlements,
    isLoading,
    lastError,
    currentPlan,
    isTrial,
    setEntitlements,
    refresh,
    canAccessFeature,
    reset,
  }
})
