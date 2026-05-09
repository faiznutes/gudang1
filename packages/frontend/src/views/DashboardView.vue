<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useActivityStore } from '@/stores/activity'
import { useAuthStore } from '@/stores/auth'
import { useEntitlementsStore } from '@/stores/entitlements'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Package,
  Plus,
  SearchCheck,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
  Warehouse,
  X,
} from 'lucide-vue-next'

const router = useRouter()
const inventoryStore = useInventoryStore()
const activityStore = useActivityStore()
const authStore = useAuthStore()
const entitlementsStore = useEntitlementsStore()

const showOnboarding = ref(true)

const products = computed(() => inventoryStore.productsWithInventory)
const totalProducts = computed(() => inventoryStore.totalProducts)
const totalWarehouses = computed(() => inventoryStore.totalWarehouses)
const totalStock = computed(() => inventoryStore.inventory.reduce((sum, item) => sum + item.quantity, 0))
const activeProducts = computed(() => products.value.filter(product => product.total_quantity > 0).length)
const outOfStockProducts = computed(() => products.value.filter(product => product.total_quantity <= 0))
const lowStockProducts = computed(() => inventoryStore.getLowStockProducts())
const recentActivities = computed(() => activityStore.recentActivities.slice(0, 6))

const activity7d = computed(() => {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000
  return activityStore.activities.filter(item => new Date(item.created_at).getTime() >= since)
})

const stockIn7d = computed(() => activity7d.value.filter(item => item.type === 'in').reduce((sum, item) => sum + item.quantity, 0))
const stockOut7d = computed(() => activity7d.value.filter(item => item.type === 'out').reduce((sum, item) => sum + item.quantity, 0))
const transfer7d = computed(() => activity7d.value.filter(item => item.type === 'transfer').length)

const bestSellingProducts = computed(() => {
  const totals = new Map<string, { name: string; quantity: number }>()
  activityStore.activities
    .filter(item => item.type === 'out')
    .forEach(item => {
      const current = totals.get(item.product_id) ?? { name: item.product_name, quantity: 0 }
      current.quantity += item.quantity
      totals.set(item.product_id, current)
    })

  return Array.from(totals.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 4)
})

const slowMovingProducts = computed(() => {
  const activeProductIds = new Set(
    activityStore.activities
      .filter(item => Date.now() - new Date(item.created_at).getTime() <= 30 * 24 * 60 * 60 * 1000)
      .map(item => item.product_id)
  )

  return products.value
    .filter(product => product.total_quantity > 0 && !activeProductIds.has(product.id))
    .slice(0, 4)
})

const topWarehouses = computed(() => {
  const totals = new Map<string, { name: string; movements: number; quantity: number }>()
  activity7d.value.forEach(item => {
    const current = totals.get(item.warehouse_id) ?? { name: item.warehouse_name, movements: 0, quantity: 0 }
    current.movements += 1
    current.quantity += item.quantity
    totals.set(item.warehouse_id, current)
  })

  return Array.from(totals.values()).sort((a, b) => b.movements - a.movements).slice(0, 4)
})

const productSummary = computed(() => [
  {
    label: 'Total produk',
    value: formatNumber(totalProducts.value),
    caption: 'SKU yang sudah dibuat',
    icon: Package,
    tone: 'bg-primary-50 text-primary-700',
  },
  {
    label: 'Produk aktif',
    value: formatNumber(activeProducts.value),
    caption: 'Masih punya stok',
    icon: CheckCircle2,
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    label: 'Stok kosong',
    value: formatNumber(outOfStockProducts.value.length),
    caption: 'Perlu dicek atau restok',
    icon: Store,
    tone: outOfStockProducts.value.length > 0 ? 'bg-rose-50 text-rose-700' : 'bg-neutral-100 text-neutral-600',
  },
  {
    label: 'Stok menipis',
    value: formatNumber(lowStockProducts.value.length),
    caption: 'Di bawah batas minimum',
    icon: AlertTriangle,
    tone: lowStockProducts.value.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-600',
  },
])

