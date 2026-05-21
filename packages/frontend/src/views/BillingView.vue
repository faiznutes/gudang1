<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Boxes, Check, Clock, Crown, PackagePlus, Send, ShieldCheck, Sparkles, Users, Warehouse } from 'lucide-vue-next'
import SubscriptionCountdownCard from '@/components/SubscriptionCountdownCard.vue'
import { billingService } from '@/services/api/billing'
import type { Addon, BillingCycle, BillingRequest, BillingRequestStatus, PlanPackage } from '@/services/api/admin'
import { useAuthStore } from '@/stores/auth'
import { useEntitlementsStore } from '@/stores/entitlements'
import { PLANS, type Plan } from '@/stores/plans'
import { billingRequestStatusLabels, billingRequestTypeLabels, labelFrom } from '@/lib/labels'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const entitlementsStore = useEntitlementsStore()

const packages = ref<PlanPackage[]>([])
const addons = ref<Addon[]>([])
const requests = ref<BillingRequest[]>([])
const loading = ref(true)
const savingId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const packagesSection = ref<HTMLElement | null>(null)
const addonsSection = ref<HTMLElement | null>(null)

function cycleFromRoute(): Exclude<BillingCycle, 'manual'> {
  return route.query.cycle === 'yearly' ? 'yearly' : 'monthly'
}

const selectedCycle = ref<Exclude<BillingCycle, 'manual'>>(cycleFromRoute())
const customDraft = ref({
  title: '',
  notes: '',
})

type BillingPlan = {
  id: string
  name: string
  price: number | null
  yearlyPrice?: number | null
  originalPrice?: number | null
  marketPrice?: number | null
  discountPercent?: number | null
  period: string
  description: string
  warehouses: number
  products: number
  users: number
  features: Plan['features']
}

const currentPlan = computed(() => entitlementsStore.entitlements.packageCode || entitlementsStore.currentPlan || authStore.workspace?.plan || 'free')
const subscriptionEndsAt = computed(() => entitlementsStore.entitlements.subscriptionEndsAt || entitlementsStore.entitlements.trialEndsAt)
const activeAddons = computed(() => entitlementsStore.entitlements.addons ?? [])
const pendingRequests = computed(() => requests.value.filter(request => request.status === 'pending'))
const highlightedPlanId = computed(() => typeof route.query.package === 'string' ? route.query.package : '')
const highlightedAddonId = computed(() => typeof route.query.addon === 'string' ? route.query.addon : '')
const visiblePlans = computed<BillingPlan[]>(() => {
  if (packages.value.length > 0) {
    return packages.value.map(plan => ({
      id: plan.code,
      name: plan.name,
      price: selectedCycle.value === 'yearly' ? (plan.yearly_price ?? plan.monthly_price * 12) : plan.monthly_price,
      yearlyPrice: plan.yearly_price,
      originalPrice: plan.original_monthly_price,
      marketPrice: selectedCycle.value === 'yearly'
        ? ((plan.market_price ?? plan.original_monthly_price ?? plan.monthly_price) * 12)
        : (plan.market_price ?? plan.original_monthly_price ?? plan.monthly_price),
      discountPercent: plan.discount_percent,
      period: selectedCycle.value === 'yearly' ? 'tahun' : 'bulan',
      description: plan.description || 'Paket operasional gudang dan stok',
      warehouses: plan.limits.warehouses,
      products: plan.limits.products,
      users: plan.limits.users,
      features: {
        stockInOut: plan.features.stockInOut,
        multiWarehouse: plan.features.multiWarehouse,
        analytics: plan.features.analytics,
        exportPDF: plan.features.exportPDF,
        batchImport: plan.features.batchImport,
        reports: plan.features.reports,
      },
    }))
  }
  return PLANS
})
const currentPlanData = computed(() => visiblePlans.value.find(plan => plan.id === currentPlan.value) ?? visiblePlans.value[0])
const shouldShowTrialCta = computed(() => {
  const status = entitlementsStore.entitlements.subscriptionStatus
  return currentPlan.value === 'free' && status !== 'active' && status !== 'trialing'
})

