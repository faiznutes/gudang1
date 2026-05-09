<script setup lang="ts">
import { computed, ref } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useActivityStore } from '@/stores/activity'
import importExportService, { type ImportExportType } from '@/services/api/importExport'
import {
  AlertTriangle,
  AreaChart,
  Download,
  FileSpreadsheet,
  Package,
  TrendingDown,
  TrendingUp,
  Warehouse,
} from 'lucide-vue-next'

const inventoryStore = useInventoryStore()
const activityStore = useActivityStore()
const selectedRange = ref(14)
const exportMessage = ref('')

const chartWidth = 1000
const chartHeight = 280
const chartPadding = 32

interface TrendDay {
  key: string
  label: string
  stockIn: number
  stockOut: number
  transfer: number
  net: number
}

const totalProducts = computed(() => inventoryStore.totalProducts)
const totalWarehouses = computed(() => inventoryStore.totalWarehouses)
const lowStockProducts = computed(() => inventoryStore.getLowStockProducts())

const stockInThisMonth = computed(() => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return activityStore.activities
    .filter(activity => activity.type === 'in' && new Date(activity.created_at) >= startOfMonth)
    .reduce((sum, activity) => sum + activity.quantity, 0)
})

const stockOutThisMonth = computed(() => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return activityStore.activities
    .filter(activity => activity.type === 'out' && new Date(activity.created_at) >= startOfMonth)
    .reduce((sum, activity) => sum + activity.quantity, 0)
})

const topProducts = computed(() => {
  const productMap = new Map<string, { name: string; stockIn: number; stockOut: number; net: number; activity: number }>()

  activityStore.activities.forEach(activity => {
    const existing = productMap.get(activity.product_id) || {
      name: activity.product_name,
      stockIn: 0,
      stockOut: 0,
      net: 0,
      activity: 0,
    }

    if (activity.type === 'in') existing.stockIn += activity.quantity
    if (activity.type === 'out') existing.stockOut += activity.quantity
    existing.net = existing.stockIn - existing.stockOut
    existing.activity += activity.type === 'transfer' ? 1 : activity.quantity
    productMap.set(activity.product_id, existing)
  })

  return Array.from(productMap.values())
    .sort((a, b) => b.activity - a.activity)
    .slice(0, 5)
})

const productsByCategory = computed(() => {
  const categoryMap = new Map<string, number>()

  inventoryStore.products.forEach(product => {
    const category = inventoryStore.categories.find(item => item.id === product.category_id)
    const categoryName = category?.name || 'Tanpa Kategori'
    categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1)
  })

  return Array.from(categoryMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percent: totalProducts.value > 0 ? Math.round((count / totalProducts.value) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
})

const trendDays = computed<TrendDay[]>(() => {
  const today = new Date()
  const days: TrendDay[] = []

  for (let index = selectedRange.value - 1; index >= 0; index -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - index)
    date.setHours(0, 0, 0, 0)

    const nextDate = new Date(date)
    nextDate.setDate(date.getDate() + 1)

    const dayActivities = activityStore.activities.filter(activity => {
      const activityDate = new Date(activity.created_at)
      return activityDate >= date && activityDate < nextDate
    })

    const stockIn = dayActivities
      .filter(activity => activity.type === 'in')
      .reduce((sum, activity) => sum + activity.quantity, 0)
    const stockOut = dayActivities
      .filter(activity => activity.type === 'out')
      .reduce((sum, activity) => sum + activity.quantity, 0)
    const transfer = dayActivities.filter(activity => activity.type === 'transfer').length

    days.push({
      key: date.toISOString(),
      label: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date),
      stockIn,
      stockOut,
      transfer,
      net: stockIn - stockOut,
    })
  }

  return days
})

const movementTotals = computed(() => {
  return trendDays.value.reduce(
    (summary, day) => ({
      stockIn: summary.stockIn + day.stockIn,
      stockOut: summary.stockOut + day.stockOut,
      transfer: summary.transfer + day.transfer,
      net: summary.net + day.net,
    }),
    { stockIn: 0, stockOut: 0, transfer: 0, net: 0 }
  )
})