const warehouseSummary = computed(() => [
  {
    label: 'Gudang',
    value: formatNumber(totalWarehouses.value),
    caption: 'Lokasi penyimpanan',
    icon: Warehouse,
    tone: 'bg-sky-50 text-sky-700',
  },
  {
    label: 'Total stok',
    value: formatNumber(totalStock.value),
    caption: `${formatNumber(transfer7d.value)} transfer dalam 7 hari`,
    icon: ClipboardCheck,
    tone: 'bg-indigo-50 text-indigo-700',
  },
  {
    label: 'Masuk 7 hari',
    value: formatNumber(stockIn7d.value),
    caption: 'Unit diterima',
    icon: ArrowDownToLine,
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    label: 'Keluar 7 hari',
    value: formatNumber(stockOut7d.value),
    caption: 'Unit keluar',
    icon: ArrowUpFromLine,
    tone: 'bg-rose-50 text-rose-700',
  },
])

const criticalAlerts = computed(() => {
  const alerts = []

  if (lowStockProducts.value.length > 0) {
    alerts.push({
      title: 'Stok menipis',
      message: `${lowStockProducts.value.length} produk perlu restok atau pengecekan minimum stok.`,
      path: '/app/inventory?filter=low-stock',
      icon: AlertTriangle,
      tone: 'border-amber-100 bg-amber-50 text-amber-900',
    })
  }

  if (outOfStockProducts.value.length > 0) {
    alerts.push({
      title: 'Stok kosong',
      message: `${outOfStockProducts.value.length} produk belum punya stok tersedia.`,
      path: '/app/inventory?filter=out-of-stock',
      icon: Store,
      tone: 'border-rose-100 bg-rose-50 text-rose-900',
    })
  }

  if (totalWarehouses.value === 0) {
    alerts.push({
      title: 'Gudang belum dibuat',
      message: 'Buat gudang pertama sebelum mulai mencatat stok.',
      path: '/app/warehouses/new',
      icon: Warehouse,
      tone: 'border-primary-100 bg-primary-50 text-primary-900',
    })
  }

  if (activity7d.value.length === 0 && totalProducts.value > 0) {
    alerts.push({
      title: 'Belum ada aktivitas minggu ini',
      message: 'Catat stok masuk atau keluar agar laporan tetap akurat.',
      path: entitlementsStore.entitlements.features.stockInOut ? '/app/stock-in' : '/app/activity',
      icon: ClipboardCheck,
      tone: 'border-neutral-100 bg-neutral-50 text-neutral-900',
    })
  }

  return alerts
})

const onboardingSteps = computed(() => [
  {
    title: 'Buat gudang pertama',
    caption: 'Tempat penyimpanan utama untuk stok.',
    done: totalWarehouses.value > 0,
    path: '/app/warehouses/new',
  },
  {
    title: 'Tambah produk pertama',
    caption: 'Isi nama, SKU, harga, dan stok minimum.',
    done: totalProducts.value > 0,
    path: '/app/inventory/new',
  },
  {
    title: 'Catat stok masuk',
    caption: 'Mulai dari penerimaan barang awal.',
    done: activityStore.totalStockIn > 0,
    path: '/app/stock-in',
    locked: !entitlementsStore.entitlements.features.stockInOut,
  },
  {
    title: 'Cek laporan stok',
    caption: 'Pantau produk menipis dan pergerakan gudang.',
    done: activityStore.activities.length > 0,
    path: '/app/analytics',
    locked: !entitlementsStore.entitlements.features.analytics,
  },
])

const shouldShowOnboarding = computed(() => showOnboarding.value && onboardingSteps.value.some(step => !step.done))

const quickActions = computed(() => [
  {
    label: 'Tambah produk',
    caption: 'Buat item baru',
    path: '/app/inventory/new',
    icon: Plus,
    disabled: authStore.isActivitySessionExpired,
  },
  {
    label: 'Stok masuk',
    caption: 'Catat barang diterima',
    path: '/app/stock-in',
    icon: ArrowDownToLine,
    disabled: authStore.isActivitySessionExpired || !entitlementsStore.entitlements.features.stockInOut,
  },
  {
    label: 'Stok keluar',
    caption: 'Catat pemakaian barang',
    path: '/app/stock-out',
    icon: ArrowUpFromLine,
    disabled: authStore.isActivitySessionExpired || !entitlementsStore.entitlements.features.stockInOut,
  },
  {
    label: 'Tambah gudang',
    caption: 'Buat lokasi stok',
    path: '/app/warehouses/new',
    icon: Warehouse,
    disabled: authStore.isActivitySessionExpired,
  },
  {
    label: 'Tambah supplier',
    caption: 'Simpan kontak pemasok',
    path: '/app/suppliers/new',
    icon: Users,
    disabled: authStore.isActivitySessionExpired,
  },
  {
    label: 'Lihat laporan',
    caption: 'Pantau tren stok',
    path: '/app/analytics',
    icon: BarChart3,
    disabled: !entitlementsStore.entitlements.features.analytics,
  },
])

