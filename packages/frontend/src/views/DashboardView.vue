<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useActivityStore } from '@/stores/activity'
import { useAuthStore } from '@/stores/auth'
import { useEntitlementsStore } from '@/stores/entitlements'
import type { EntitlementResponse } from '@/services/api/auth'
import SubscriptionCountdownCard from '@/components/SubscriptionCountdownCard.vue'
import { labelFrom, planLabels, subscriptionStatusLabels } from '@/lib/labels'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lock,
  Package,
  Plus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Warehouse,
  X,
} from 'lucide-vue-next'

type FeatureKey = keyof EntitlementResponse['features']

const router = useRouter()
const inventoryStore = useInventoryStore()
const activityStore = useActivityStore()
const authStore = useAuthStore()
const entitlementsStore = useEntitlementsStore()

const showOnboarding = ref(true)

const entitlements = computed(() => entitlementsStore.entitlements)
const totalProducts = computed(() => inventoryStore.totalProducts)
const totalWarehouses = computed(() => inventoryStore.totalWarehouses)
const lowStockProducts = computed(() => inventoryStore.getLowStockProducts())
const lowStockCount = computed(() => lowStockProducts.value.length)
const recentActivities = computed(() => activityStore.recentActivities.slice(0, 5))
const activity7d = computed(() => {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000
  return activityStore.activities.filter(item => new Date(item.created_at).getTime() >= since).length
})

const totalStock = computed(() => {
  return inventoryStore.inventory.reduce((sum, item) => sum + item.quantity, 0)
})

const planName = computed(() => labelFrom(planLabels, entitlements.value.plan))
const subscriptionStatus = computed(() => {
  if (entitlements.value.subscriptionStatus === 'none') return 'Belum aktif'
  return labelFrom(subscriptionStatusLabels, entitlements.value.subscriptionStatus)
})

const featureDefinitions: Array<{ key: FeatureKey; label: string; description: string }> = [
  { key: 'stockInOut', label: 'Stok masuk/keluar', description: 'Operasional gudang harian' },
  { key: 'multiWarehouse', label: 'Multi-gudang', description: 'Cabang dan lokasi terpisah' },
  { key: 'analytics', label: 'Analitik', description: 'Ringkasan performa stok' },
  { key: 'exportPDF', label: 'Export laporan', description: 'Dokumentasi untuk audit' },
  { key: 'batchImport', label: 'Import massal', description: 'Setup data lebih cepat' },
  { key: 'reports', label: 'Reporting', description: 'Pantauan manajemen' },
]

const featureChips = computed(() => {
  return featureDefinitions.map(feature => ({
    ...feature,
    enabled: entitlements.value.features[feature.key],
  }))
})

const activeFeatureCount = computed(() => featureChips.value.filter(feature => feature.enabled).length)

const usageItems = computed(() => [
  {
    label: 'Produk',
    used: Math.max(entitlements.value.usage.products, totalProducts.value),
    limit: entitlements.value.limits.products,
  },
  {
    label: 'Gudang',
    used: Math.max(entitlements.value.usage.warehouses, totalWarehouses.value),
    limit: entitlements.value.limits.warehouses,
  },
  {
    label: 'User',
    used: entitlements.value.usage.users,
    limit: entitlements.value.limits.users,
  },
])

const onboardingSteps = computed(() => [
  { id: 1, label: 'Gudang utama dibuat', done: totalWarehouses.value > 0 },
  { id: 2, label: 'Produk pertama aktif', done: totalProducts.value > 0 },
  { id: 3, label: 'Stok masuk dicatat', done: activityStore.totalStockIn > 0 },
  { id: 4, label: 'Laporan mulai terbaca', done: recentActivities.value.length > 0 },
])

const shouldShowOnboarding = computed(() => {
  return showOnboarding.value && onboardingSteps.value.some(step => !step.done)
})

const operationCards = computed(() => [
  {
    label: 'Produk aktif',
    value: formatNumber(totalProducts.value),
    caption: `${formatNumber(totalStock.value)} total stok tercatat`,
    icon: Package,
    tone: 'bg-primary-50 text-primary-700',
  },
  {
    label: 'Gudang',
    value: formatNumber(totalWarehouses.value),
    caption: 'Lokasi penyimpanan tenant',
    icon: Warehouse,
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    label: 'Stok menipis',
    value: formatNumber(lowStockCount.value),
    caption: 'Perlu follow-up pengadaan',
    icon: AlertTriangle,
    tone: lowStockCount.value > 0 ? 'bg-rose-50 text-rose-700' : 'bg-neutral-100 text-neutral-600',
  },
  {
    label: 'Mutasi 7 hari',
    value: formatNumber(activity7d.value),
    caption: 'Masuk, keluar, dan transfer',
    icon: TrendingUp,
    tone: 'bg-amber-50 text-amber-700',
  },
])

