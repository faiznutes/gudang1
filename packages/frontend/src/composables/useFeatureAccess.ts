import { computed } from 'vue'
import { usePlansStore } from '@/stores/plans'
import { useTrialStore } from '@/stores/trial'
import { useEntitlementsStore } from '@/stores/entitlements'

export function useFeatureAccess() {
  const plansStore = usePlansStore()
  const trialStore = useTrialStore()
  const entitlementsStore = useEntitlementsStore()

  const isTrialActive = computed(() => entitlementsStore.isTrial || trialStore.isTrial)
  const currentPlanId = computed(() => entitlementsStore.currentPlan || plansStore.currentPlan)

  function canAccessStockInOut(): boolean {
    if (entitlementsStore.entitlements) return entitlementsStore.canAccessFeature('stockInOut')
    if (trialStore.isTrial) return true
    return plansStore.currentPlanData.features.stockInOut
  }

  function canAccessMultiWarehouse(): boolean {
    if (entitlementsStore.entitlements) return entitlementsStore.canAccessFeature('multiWarehouse')
    if (trialStore.isTrial) return true
    return plansStore.currentPlanData.features.multiWarehouse
  }

  function canAccessAnalytics(): boolean {
    if (entitlementsStore.entitlements) return entitlementsStore.canAccessFeature('analytics')
    if (trialStore.isTrial) return true
    return plansStore.currentPlanData.features.analytics
  }

  function canExportPDF(): boolean {
    if (entitlementsStore.entitlements) return entitlementsStore.canAccessFeature('exportPDF')
    if (trialStore.isTrial) return true
    return plansStore.currentPlanData.features.exportPDF
  }

  function canBatchImport(): boolean {
    if (entitlementsStore.entitlements) return entitlementsStore.canAccessFeature('batchImport')
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
    const requiredPlan = feature === 'stockInOut' ? 'Starter' : feature === 'multiWarehouse' || feature === 'analytics' ? 'Growth' : 'Pro'

    return {
      title: `Akses ${featureName} Terkunci`,
      message: `Upgrade ke paket ${requiredPlan} untuk mengakses fitur ${featureName}.`,
      currentPlan: planName,
      requiredPlan,
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
