<script setup lang="ts">
import { computed, ref } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useActivityStore } from '@/stores/activity'
import { BarChart3, TrendingUp, TrendingDown, Package, Warehouse, AlertTriangle } from 'lucide-vue-next'

const inventoryStore = useInventoryStore()
const activityStore = useActivityStore()
const selectedRange = ref(14)

const totalProducts = computed(() => inventoryStore.totalProducts)
const totalWarehouses = computed(() => inventoryStore.totalWarehouses)
const lowStockProducts = computed(() => inventoryStore.getLowStockProducts())

const stockInThisMonth = computed(() => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return activityStore.activities
    .filter(a => a.type === 'in' && new Date(a.created_at) >= startOfMonth)
    .reduce((sum, a) => sum + a.quantity, 0)
})

const stockOutThisMonth = computed(() => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return activityStore.activities
    .filter(a => a.type === 'out' && new Date(a.created_at) >= startOfMonth)
    .reduce((sum, a) => sum + a.quantity, 0)
})

const topProducts = computed(() => {
  const productMap = new Map<string, { name: string; total: number }>()
  
  activityStore.activities.forEach(a => {
    const existing = productMap.get(a.product_id)
    if (existing) {
      existing.total += a.type === 'in' ? a.quantity : -a.quantity
    } else {
      productMap.set(a.product_id, {
        name: a.product_name,
        total: a.type === 'in' ? a.quantity : -a.quantity
      })
    }
  })

  return Array.from(productMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
})

const productsByCategory = computed(() => {
  const categoryMap = new Map<string, number>()
  
  inventoryStore.products.forEach(p => {
    const category = inventoryStore.categories.find(c => c.id === p.category_id)
    const catName = category?.name || 'Tanpa Kategori'
    categoryMap.set(catName, (categoryMap.get(catName) || 0) + 1)
  })

  return Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count }))
})

const trendDays = computed(() => {
  const today = new Date()
  const days = []

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

    days.push({
      key: date.toISOString(),
      label: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date),
      stockIn: dayActivities.filter(activity => activity.type === 'in').reduce((sum, activity) => sum + activity.quantity, 0),
      stockOut: dayActivities.filter(activity => activity.type === 'out').reduce((sum, activity) => sum + activity.quantity, 0),
      transfer: dayActivities.filter(activity => activity.type === 'transfer').length,
    })
  }

  return days
})

const maxTrendValue = computed(() => {
  const maxValue = Math.max(...trendDays.value.flatMap(day => [day.stockIn, day.stockOut, day.transfer]))
  return maxValue > 0 ? maxValue : 1
})