const quickActions = computed(() => [
  {
    label: 'Tambah produk',
    caption: 'Buat SKU dan batas minimum stok',
    path: '/app/inventory/new',
    icon: Plus,
    disabled: authStore.isActivitySessionExpired,
  },
  {
    label: 'Stok masuk',
    caption: 'Catat penerimaan barang',
    path: '/app/stock-in',
    icon: ArrowDownToLine,
    disabled: authStore.isActivitySessionExpired || !entitlements.value.features.stockInOut,
  },
  {
    label: 'Stok keluar',
    caption: 'Catat pemakaian atau penjualan',
    path: '/app/stock-out',
    icon: ArrowUpFromLine,
    disabled: authStore.isActivitySessionExpired || !entitlements.value.features.stockInOut,
  },
  {
    label: 'Lihat laporan',
    caption: 'Pantau ringkasan operasional',
    path: '/app/analytics',
    icon: BarChart3,
    disabled: !entitlements.value.features.analytics,
  },
])

function dismissOnboarding() {
  showOnboarding.value = false
}

function openQuickAction(action: { path: string; disabled: boolean }) {
  if (action.disabled) return
  router.push(action.path)
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value)
}

function formatLimit(value: number) {
  if (value === 999 || value >= 99999) return 'Unlimited'
  return formatNumber(value)
}

function usageProgress(used: number, limit: number) {
  if (limit <= 0 || limit >= 99999) return 100
  return Math.min(100, Math.round((used / limit) * 100))
}
</script>

