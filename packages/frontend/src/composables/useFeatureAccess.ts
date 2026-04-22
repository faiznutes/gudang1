import { computed } from 'vue'
import { usePlansStore } from '@/stores/plans'
import { useTrialStore } from '@/stores/trial'

export function useFeatureAccess() {
  const plansStore = usePlansStore()
  const trialStore = useTrialStore()

  const isTrialActive = computed(() => trialStore.isTrial)
  const currentPlanId = computed(() => plansStore.currentPlan)

  function canAccessStockInOut(): boolean {
    if (trialStore.isTrial) return true
    return plansStore.currentPlanData.features.stockInOut
  }

  function canAccessMultiWarehouse(): boolean {
    if (trialStore.isTrial) return true
    return plansStore.currentPlanData.features.multiWarehouse
  }

  function canAccessAnalytics(): boolean {
    if (trialStore.isTrial) return true
    return plansStore.currentPlanData.features.analytics
  }

  function canExportPDF(): boolean {
    if (trialStore.isTrial) return true
    return plansStore.currentPlanData.features.exportPDF
  }

  function canBatchImport(): boolean {
    if (trialStore.isTrial) return true
    return plansStore.currentPlanData.features.batchImport
  }

  function getLockedFeatureMessage(feature: string): { title: string; message: string; currentPlan: string; requiredPlan: string } {
    const featureNames: Record<string, string> = {
      stockInOut: 'Stock Masuk/Keluar',
      multiWarehouse: 'Multi Gudang',
      analytics: 'Analytics',
      exportPDF: 'Export PDF',
      batchImport: 'Import CSV',
    }

    const featureName = featureNames[feature] || feature
    const planName = currentPlanId.value === 'free' ? 'Free' : currentPlanId.value.charAt(0).toUpperCase() + currentPlanId.value.slice(1)

    return {
      title: `Akses ${featureName} Terkunci`,
      message: `Upgrade ke paket Starter atau lebih tinggi untuk mengakses fitur ${featureName}.`,
      currentPlan: planName,
      requiredPlan: feature === 'stockInOut' ? 'Starter' : feature === 'multiWarehouse' || feature === 'analytics' ? 'Growth' : 'Pro',
    }
  }

  return {
    isTrial: isTrialActive,
    currentPlan: currentPlanId,
    canAccessStockInOut,
    canAccessMultiWarehouse,
    canAccessAnalytics,
    canExportPDF,
    canBatchImport,
    getLockedFeatureMessage,
  }
}