const maxAbsNet = computed(() => {
  const values = trendDays.value.map(day => Math.abs(day.net))
  return Math.max(1, ...values)
})

const zeroY = computed(() => pointY(0))

const netLinePath = computed(() => {
  return trendDays.value
    .map((day, index) => `${index === 0 ? 'M' : 'L'} ${pointX(index).toFixed(2)} ${pointY(day.net).toFixed(2)}`)
    .join(' ')
})

const netAreaPath = computed(() => {
  if (trendDays.value.length === 0) return ''
  const firstX = pointX(0)
  const lastX = pointX(trendDays.value.length - 1)
  return `${netLinePath.value} L ${lastX.toFixed(2)} ${zeroY.value.toFixed(2)} L ${firstX.toFixed(2)} ${zeroY.value.toFixed(2)} Z`
})

const strongestDay = computed(() => {
  return [...trendDays.value].sort((a, b) => Math.abs(b.net) - Math.abs(a.net))[0] || null
})

function pointX(index: number) {
  if (trendDays.value.length <= 1) return chartPadding
  const availableWidth = chartWidth - chartPadding * 2
  return chartPadding + (index / (trendDays.value.length - 1)) * availableWidth
}

function pointY(value: number) {
  const availableHeight = chartHeight - chartPadding * 2
  const halfHeight = availableHeight / 2
  return chartPadding + halfHeight - (value / maxAbsNet.value) * halfHeight
}

function shouldShowLabel(index: number) {
  const step = selectedRange.value >= 30 ? 5 : selectedRange.value >= 14 ? 2 : 1
  return index % step === 0 || index === trendDays.value.length - 1
}