function barHeight(value: number) {
  return `${Math.max(6, Math.round((value / maxTrendValue.value) * 100))}%`
}
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-900">Laporan operasional</h1>
        <p class="text-neutral-600">Pantau stok, gudang, dan pergerakan barang.</p>
      </div>
      <div class="inline-flex rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
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

    <!-- Overview Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="card p-4 lg:p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <Package class="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p class="text-sm text-neutral-500">Total Produk</p>
            <p class="text-2xl font-bold text-neutral-900">{{ totalProducts }}</p>
          </div>
        </div>
      </div>

      <div class="card p-4 lg:p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
            <TrendingUp class="w-6 h-6 text-success-600" />
          </div>
          <div>
            <p class="text-sm text-neutral-500">Masuk Bulan Ini</p>
            <p class="text-2xl font-bold text-neutral-900">{{ stockInThisMonth }}</p>
          </div>
        </div>
      </div>

      <div class="card p-4 lg:p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-danger-100 rounded-xl flex items-center justify-center">
            <TrendingDown class="w-6 h-6 text-danger-600" />
          </div>
          <div>
            <p class="text-sm text-neutral-500">Keluar Bulan Ini</p>
            <p class="text-2xl font-bold text-neutral-900">{{ stockOutThisMonth }}</p>
          </div>
        </div>
      </div>

      <div class="card p-4 lg:p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center">
            <Warehouse class="w-6 h-6 text-warning-600" />
          </div>
          <div>
            <p class="text-sm text-neutral-500">Total Gudang</p>
            <p class="text-2xl font-bold text-neutral-900">{{ totalWarehouses }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Low Stock Alert -->
    <div v-if="lowStockProducts.length > 0" class="card p-6 border-warning-300 bg-warning-50">
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 bg-warning-200 rounded-lg flex items-center justify-center flex-shrink-0">
          <AlertTriangle class="w-5 h-5 text-warning-700" />
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-warning-800">Produk Stok Menipis</h3>
          <p class="text-sm text-warning-700 mt-1">
            {{ lowStockProducts.length }} produk membutuhkan restok
          </p>
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

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Top Products -->
      <div class="card">
        <div class="p-4 border-b border-neutral-100">
          <h2 class="font-semibold text-neutral-900">Produk Teratas</h2>
        </div>
        <div class="divide-y divide-neutral-100">
          <div
            v-for="(product, index) in topProducts"
            :key="index"
            class="p-4 flex items-center gap-4"
          >
            <div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-sm font-semibold text-primary-700">
              {{ index + 1 }}
            </div>
            <div class="flex-1">
              <p class="font-medium text-neutral-900">{{ product.name }}</p>
            </div>
            <div>
              <p :class="['font-semibold', product.total >= 0 ? 'text-success-600' : 'text-danger-600']">
                {{ product.total >= 0 ? '+' : '' }}{{ product.total }}
              </p>
            </div>
          </div>
          <div v-if="topProducts.length === 0" class="p-8 text-center text-neutral-500">
            Belum ada data
          </div>
        </div>
      </div>

      <!-- Products by Category -->
      <div class="card">
        <div class="p-4 border-b border-neutral-100">
          <h2 class="font-semibold text-neutral-900">Produk per Kategori</h2>
        </div>
        <div class="p-4 space-y-4">
          <div v-for="cat in productsByCategory" :key="cat.name">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm text-neutral-700">{{ cat.name }}</span>
              <span class="text-sm font-medium text-neutral-900">{{ cat.count }}</span>
            </div>
            <div class="h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-primary-500 rounded-full transition-all duration-500"
                :style="{ width: `${(cat.count / totalProducts) * 100}%` }"
              />
            </div>
          </div>
          <div v-if="productsByCategory.length === 0" class="p-8 text-center text-neutral-500">
            Belum ada kategori
          </div>
        </div>
      </div>
    </div>

    <!-- Activity Trend -->
    <div class="card p-5 lg:p-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2">
          <BarChart3 class="w-5 h-5 text-neutral-500" />
          <div>
            <h2 class="font-semibold text-neutral-900">Tren aktivitas stok</h2>
            <p class="text-sm text-neutral-500">Masuk, keluar, dan transfer berdasarkan tanggal.</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-3 text-xs font-semibold text-neutral-600">
          <span class="inline-flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>Masuk</span>
          <span class="inline-flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full bg-rose-500"></span>Keluar</span>
          <span class="inline-flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full bg-primary-500"></span>Transfer</span>
        </div>
      </div>

      <div class="mt-6 h-72 overflow-x-auto">
        <div class="flex h-full min-w-[720px] items-end gap-3 border-b border-neutral-200 pb-8">
          <div v-for="day in trendDays" :key="day.key" class="flex h-full min-w-10 flex-1 flex-col justify-end gap-2">
            <div class="flex h-56 items-end justify-center gap-1 rounded-t-lg bg-neutral-50 px-1 pt-3">
              <div class="w-2 rounded-t-full bg-emerald-500" :style="{ height: barHeight(day.stockIn) }"></div>
              <div class="w-2 rounded-t-full bg-rose-500" :style="{ height: barHeight(day.stockOut) }"></div>
              <div class="w-2 rounded-t-full bg-primary-500" :style="{ height: barHeight(day.transfer) }"></div>
            </div>
            <p class="rotate-[-35deg] text-left text-[11px] font-medium text-neutral-500">
              {{ day.label }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="activityStore.activities.length === 0" class="mt-5 rounded-xl border border-dashed border-neutral-200 p-5 text-center">
        <p class="font-medium text-neutral-800">Belum ada aktivitas untuk dibuat laporan.</p>
        <p class="mt-1 text-sm text-neutral-500">Catat stok masuk atau keluar agar tren mulai terbaca.</p>
      </div>
    </div>
  </div>
</template>