<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f7fafc_46%,#ffffff_100%)] p-4 lg:p-8">
    <div class="mx-auto max-w-7xl space-y-6">
      <section class="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-xl shadow-sky-900/5">
        <div class="grid gap-6 p-5 lg:grid-cols-[1.15fr_0.85fr] lg:p-7">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-primary-700">
              <ShieldCheck class="h-4 w-4" />
              Tenant workspace
            </div>
            <h2 class="mt-5 text-3xl font-black tracking-tight text-neutral-950 lg:text-4xl">
              {{ authStore.workspace?.name || 'Workspace Operasional' }}
            </h2>
            <p class="mt-3 max-w-3xl text-base leading-7 text-neutral-600">
              Kelola stok, gudang, supplier, approval kerja, dan laporan sesuai paket aktif. Semua aksi penting mengikuti permission tenant.
            </p>

            <div class="mt-6 grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-neutral-100 bg-[#fbfdff] p-4">
                <p class="text-xs font-black uppercase tracking-[0.14em] text-neutral-400">Paket aktif</p>
                <p class="mt-2 text-xl font-black text-neutral-950">{{ planName }}</p>
                <p class="mt-1 text-sm text-neutral-500">{{ subscriptionStatus }}</p>
              </div>
              <div class="rounded-2xl border border-neutral-100 bg-[#fbfdff] p-4">
                <p class="text-xs font-black uppercase tracking-[0.14em] text-neutral-400">Fitur aktif</p>
                <p class="mt-2 text-xl font-black text-neutral-950">{{ activeFeatureCount }}/{{ featureChips.length }}</p>
                <p class="mt-1 text-sm text-neutral-500">Diatur oleh paket tenant</p>
              </div>
              <div class="rounded-2xl border border-neutral-100 bg-[#fbfdff] p-4">
                <p class="text-xs font-black uppercase tracking-[0.14em] text-neutral-400">Mode akses</p>
                <p class="mt-2 text-xl font-black text-neutral-950">{{ authStore.sessionPolicy.lock_actions_after_expiry ? (authStore.activitySessionCountdown || 'Aktif') : 'Sesi penuh' }}</p>
                <p class="mt-1 text-sm text-neutral-500">{{ authStore.sessionPolicy.lock_actions_after_expiry ? (authStore.isActivitySessionExpired ? 'Mode laporan saja' : 'Aksi operasional tersedia') : 'Aksi operasional mengikuti login' }}</p>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-neutral-100 bg-[linear-gradient(135deg,#eef8ff,#ffffff)] p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-bold text-neutral-500">Permission & usage</p>
                <p class="mt-1 text-2xl font-black text-neutral-950">Kontrol paket</p>
              </div>
              <div :class="['flex h-12 w-12 items-center justify-center rounded-2xl', authStore.isActivitySessionExpired ? 'bg-danger-50 text-danger-700' : 'bg-emerald-50 text-emerald-700']">
                <Lock v-if="authStore.isActivitySessionExpired" class="h-6 w-6" />
                <CheckCircle2 v-else class="h-6 w-6" />
              </div>
            </div>

            <div class="mt-5 space-y-4">
              <div v-for="item in usageItems" :key="item.label">
                <div class="mb-2 flex items-center justify-between text-sm">
                  <span class="font-bold text-neutral-700">{{ item.label }}</span>
                  <span class="font-semibold text-neutral-500">{{ formatNumber(item.used) }} / {{ formatLimit(item.limit) }}</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div class="h-full rounded-full bg-primary-600 transition-all" :style="{ width: `${usageProgress(item.used, item.limit)}%` }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SubscriptionCountdownCard />

      <transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <section v-if="shouldShowOnboarding" class="rounded-3xl border border-primary-100 bg-primary-50/80 p-5 shadow-sm lg:p-6">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <h3 class="text-lg font-black text-primary-950">Setup awal operasional</h3>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-primary-800">
                Lengkapi struktur dasar agar stok, gudang, dan laporan tenant bisa dipakai tim dengan rapi.
              </p>
              <div class="mt-4 flex flex-wrap gap-3">
                <div
                  v-for="step in onboardingSteps"
                  :key="step.id"
                  :class="[
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold',
                    step.done ? 'bg-success-100 text-success-800' : 'border border-primary-200 bg-white text-neutral-700'
                  ]"
                >
                  <CheckCircle2 v-if="step.done" class="h-4 w-4" />
                  <span>{{ step.id }}. {{ step.label }}</span>
                </div>
              </div>
            </div>
            <button class="rounded-xl p-2 text-primary-700 transition hover:bg-primary-100" aria-label="Tutup setup awal" @click="dismissOnboarding">
              <X class="h-5 w-5" />
            </button>
          </div>
        </section>
      </transition>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article v-for="card in operationCards" :key="card.label" class="rounded-3xl border border-white bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-900/5">
          <div :class="['flex h-12 w-12 items-center justify-center rounded-2xl', card.tone]">
            <component :is="card.icon" class="h-6 w-6" />
          </div>
          <p class="mt-5 text-3xl font-black text-neutral-950">{{ card.value }}</p>
          <p class="mt-1 text-sm font-bold text-neutral-700">{{ card.label }}</p>
          <p class="mt-2 text-sm leading-5 text-neutral-500">{{ card.caption }}</p>
        </article>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section class="rounded-3xl border border-white bg-white p-5 shadow-sm lg:p-6">
          <div class="flex flex-col gap-3 border-b border-neutral-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-xl font-black text-neutral-950">Fitur aktif berdasarkan paket</h3>
              <p class="mt-1 text-sm text-neutral-500">Fitur ini mengikuti entitlement tenant dan dibatasi oleh route guard.</p>
            </div>
            <router-link to="/app/billing" class="text-sm font-black text-primary-700 transition hover:text-primary-900">
              Lihat paket
            </router-link>
          </div>
          <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article v-for="feature in featureChips" :key="feature.key" :class="['rounded-2xl border p-4', feature.enabled ? 'border-emerald-100 bg-emerald-50/70' : 'border-neutral-100 bg-neutral-50']">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-black text-neutral-950">{{ feature.label }}</p>
                  <p class="mt-1 text-xs leading-5 text-neutral-500">{{ feature.description }}</p>
                </div>
                <CheckCircle2 v-if="feature.enabled" class="h-5 w-5 text-emerald-700" />
                <Lock v-else class="h-5 w-5 text-neutral-400" />
              </div>
            </article>
          </div>
        </section>

        <section class="rounded-3xl border border-white bg-white p-5 shadow-sm lg:p-6">
          <div class="flex items-center gap-3 border-b border-neutral-100 pb-5">
            <ClipboardCheck class="h-5 w-5 text-primary-700" />
            <div>
              <h3 class="text-xl font-black text-neutral-950">Prioritas hari ini</h3>
              <p class="mt-1 text-sm text-neutral-500">Sinyal yang perlu ditindaklanjuti.</p>
            </div>
          </div>
          <div class="mt-5 space-y-3">
            <router-link :to="{ path: '/app/inventory', query: { filter: 'low-stock' } }" class="block rounded-2xl border border-warning-100 bg-warning-50 p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-black text-warning-900">Stok menipis</p>
                  <p class="mt-1 text-xs text-warning-800">{{ lowStockCount }} produk perlu dicek ulang</p>
                </div>
                <AlertTriangle class="h-5 w-5 text-warning-700" />
              </div>
            </router-link>
            <router-link to="/app/activity" class="block rounded-2xl border border-primary-100 bg-primary-50 p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-black text-primary-900">Aktivitas tim</p>
                  <p class="mt-1 text-xs text-primary-800">{{ recentActivities.length }} aktivitas terakhir tersedia</p>
                </div>
                <FileText class="h-5 w-5 text-primary-700" />
              </div>
            </router-link>
            <router-link to="/app/analytics" class="block rounded-2xl border border-neutral-100 bg-neutral-50 p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-black text-neutral-900">Laporan operasional</p>
                  <p class="mt-1 text-xs text-neutral-600">Pantau performa stok dan gudang</p>
                </div>
                <BarChart3 class="h-5 w-5 text-neutral-700" />
              </div>
            </router-link>
          </div>
        </section>
      </div>

      <div class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section class="rounded-3xl border border-white bg-white p-5 shadow-sm lg:p-6">
          <div class="flex items-center justify-between border-b border-neutral-100 pb-5">
            <div>
              <h3 class="text-xl font-black text-neutral-950">Aksi cepat</h3>
              <p class="mt-1 text-sm text-neutral-500">Aksi akan nonaktif jika paket atau sesi tidak mengizinkan.</p>
            </div>
          </div>
          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              v-for="action in quickActions"
              :key="action.label"
              :class="[
                'group rounded-2xl border p-4 text-left transition',
                action.disabled
                  ? 'cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-400'
                  : 'border-neutral-100 bg-[#fbfdff] hover:-translate-y-1 hover:border-primary-100 hover:bg-white hover:shadow-soft'
              ]"
              :disabled="action.disabled"
              @click="openQuickAction(action)"
            >
              <div class="flex items-start justify-between gap-3">
                <component :is="action.icon" :class="['h-6 w-6 transition', action.disabled ? 'text-neutral-400' : 'text-primary-700 group-hover:scale-110']" />
                <span v-if="action.disabled" class="rounded-full bg-white px-2 py-1 text-xs font-black text-neutral-500">X</span>
              </div>
              <p class="mt-4 text-sm font-black text-neutral-950">{{ action.label }}</p>
              <p class="mt-1 text-xs leading-5 text-neutral-500">{{ action.caption }}</p>
            </button>
          </div>
        </section>

        <section class="rounded-3xl border border-white bg-white p-5 shadow-sm lg:p-6">
          <div class="flex items-center justify-between border-b border-neutral-100 pb-5">
            <div>
              <h3 class="text-xl font-black text-neutral-950">Aktivitas terbaru</h3>
              <p class="mt-1 text-sm text-neutral-500">Mutasi stok dan pekerjaan tim yang baru tercatat.</p>
            </div>
            <router-link to="/app/activity" class="text-sm font-black text-primary-700 transition hover:text-primary-900">
              Lihat semua
            </router-link>
          </div>

          <div v-if="recentActivities.length === 0" class="mt-5 rounded-2xl border border-dashed border-neutral-200 p-8 text-center">
            <Package class="mx-auto h-12 w-12 text-neutral-300" />
            <p class="mt-3 font-bold text-neutral-700">Belum ada aktivitas stok.</p>
            <p class="mt-1 text-sm text-neutral-500">Catat stok masuk atau keluar agar laporan mulai terisi.</p>
          </div>

          <div v-else class="mt-5 divide-y divide-neutral-100">
            <div v-for="activity in recentActivities" :key="activity.id" class="flex items-center gap-4 py-4">
              <div
                :class="[
                  'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl',
                  activity.type === 'in' ? 'bg-success-50' : activity.type === 'out' ? 'bg-danger-50' : 'bg-primary-50'
                ]"
              >
                <TrendingUp v-if="activity.type === 'in'" class="h-5 w-5 text-success-600" />
                <TrendingDown v-else-if="activity.type === 'out'" class="h-5 w-5 text-danger-600" />
                <Package v-else class="h-5 w-5 text-primary-600" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-black text-neutral-950">{{ activity.product_name }}</p>
                <p class="truncate text-xs text-neutral-500">
                  {{ activity.type === 'in' ? 'Masuk' : activity.type === 'out' ? 'Keluar' : 'Transfer' }}
                  {{ activity.type === 'transfer' ? `ke ${activity.to_warehouse_name}` : '' }}
                  - {{ activity.warehouse_name }}
                </p>
              </div>
              <div class="text-right">
                <p
                  :class="[
                    'text-sm font-black',
                    activity.type === 'in' ? 'text-success-600' : activity.type === 'out' ? 'text-danger-600' : 'text-primary-600'
                  ]"
                >
                  {{ activity.type === 'in' ? '+' : activity.type === 'out' ? '-' : '' }}{{ activity.quantity }}
                </p>
                <p class="text-xs text-neutral-500">{{ formatDate(activity.created_at) }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