async function exportDataset(type: ImportExportType, label: string) {
  exportMessage.value = `Menyiapkan ${label}...`
  await importExportService.exportData(type)
  exportMessage.value = `${label} diunduh sebagai CSV. PDF dan Excel native membutuhkan pipeline export server-side.`
}
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-900">Laporan operasional</h1>
        <p class="text-neutral-600">Ringkasan stok, pergerakan barang, dan data yang siap diekspor.</p>
      </div>
      <div class="inline-flex w-fit rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
        <button
          v-for="range in [7, 14, 30]"
          :key="range"
          :class="['rounded-lg px-3 py-2 text-sm font-bold', selectedRange === range ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-neutral-50']"
          @click="selectedRange = range"
        >
          {{ range }} hari
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div class="card p-4 lg:p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
            <Package class="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p class="text-sm text-neutral-500">Total produk</p>
            <p class="text-2xl font-bold text-neutral-900">{{ totalProducts }}</p>
          </div>
        </div>
      </div>

      <div class="card p-4 lg:p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-success-100">
            <TrendingUp class="h-6 w-6 text-success-600" />
          </div>
          <div>
            <p class="text-sm text-neutral-500">Masuk bulan ini</p>
            <p class="text-2xl font-bold text-neutral-900">{{ stockInThisMonth }}</p>
          </div>
        </div>
      </div>

      <div class="card p-4 lg:p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-danger-100">
            <TrendingDown class="h-6 w-6 text-danger-600" />
          </div>
          <div>
            <p class="text-sm text-neutral-500">Keluar bulan ini</p>
            <p class="text-2xl font-bold text-neutral-900">{{ stockOutThisMonth }}</p>
          </div>
        </div>
      </div>

      <div class="card p-4 lg:p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-100">
            <Warehouse class="h-6 w-6 text-warning-600" />
          </div>
          <div>
            <p class="text-sm text-neutral-500">Total gudang</p>
            <p class="text-2xl font-bold text-neutral-900">{{ totalWarehouses }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="lowStockProducts.length > 0" class="card border-warning-300 bg-warning-50 p-6">
      <div class="flex items-start gap-4">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-warning-200">
          <AlertTriangle class="h-5 w-5 text-warning-700" />
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-warning-800">Produk stok menipis</h3>
          <p class="mt-1 text-sm text-warning-700">{{ lowStockProducts.length }} produk membutuhkan restok.</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="product in lowStockProducts.slice(0, 5)"
              :key="product.id"
              class="badge badge-warning"
            >
              {{ product.name }} ({{ product.total_quantity }})
            </span>
            <span v-if="lowStockProducts.length > 5" class="text-sm text-warning-700">
              +{{ lowStockProducts.length - 5 }} lagi
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="card p-5 lg:p-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <AreaChart class="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h2 class="font-semibold text-neutral-900">Tren mutasi bersih</h2>
            <p class="text-sm text-neutral-500">Satu garis utama agar operator cepat melihat stok lebih banyak masuk atau keluar.</p>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-72">
          <div class="rounded-lg bg-emerald-50 p-2 text-emerald-800">
            <p class="font-semibold">{{ movementTotals.stockIn }}</p>
            <p>Masuk</p>
          </div>
          <div class="rounded-lg bg-rose-50 p-2 text-rose-800">
            <p class="font-semibold">{{ movementTotals.stockOut }}</p>
            <p>Keluar</p>
          </div>
          <div class="rounded-lg bg-neutral-100 p-2 text-neutral-800">
            <p class="font-semibold">{{ movementTotals.net >= 0 ? '+' : '' }}{{ movementTotals.net }}</p>
            <p>Bersih</p>
          </div>
        </div>
      </div>

      <div class="mt-6 overflow-x-auto">
        <svg
          class="min-w-[720px]"
          :viewBox="`0 0 ${chartWidth} ${chartHeight + 40}`"
          role="img"
          aria-label="Tren mutasi stok bersih"
        >
          <defs>
            <linearGradient id="netMovementGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#0f766e" stop-opacity="0.24" />
              <stop offset="100%" stop-color="#0f766e" stop-opacity="0.02" />
            </linearGradient>
          </defs>

          <line
            :x1="chartPadding"
            :x2="chartWidth - chartPadding"
            :y1="zeroY"
            :y2="zeroY"
            stroke="#d4d4d4"
            stroke-width="1.5"
          />
          <line
            :x1="chartPadding"
            :x2="chartWidth - chartPadding"
            :y1="chartPadding"
            :y2="chartPadding"
            stroke="#f5f5f5"
            stroke-width="1"
          />
          <line
            :x1="chartPadding"
            :x2="chartWidth - chartPadding"
            :y1="chartHeight - chartPadding"
            :y2="chartHeight - chartPadding"
            stroke="#f5f5f5"
            stroke-width="1"
          />

          <path v-if="netAreaPath" :d="netAreaPath" fill="url(#netMovementGradient)" />
          <path
            v-if="netLinePath"
            :d="netLinePath"
            fill="none"
            stroke="#0f766e"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <g v-for="(day, index) in trendDays" :key="day.key">
            <circle
              :cx="pointX(index)"
              :cy="pointY(day.net)"
              r="4"
              :fill="day.net < 0 ? '#e11d48' : '#0f766e'"
            />
            <text
              v-if="shouldShowLabel(index)"
              :x="pointX(index)"
              :y="chartHeight + 18"
              text-anchor="middle"
              class="fill-neutral-500 text-[22px]"
            >
              {{ day.label }}
            </text>
          </g>
        </svg>
      </div>

      <div class="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <div class="rounded-xl border border-neutral-100 p-3">
          <p class="font-semibold text-neutral-900">Hari paling aktif</p>
          <p class="mt-1 text-neutral-600">
            {{ strongestDay ? `${strongestDay.label}: ${strongestDay.net >= 0 ? '+' : ''}${strongestDay.net}` : 'Belum ada data' }}
          </p>
        </div>
        <div class="rounded-xl border border-neutral-100 p-3">
          <p class="font-semibold text-neutral-900">Transfer</p>
          <p class="mt-1 text-neutral-600">{{ movementTotals.transfer }} aktivitas transfer dalam rentang ini.</p>
        </div>
        <div class="rounded-xl border border-neutral-100 p-3">
          <p class="font-semibold text-neutral-900">Interpretasi cepat</p>
          <p class="mt-1 text-neutral-600">
            {{ movementTotals.net >= 0 ? 'Stok bersih bertambah.' : 'Stok keluar lebih besar dari stok masuk.' }}
          </p>
        </div>
      </div>

      <div v-if="activityStore.activities.length === 0" class="mt-5 rounded-xl border border-dashed border-neutral-200 p-5 text-center">
        <p class="font-medium text-neutral-800">Belum ada aktivitas untuk dibuat laporan.</p>
        <p class="mt-1 text-sm text-neutral-500">Catat stok masuk atau keluar agar tren mulai terbaca.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="card">
        <div class="border-b border-neutral-100 p-4">
          <h2 class="font-semibold text-neutral-900">Produk paling aktif</h2>
          <p class="text-sm text-neutral-500">Diurutkan dari total pergerakan stok terbesar.</p>
        </div>
        <div class="divide-y divide-neutral-100">
          <div
            v-for="(product, index) in topProducts"
            :key="index"
            class="flex items-center gap-4 p-4"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-sm font-semibold text-primary-700">
              {{ index + 1 }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium text-neutral-900">{{ product.name }}</p>
              <p class="text-xs text-neutral-500">Masuk {{ product.stockIn }} - keluar {{ product.stockOut }}</p>
            </div>
            <p :class="['font-semibold', product.net >= 0 ? 'text-success-600' : 'text-danger-600']">
              {{ product.net >= 0 ? '+' : '' }}{{ product.net }}
            </p>
          </div>
          <div v-if="topProducts.length === 0" class="p-8 text-center text-neutral-500">
            Belum ada data produk.
          </div>
        </div>
      </div>

      <div class="card">
        <div class="border-b border-neutral-100 p-4">
          <h2 class="font-semibold text-neutral-900">Produk per kategori</h2>
          <p class="text-sm text-neutral-500">Membantu membaca struktur katalog dan filter laporan.</p>
        </div>
        <div class="space-y-4 p-4">
          <div v-for="category in productsByCategory" :key="category.name">
            <div class="mb-1 flex items-center justify-between">
              <span class="text-sm text-neutral-700">{{ category.name }}</span>
              <span class="text-sm font-medium text-neutral-900">{{ category.count }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                class="h-full rounded-full bg-primary-500 transition-all duration-500"
                :style="{ width: `${category.percent}%` }"
              />
            </div>
          </div>
          <div v-if="productsByCategory.length === 0" class="p-8 text-center text-neutral-500">
            Belum ada kategori.
          </div>
        </div>
      </div>
    </div>

    <div class="card p-5 lg:p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="font-semibold text-neutral-900">Export data operasional</h2>
          <p class="mt-1 text-sm text-neutral-500">Export saat ini memakai CSV agar cepat dibuka di spreadsheet operasional.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-secondary" @click="exportDataset('products', 'Data produk')">
            <FileSpreadsheet class="h-4 w-4" />
            Produk CSV
          </button>
          <button class="btn-secondary" @click="exportDataset('inventory', 'Data stok')">
            <Download class="h-4 w-4" />
            Stok CSV
          </button>
          <button class="btn-secondary" @click="exportDataset('stock_movements', 'Riwayat mutasi')">
            <Download class="h-4 w-4" />
            Mutasi CSV
          </button>
        </div>
      </div>
      <p v-if="exportMessage" class="mt-4 rounded-lg border border-primary-100 bg-primary-50 p-3 text-sm text-primary-700">
        {{ exportMessage }}
      </p>
    </div>
  </div>
</template>