const featureNames: Record<string, string> = {
  stockInOut: 'Stok Masuk/Keluar',
  multiWarehouse: 'Multi Gudang',
  analytics: 'Analytics',
  exportPDF: 'Export PDF',
  batchImport: 'Import CSV',
  reports: 'Laporan',
}
const featureColumns = ['stockInOut', 'multiWarehouse', 'analytics', 'exportPDF', 'batchImport', 'reports']

function isActive(planId: string) {
  return currentPlan.value === planId
}

function pendingPlanRequest(planId: string) {
  return pendingRequests.value.some(request => request.type === 'plan_change' && request.requested_package?.code === planId)
}

function pendingAddonRequest(addonId: string) {
  return pendingRequests.value.some(request => request.type === 'addon_activation' && request.addon?.id === addonId)
}

function statusTone(status: BillingRequestStatus) {
  const tones: Record<BillingRequestStatus, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rejected: 'bg-rose-50 text-rose-700 border-rose-100',
    cancelled: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  }
  return tones[status]
}

async function submitPlanRequest(planId: string) {
  if (planId === 'free' || isActive(planId)) return
  markPlanRoute(planId)
  savingId.value = `plan:${planId}`
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await billingService.changePlan(planId, selectedCycle.value)
    successMessage.value = 'Pengajuan perubahan paket sudah dikirim.'
    await loadRequests()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Request paket gagal dikirim'
  } finally {
    savingId.value = ''
  }
}

async function submitAddonRequest(addon: Addon) {
  markAddonRoute(addon.id)
  savingId.value = `addon:${addon.id}`
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await billingService.requestAddon(addon.id, selectedCycle.value)
    successMessage.value = 'Pengajuan add-on sudah dikirim.'
    await loadRequests()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Request add-on gagal dikirim'
  } finally {
    savingId.value = ''
  }
}

async function submitCustomRequest() {
  if (!customDraft.value.title.trim()) return
  savingId.value = 'custom'
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await billingService.createRequest({
      type: 'custom_feature',
      title: customDraft.value.title,
      notes: customDraft.value.notes,
      billing_cycle: selectedCycle.value,
    })
    customDraft.value = { title: '', notes: '' }
    successMessage.value = 'Request fitur kustom masuk ke antrean review.'
    await loadRequests()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Request fitur kustom gagal dikirim'
  } finally {
    savingId.value = ''
  }
}

function formatPrice(price: number | null): string {
  if (price === null || price === 0) return 'Gratis'
  return 'Rp ' + price.toLocaleString('id-ID')
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

function limitLabel(value: number) {
  return value >= 9999 ? 'Unlimited' : value.toLocaleString('id-ID')
}

function remainingLabel(limit: number, usage: number) {
  if (limit >= 9999) return 'Unlimited'
  return Math.max(0, limit - usage).toLocaleString('id-ID')
}

function hasPromo(plan: BillingPlan): boolean {
  return !!plan.marketPrice && !!plan.price && plan.marketPrice > plan.price
}

function getFeatureValue(plan: BillingPlan, feature: string): boolean {
  return (plan.features as any)[feature] || false
}

function goToTrial() {
  router.push('/trial-signup')
}

function setCycle(cycle: Exclude<BillingCycle, 'manual'>) {
  selectedCycle.value = cycle
  router.replace({ name: 'billing', query: { ...route.query, cycle } })
}

async function syncRouteFocus() {
  selectedCycle.value = cycleFromRoute()
  await nextTick()
  const target = route.query.section === 'addons' || highlightedAddonId.value ? addonsSection.value : packagesSection.value
  if (target && (route.query.section || highlightedPlanId.value || highlightedAddonId.value)) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function markPlanRoute(planId: string) {
  router.replace({ name: 'billing', query: { ...route.query, package: planId, section: 'packages', cycle: selectedCycle.value } })
}

function markAddonRoute(addonId: string) {
  router.replace({ name: 'billing', query: { ...route.query, addon: addonId, section: 'addons', cycle: selectedCycle.value } })
}

async function loadRequests() {
  requests.value = await billingService.getRequests()
}

async function loadBilling() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [packageRows, addonRows, requestRows] = await Promise.all([
      billingService.getPackages().catch(() => []),
      billingService.getAddons().catch(() => []),
      billingService.getRequests().catch(() => []),
    ])
    packages.value = packageRows
    addons.value = addonRows
    requests.value = requestRows
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Data paket gagal dimuat'
  } finally {
    loading.value = false
  }
}

