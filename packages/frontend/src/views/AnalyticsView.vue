<script setup lang="ts">
import { computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useActivityStore } from '@/stores/activity'
import { BarChart3, TrendingUp, TrendingDown, Package, Warehouse, AlertTriangle } from 'lucide-vue-next'

const inventoryStore = useInventoryStore()
const activityStore = useActivityStore()

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
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-neutral-900">Analitik</h1>
      <p class="text-neutral-600">Insight tentang inventori dan aktivitas gudang</p>
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

    <!-- Chart Placeholder -->
    <div class="card p-6">
      <div class="flex items-center gap-2 mb-4">
        <BarChart3 class="w-5 h-5 text-neutral-500" />
        <h2 class="font-semibold text-neutral-900">Tren Aktivitas</h2>
      </div>
      <div class="h-64 bg-neutral-50 rounded-lg flex items-center justify-center">
        <p class="text-neutral-400">Grafik tren akan muncul di sini</p>
      </div>
    </div>
  </div>
</template>