function dismissOnboarding() {
  showOnboarding.value = false
}

function navigateTo(path: string, disabled = false) {
  if (disabled) return
  router.push(path)
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
</script>

<template>
  <div class="min-h-screen bg-neutral-50 p-4 lg:p-8">
    <div class="mx-auto max-w-7xl space-y-6">
      <section class="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm lg:p-7">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div class="max-w-3xl">
            <p class="text-sm font-semibold text-primary-700">{{ authStore.workspace?.name || 'Workspace' }}</p>
            <h2 class="mt-2 text-2xl font-bold tracking-tight text-neutral-950 lg:text-3xl">
              Ringkasan operasional hari ini
            </h2>
            <p class="mt-2 text-sm leading-6 text-neutral-600 lg:text-base">
              Pantau produk, stok, gudang, dan aktivitas terakhir dari satu tempat.
            </p>
          </div>
          <div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              v-for="action in quickActions.slice(0, 3)"
              :key="action.label"
              :disabled="action.disabled"
              :class="[
                'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition',
                action.disabled
                  ? 'cursor-not-allowed bg-neutral-100 text-neutral-400'
                  : action.label === 'Tambah produk'
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50'
              ]"
              @click="navigateTo(action.path, action.disabled)"
            >
              <component :is="action.icon" class="h-4 w-4" />
              <span>{{ action.label }}</span>
            </button>
          </div>
        </div>
      </section>

      <transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <section v-if="shouldShowOnboarding" class="rounded-2xl border border-primary-100 bg-primary-50 p-5 lg:p-6">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <h3 class="text-lg font-bold text-primary-950">Mulai dari langkah paling penting</h3>
              <p class="mt-1 text-sm leading-6 text-primary-800">
                Lengkapi dasar operasional agar tim bisa langsung mencatat stok dengan rapi.
              </p>
              <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <button
                  v-for="step in onboardingSteps"
                  :key="step.title"
                  :disabled="step.done || step.locked"
                  :class="[
                    'rounded-xl border p-4 text-left transition',
                    step.done
                      ? 'border-emerald-100 bg-white text-emerald-800'
                      : step.locked
                        ? 'cursor-not-allowed border-primary-100 bg-white/70 text-neutral-400'
                        : 'border-primary-100 bg-white text-neutral-800 hover:-translate-y-0.5 hover:shadow-soft'
                  ]"
                  @click="navigateTo(step.path, step.done || step.locked)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-bold">{{ step.title }}</p>
                      <p class="mt-1 text-xs leading-5 opacity-80">{{ step.caption }}</p>
                    </div>
                    <CheckCircle2 v-if="step.done" class="h-5 w-5 flex-shrink-0" />
                    <ArrowRight v-else class="h-5 w-5 flex-shrink-0" />
                  </div>
                </button>
              </div>
            </div>
            <button class="rounded-xl p-2 text-primary-700 transition hover:bg-primary-100" aria-label="Tutup panduan awal" @click="dismissOnboarding">
              <X class="h-5 w-5" />
            </button>
          </div>
        </section>
      </transition>

      <section>
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-base font-bold text-neutral-950">Produk</h3>
          <router-link to="/app/inventory" class="text-sm font-bold text-primary-700 hover:text-primary-900">
            Lihat semua
          </router-link>
        </div>
        <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <article v-for="card in productSummary" :key="card.label" class="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm lg:p-5">
            <div :class="['flex h-11 w-11 items-center justify-center rounded-xl', card.tone]">
              <component :is="card.icon" class="h-5 w-5" />
            </div>
            <p class="mt-4 text-2xl font-bold text-neutral-950">{{ card.value }}</p>
            <p class="mt-1 text-sm font-semibold text-neutral-800">{{ card.label }}</p>
            <p class="mt-1 text-xs leading-5 text-neutral-500">{{ card.caption }}</p>
          </article>
        </div>
      </section>

      <section>
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-base font-bold text-neutral-950">Gudang dan stok</h3>
          <router-link to="/app/stock-movement" class="text-sm font-bold text-primary-700 hover:text-primary-900">
            Riwayat stok
          </router-link>
        </div>
        <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <article v-for="card in warehouseSummary" :key="card.label" class="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm lg:p-5">
            <div :class="['flex h-11 w-11 items-center justify-center rounded-xl', card.tone]">
              <component :is="card.icon" class="h-5 w-5" />
            </div>
            <p class="mt-4 text-2xl font-bold text-neutral-950">{{ card.value }}</p>
            <p class="mt-1 text-sm font-semibold text-neutral-800">{{ card.label }}</p>
            <p class="mt-1 text-xs leading-5 text-neutral-500">{{ card.caption }}</p>
          </article>
        </div>
      </section>

      <div class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section class="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm lg:p-6">
          <div class="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h3 class="text-lg font-bold text-neutral-950">Perlu perhatian</h3>
              <p class="mt-1 text-sm text-neutral-500">Masalah stok dan setup yang perlu dicek dulu.</p>
            </div>
            <SearchCheck class="h-5 w-5 text-neutral-500" />
          </div>

          <div v-if="criticalAlerts.length === 0" class="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-5">
            <p class="font-bold text-emerald-900">Tidak ada alert penting.</p>
            <p class="mt-1 text-sm text-emerald-800">Stok dan setup utama terlihat aman.</p>
          </div>

          <div v-else class="mt-5 space-y-3">
            <button
              v-for="alert in criticalAlerts"
              :key="alert.title"
              :class="['w-full rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft', alert.tone]"
              @click="navigateTo(alert.path)"
            >
              <div class="flex items-start gap-3">
                <component :is="alert.icon" class="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div class="min-w-0 flex-1">
                  <p class="font-bold">{{ alert.title }}</p>
                  <p class="mt-1 text-sm leading-5 opacity-80">{{ alert.message }}</p>
                </div>
                <ArrowRight class="mt-0.5 h-5 w-5 flex-shrink-0" />
              </div>
            </button>
          </div>
        </section>

        <section class="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm lg:p-6">
          <div class="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h3 class="text-lg font-bold text-neutral-950">Aktivitas terbaru</h3>
              <p class="mt-1 text-sm text-neutral-500">Mutasi stok dan pekerjaan tim terakhir.</p>
            </div>
            <router-link to="/app/activity" class="text-sm font-bold text-primary-700 hover:text-primary-900">
              Lihat semua
            </router-link>
          </div>

          <div v-if="recentActivities.length === 0" class="mt-5 rounded-xl border border-dashed border-neutral-200 p-8 text-center">
            <ClipboardCheck class="mx-auto h-12 w-12 text-neutral-300" />
            <p class="mt-3 font-bold text-neutral-800">Belum ada aktivitas stok.</p>
            <p class="mt-1 text-sm text-neutral-500">Mulai dari stok masuk setelah produk dan gudang dibuat.</p>
          </div>

          <div v-else class="mt-2 divide-y divide-neutral-100">
            <div v-for="activity in recentActivities" :key="activity.id" class="flex items-center gap-4 py-4">
              <div
                :class="[
                  'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl',
                  activity.type === 'in' ? 'bg-emerald-50' : activity.type === 'out' ? 'bg-rose-50' : 'bg-primary-50'
                ]"
              >
                <TrendingUp v-if="activity.type === 'in'" class="h-5 w-5 text-emerald-700" />
                <TrendingDown v-else-if="activity.type === 'out'" class="h-5 w-5 text-rose-700" />
                <Package v-else class="h-5 w-5 text-primary-700" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold text-neutral-950">{{ activity.product_name }}</p>
                <p class="truncate text-xs text-neutral-500">
                  {{ activity.type === 'in' ? 'Masuk' : activity.type === 'out' ? 'Keluar' : 'Transfer' }}
                  {{ activity.type === 'transfer' ? `ke ${activity.to_warehouse_name}` : '' }}
                  - {{ activity.warehouse_name }}
                </p>
              </div>
              <div class="text-right">
                <p
                  :class="[
                    'text-sm font-bold',
                    activity.type === 'in' ? 'text-emerald-700' : activity.type === 'out' ? 'text-rose-700' : 'text-primary-700'
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

      <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section class="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm lg:p-6">
          <div class="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h3 class="text-lg font-bold text-neutral-950">Aksi harian</h3>
              <p class="mt-1 text-sm text-neutral-500">Shortcut pekerjaan yang paling sering dipakai.</p>
            </div>
          </div>
          <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <button
              v-for="action in quickActions"
              :key="action.label"
              :disabled="action.disabled"
              :class="[
                'rounded-xl border p-4 text-left transition',
                action.disabled
                  ? 'cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-400'
                  : 'border-neutral-100 bg-white hover:-translate-y-0.5 hover:border-primary-100 hover:shadow-soft'
              ]"
              @click="navigateTo(action.path, action.disabled)"
            >
              <div class="flex items-start justify-between gap-3">
                <component :is="action.icon" :class="['h-5 w-5', action.disabled ? 'text-neutral-400' : 'text-primary-700']" />
                <ArrowRight v-if="!action.disabled" class="h-4 w-4 text-neutral-400" />
              </div>
              <p class="mt-4 text-sm font-bold text-neutral-950">{{ action.label }}</p>
              <p class="mt-1 text-xs leading-5 text-neutral-500">{{ action.caption }}</p>
            </button>
          </div>
        </section>

        <section class="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm lg:p-6">
          <div class="border-b border-neutral-100 pb-4">
            <h3 class="text-lg font-bold text-neutral-950">Insight stok</h3>
            <p class="mt-1 text-sm text-neutral-500">Bantu putuskan produk mana yang perlu ditindaklanjuti.</p>
          </div>

          <div class="mt-5 space-y-5">
            <div>
              <div class="mb-3 flex items-center justify-between">
                <p class="text-sm font-bold text-neutral-800">Produk paling sering keluar</p>
                <span class="text-xs text-neutral-500">Top 4</span>
              </div>
              <div v-if="bestSellingProducts.length === 0" class="rounded-xl border border-dashed border-neutral-200 p-4 text-sm text-neutral-500">
                Belum ada stok keluar.
              </div>
              <div v-else class="space-y-2">
                <div v-for="product in bestSellingProducts" :key="product.name" class="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2">
                  <span class="truncate text-sm font-semibold text-neutral-800">{{ product.name }}</span>
                  <span class="text-sm font-bold text-rose-700">{{ formatNumber(product.quantity) }}</span>
                </div>
              </div>
            </div>

            <div>
              <div class="mb-3 flex items-center justify-between">
                <p class="text-sm font-bold text-neutral-800">Stok jarang bergerak</p>
                <span class="text-xs text-neutral-500">30 hari</span>
              </div>
              <div v-if="slowMovingProducts.length === 0" class="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                Tidak ada stok diam yang perlu perhatian.
              </div>
              <div v-else class="space-y-2">
                <router-link
                  v-for="product in slowMovingProducts"
                  :key="product.id"
                  :to="`/app/inventory/${product.id}`"
                  class="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 transition hover:bg-neutral-100"
                >
                  <span class="truncate text-sm font-semibold text-neutral-800">{{ product.name }}</span>
                  <span class="text-sm font-bold text-neutral-700">{{ formatNumber(product.total_quantity) }}</span>
                </router-link>
              </div>
            </div>

            <div>
              <div class="mb-3 flex items-center justify-between">
                <p class="text-sm font-bold text-neutral-800">Gudang paling aktif</p>
                <span class="text-xs text-neutral-500">7 hari</span>
              </div>
              <div v-if="topWarehouses.length === 0" class="rounded-xl border border-dashed border-neutral-200 p-4 text-sm text-neutral-500">
                Aktivitas gudang belum tersedia.
              </div>
              <div v-else class="space-y-2">
                <div v-for="warehouse in topWarehouses" :key="warehouse.name" class="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2">
                  <span class="truncate text-sm font-semibold text-neutral-800">{{ warehouse.name }}</span>
                  <span class="text-sm font-bold text-primary-700">{{ warehouse.movements }} aktivitas</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