watch(() => route.query, () => {
  syncRouteFocus()
})

onMounted(async () => {
  await loadBilling()
  await syncRouteFocus()
})
</script>

<template>
  <div class="p-4 lg:p-8 space-y-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-900">Paket & Add-on</h1>
        <p class="text-neutral-600">Ajukan perubahan paket atau tambahan fitur. Tim StockPilot akan meninjau sebelum aktif.</p>
      </div>
      <div class="inline-flex rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
        <button :class="['rounded-lg px-4 py-2 text-sm font-bold', selectedCycle === 'monthly' ? 'bg-neutral-950 text-white' : 'text-neutral-600']" @click="setCycle('monthly')">
          Bulanan
        </button>
        <button :class="['rounded-lg px-4 py-2 text-sm font-bold', selectedCycle === 'yearly' ? 'bg-neutral-950 text-white' : 'text-neutral-600']" @click="setCycle('yearly')">
          Tahunan
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-xl border border-danger-100 bg-danger-50 p-4 text-sm font-semibold text-danger-700">
      {{ errorMessage }}
    </div>
    <div v-if="successMessage" class="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
      {{ successMessage }}
    </div>

    <section class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div class="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="text-primary-200 text-sm">Paket saat ini</p>
            <h2 class="mt-1 text-2xl font-bold">{{ currentPlanData?.name }}</h2>
            <p class="mt-1 text-primary-100">
              {{ currentPlan === 'free' ? 'Gratis selamanya' : `${formatPrice(currentPlanData?.price || 0)}/${currentPlanData?.period}` }}
            </p>
            <p class="mt-3 text-sm text-primary-100">Berakhir: {{ formatDate(subscriptionEndsAt) }}</p>
          </div>
          <span class="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
            <ShieldCheck class="h-4 w-4" />
            {{ entitlementsStore.entitlements.subscriptionStatus === 'active' ? 'Aktif' : entitlementsStore.entitlements.subscriptionStatus === 'trialing' ? 'Trial' : 'Perlu follow-up' }}
          </span>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl bg-white/15 p-3">
            <Warehouse class="h-5 w-5 text-primary-100" />
            <p class="mt-2 text-lg font-black">{{ entitlementsStore.entitlements.usage.warehouses }}/{{ limitLabel(entitlementsStore.entitlements.limits.warehouses) }}</p>
            <p class="text-xs text-primary-100">Gudang, sisa {{ remainingLabel(entitlementsStore.entitlements.limits.warehouses, entitlementsStore.entitlements.usage.warehouses) }}</p>
          </div>
          <div class="rounded-xl bg-white/15 p-3">
            <Boxes class="h-5 w-5 text-primary-100" />
            <p class="mt-2 text-lg font-black">{{ entitlementsStore.entitlements.usage.products }}/{{ limitLabel(entitlementsStore.entitlements.limits.products) }}</p>
            <p class="text-xs text-primary-100">Produk, sisa {{ remainingLabel(entitlementsStore.entitlements.limits.products, entitlementsStore.entitlements.usage.products) }}</p>
          </div>
          <div class="rounded-xl bg-white/15 p-3">
            <Users class="h-5 w-5 text-primary-100" />
            <p class="mt-2 text-lg font-black">{{ entitlementsStore.entitlements.usage.users }}/{{ limitLabel(entitlementsStore.entitlements.limits.users) }}</p>
            <p class="text-xs text-primary-100">User, sisa {{ remainingLabel(entitlementsStore.entitlements.limits.users, entitlementsStore.entitlements.usage.users) }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-black text-neutral-950">Status Request</h2>
            <p class="mt-1 text-sm text-neutral-500">{{ pendingRequests.length }} request menunggu review</p>
          </div>
          <Clock class="h-5 w-5 text-amber-600" />
        </div>
        <div class="mt-4 space-y-3">
          <div v-if="pendingRequests.length === 0" class="rounded-xl border border-dashed border-neutral-200 p-4 text-sm text-neutral-500">
            Tidak ada request pending.
          </div>
          <article v-for="request in pendingRequests.slice(0, 3)" :key="request.id" class="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <p class="text-sm font-black text-neutral-900">{{ request.title }}</p>
            <p class="mt-1 text-xs text-amber-700">{{ labelFrom(billingRequestTypeLabels, request.type) }} - {{ formatPrice(request.billing_impact) }}</p>
          </article>
        </div>
      </div>
    </section>

    <SubscriptionCountdownCard />

    <section ref="packagesSection" class="scroll-mt-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-neutral-950">Pilihan paket</h2>
          <p class="text-sm text-neutral-500">Perubahan paket akan ditinjau dahulu sebelum digunakan.</p>
        </div>
      </div>
      <div v-if="loading" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div v-for="index in 4" :key="index" class="h-96 animate-pulse rounded-2xl border border-neutral-100 bg-white"></div>
      </div>
      <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="plan in visiblePlans"
          :key="plan.id"
          :class="[
            'card p-6 relative',
            highlightedPlanId === plan.id ? 'ring-2 ring-amber-400' : plan.id === 'growth' ? 'ring-2 ring-primary-500' : '',
            isActive(plan.id) ? 'bg-primary-50 border-primary-200' : ''
          ]"
        >
          <div v-if="highlightedPlanId === plan.id" class="absolute -top-3 right-4 rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white">
            Dipilih
          </div>
          <div v-if="plan.id === 'growth'" class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-3 py-1 text-xs font-medium text-white">
            Promo
          </div>
          <div v-if="isActive(plan.id)" class="absolute top-4 right-4">
            <Check class="h-5 w-5 text-primary-600" />
          </div>

          <div :class="['mb-4 flex h-12 w-12 items-center justify-center rounded-xl', isActive(plan.id) ? 'bg-primary-200' : 'bg-neutral-100']">
            <component :is="plan.id === 'free' ? Sparkles : plan.id === 'custom' ? Crown : PackagePlus" :class="['h-6 w-6', isActive(plan.id) ? 'text-primary-700' : 'text-neutral-600']" />
          </div>

          <h3 class="text-lg font-semibold text-neutral-900">{{ plan.name }}</h3>
          <div class="mb-4 mt-2">
            <div v-if="hasPromo(plan)" class="text-sm font-medium text-neutral-400 line-through">
              {{ formatPrice(plan.marketPrice || 0) }}
            </div>
            <span class="text-3xl font-bold text-neutral-900">{{ formatPrice(plan.price) }}</span>
            <span v-if="plan.period" class="text-neutral-500">/{{ plan.period }}</span>
            <p v-if="hasPromo(plan)" class="mt-1 text-xs font-black text-amber-700">
              Harga pasar, hemat {{ plan.discountPercent ?? 0 }}%
            </p>
          </div>
          <p class="mb-6 text-sm text-neutral-600">{{ plan.description }}</p>

          <div class="mb-6 grid grid-cols-3 gap-2 text-center text-xs">
            <div class="rounded-lg bg-neutral-50 p-2">
              <p class="font-bold text-neutral-900">{{ limitLabel(plan.warehouses) }}</p>
              <p class="text-neutral-500">Gudang</p>
            </div>
            <div class="rounded-lg bg-neutral-50 p-2">
              <p class="font-bold text-neutral-900">{{ limitLabel(plan.products) }}</p>
              <p class="text-neutral-500">Produk</p>
            </div>
            <div class="rounded-lg bg-neutral-50 p-2">
              <p class="font-bold text-neutral-900">{{ limitLabel(plan.users) }}</p>
              <p class="text-neutral-500">User</p>
            </div>
          </div>

          <ul class="mb-6 space-y-3">
            <li v-for="feature in Object.entries(plan.features).filter(([_, v]) => v)" :key="feature[0]" class="flex items-start gap-2 text-sm">
              <Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-success-600" />
              <span class="text-neutral-700">{{ featureNames[feature[0]] || feature[0] }}</span>
            </li>
          </ul>

          <button v-if="isActive(plan.id)" class="btn-secondary w-full" disabled>
            Paket Aktif
          </button>
          <button v-else-if="plan.id === 'free'" class="btn-secondary w-full" disabled>
            Paket Dasar
          </button>
          <button v-else-if="pendingPlanRequest(plan.id)" class="btn-secondary w-full" disabled>
            Menunggu Review
          </button>
          <button v-else class="btn-primary w-full" :disabled="savingId === `plan:${plan.id}`" @click="submitPlanRequest(plan.id)">
            <Send class="h-4 w-4" />
            Ajukan
          </button>
        </div>
      </div>
    </section>

    <section ref="addonsSection" class="scroll-mt-6 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm lg:p-6">
      <div class="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div>
          <h2 class="text-xl font-black text-neutral-950">Tambah kapasitas & fitur</h2>
          <p class="mt-1 text-sm text-neutral-500">Add-on aktif setelah tim StockPilot menyetujui pengajuan.</p>
        </div>
        <PackagePlus class="h-5 w-5 text-primary-700" />
      </div>
      <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article v-for="addon in addons" :key="addon.id" :class="['rounded-xl border bg-[#fbfdff] p-4', highlightedAddonId === addon.id ? 'border-amber-300 ring-2 ring-amber-200' : 'border-neutral-100']">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-black text-neutral-950">{{ addon.name }}</h3>
              <p class="mt-1 text-sm leading-5 text-neutral-500">{{ addon.description || 'Add-on operasional untuk kapasitas atau fitur tambahan.' }}</p>
            </div>
            <span class="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-black text-neutral-700">{{ addon.limit_key || addon.feature_key || 'addon' }}</span>
          </div>
          <div class="mt-4 flex items-end justify-between gap-3">
            <div>
              <p class="text-2xl font-black text-neutral-950">{{ formatPrice(selectedCycle === 'yearly' ? (addon.yearly_price ?? addon.monthly_price * 12) : addon.monthly_price) }}</p>
              <p class="text-xs text-neutral-500">/{{ selectedCycle === 'yearly' ? 'tahun' : 'bulan' }}</p>
            </div>
            <button v-if="pendingAddonRequest(addon.id)" class="btn-secondary" disabled>Menunggu</button>
            <button v-else class="btn-primary" :disabled="savingId === `addon:${addon.id}`" @click="submitAddonRequest(addon)">
              Ajukan
            </button>
          </div>
        </article>
        <div v-if="addons.length === 0" class="rounded-xl border border-dashed border-neutral-200 p-6 text-sm text-neutral-500">
          Add-on belum tersedia.
        </div>
      </div>
      <div v-if="activeAddons.length > 0" class="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
        <p class="text-sm font-black text-emerald-900">Add-on aktif</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span v-for="addon in activeAddons" :key="addon.code" class="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800">
            {{ addon.name }} x{{ addon.quantity }}
          </span>
        </div>
      </div>
    </section>

    <section class="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <div class="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm lg:p-6">
        <h2 class="text-xl font-black text-neutral-950">Ajukan kebutuhan khusus</h2>
        <p class="mt-1 text-sm text-neutral-500">Ceritakan kebutuhan operasional agar tim bisa menilai solusi yang paling aman.</p>
        <div class="mt-5 space-y-3">
          <input v-model="customDraft.title" class="input" placeholder="Judul request" />
          <textarea v-model="customDraft.notes" class="input min-h-32" placeholder="Kebutuhan operasional, integrasi, atau laporan khusus"></textarea>
          <button class="btn-primary w-full" :disabled="savingId === 'custom' || !customDraft.title.trim()" @click="submitCustomRequest">
            <Send class="h-4 w-4" />
            Kirim Pengajuan
          </button>
        </div>
      </div>

      <div class="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm lg:p-6">
        <div class="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div>
            <h2 class="text-xl font-black text-neutral-950">Riwayat pengajuan</h2>
            <p class="mt-1 text-sm text-neutral-500">Status perubahan paket, add-on, dan kebutuhan khusus.</p>
          </div>
          <button class="text-sm font-black text-primary-700" @click="loadRequests">Refresh</button>
        </div>
        <div class="mt-4 space-y-3">
          <article v-for="request in requests" :key="request.id" class="rounded-xl border border-neutral-100 bg-[#fbfdff] p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="font-black text-neutral-950">{{ request.title }}</p>
                <p class="mt-1 text-sm text-neutral-500">{{ labelFrom(billingRequestTypeLabels, request.type) }} - {{ formatPrice(request.billing_impact) }}</p>
                <p v-if="request.admin_notes || request.rejection_reason" class="mt-2 text-sm text-neutral-600">
                  {{ request.admin_notes || request.rejection_reason }}
                </p>
              </div>
              <span :class="['inline-flex rounded-full border px-3 py-1 text-xs font-black', statusTone(request.status)]">
                {{ labelFrom(billingRequestStatusLabels, request.status) }}
              </span>
            </div>
            <p class="mt-3 text-xs text-neutral-400">Dibuat {{ formatDate(request.created_at) }}</p>
          </article>
          <div v-if="requests.length === 0" class="rounded-xl border border-dashed border-neutral-200 p-6 text-sm text-neutral-500">
            Belum ada request.
          </div>
        </div>
      </div>
    </section>

    <section class="card overflow-hidden">
      <div class="border-b border-neutral-100 p-4">
        <h2 class="font-semibold text-neutral-900">Perbandingan Fitur</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-neutral-100">
              <th class="table-header text-left">Fitur</th>
              <th v-for="plan in visiblePlans" :key="plan.id" class="table-header text-center">{{ plan.name }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr v-for="feature in featureColumns" :key="feature" class="hover:bg-neutral-50">
              <td class="table-cell font-medium">{{ featureNames[feature] }}</td>
              <td v-for="plan in visiblePlans" :key="plan.id" class="table-cell text-center">
                <div v-if="getFeatureValue(plan, feature)" class="flex justify-center">
                  <Check class="h-5 w-5 text-success-600" />
                </div>
                <span v-else class="text-neutral-300">x</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="shouldShowTrialCta" class="card border-primary-200 bg-primary-50 p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div class="flex-1">
          <h3 class="flex items-center gap-2 font-semibold text-primary-900">
            <Clock class="h-5 w-5" />
            Belum yakin dengan paket?
          </h3>
          <p class="mt-1 text-sm text-primary-700">
            Trial akan disiapkan tim StockPilot sesuai kebutuhan operasional.
          </p>
        </div>
        <button class="btn-primary" @click="goToTrial">
            Ajukan Trial
        </button>
      </div>
    </section>
  </div>
</template>
