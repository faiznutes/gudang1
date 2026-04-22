<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useActivityStore } from '@/stores/activity'
import { useAuthStore } from '@/stores/auth'
import {
  Package,
  Warehouse,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  X,
} from 'lucide-vue-next'

const inventoryStore = useInventoryStore()
const activityStore = useActivityStore()
const authStore = useAuthStore()

const showOnboarding = ref(true)

const totalProducts = computed(() => inventoryStore.totalProducts)
const lowStockCount = computed(() => inventoryStore.getLowStockProducts().length)
const recentActivities = computed(() => activityStore.recentActivities.slice(0, 5))

const onboardingSteps = ref([
  { id: 1, label: 'Buat gudang', done: false },
  { id: 2, label: 'Tambah produk', done: false },
  { id: 3, label: 'Catat stock masuk', done: false },
  { id: 4, label: 'Catat stock keluar', done: false },
])

function dismissOnboarding() {
  showOnboarding.value = false
}

function addSampleData() {
  const newProducts = [
    { sku: 'SKU-004', name: 'Tas Ransel', category_id: 'c3', min_stock: 5, price: 85000 },
    { sku: 'SKU-005', name: 'Topi Baseball', category_id: 'c3', min_stock: 10, price: 35000 },
  ]
  newProducts.forEach(p => inventoryStore.addProduct(p))

  onboardingSteps.value[1].done = true
  onboardingSteps.value[2].done = true

  showOnboarding.value = false
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
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <!-- Onboarding Banner -->
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="showOnboarding" class="bg-primary-50 border border-primary-200 rounded-xl p-4 lg:p-6">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <h3 class="font-semibold text-primary-900 mb-2">Selamat datang di StockPilot!</h3>
            <p class="text-sm text-primary-700 mb-4">
              Mulai kelola gudangmu dengan mudah. Ikuti langkah berikut:
            </p>
            <div class="flex flex-wrap gap-3">
              <div
                v-for="step in onboardingSteps"
                :key="step.id"
                :class="[
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                  step.done ? 'bg-success-100 text-success-800' : 'bg-white text-neutral-600 border border-primary-200'
                ]"
              >
                <CheckCircle2 v-if="step.done" class="w-4 h-4" />
                <span>{{ step.id }}. {{ step.label }}</span>
              </div>
            </div>
          </div>
          <button
            @click="dismissOnboarding"
            class="p-1 hover:bg-primary-100 rounded-lg text-primary-600"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="mt-4 flex flex-wrap gap-3">
          <button @click="addSampleData" class="btn-primary btn-sm">
            <Plus class="w-4 h-4" />
            Tambah Data Contoh
          </button>
          <router-link to="/app/warehouses/new" class="btn-secondary btn-sm">
            <Warehouse class="w-4 h-4" />
            Buat Gudang
          </router-link>
        </div>
      </div>
    </transition>

    <!-- Welcome -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-neutral-900">
          Halo, {{ authStore.user?.name?.split(' ')[0] || 'User' }}!
        </h2>
        <p class="text-neutral-600">Ini ringkasan aktivitas gudangmu</p>
      </div>
      <div class="flex gap-3">
        <router-link to="/app/stock-in" class="flex-1 flex items-center justify-center gap-2 py-3 lg:py-2 px-4 bg-success-50 hover:bg-success-100 text-success-700 font-medium rounded-xl transition-colors">
          <ArrowDownToLine class="w-5 h-5 lg:w-4 lg:h-4 flex-shrink-0" />
          <span class="hidden lg:inline">Stock Masuk</span>
        </router-link>
        <router-link to="/app/stock-out" class="flex-1 flex items-center justify-center gap-2 py-3 lg:py-2 px-4 bg-danger-50 hover:bg-danger-100 text-danger-700 font-medium rounded-xl transition-colors">
          <ArrowUpFromLine class="w-5 h-5 lg:w-4 lg:h-4 flex-shrink-0" />
          <span class="hidden lg:inline">Stock Keluar</span>
        </router-link>
      </div>
    </div>

    <!-- Stats Cards -->
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
            <p class="text-sm text-neutral-500">Stock Masuk</p>
            <p class="text-2xl font-bold text-neutral-900">{{ activityStore.totalStockIn }}</p>
          </div>
        </div>
      </div>

      <div class="card p-4 lg:p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center">
            <TrendingDown class="w-6 h-6 text-warning-600" />
          </div>
          <div>
            <p class="text-sm text-neutral-500">Stock Keluar</p>
            <p class="text-2xl font-bold text-neutral-900">{{ activityStore.totalStockOut }}</p>
          </div>
        </div>
      </div>

      <div class="card p-4 lg:p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-danger-100 rounded-xl flex items-center justify-center">
            <AlertTriangle class="w-6 h-6 text-danger-600" />
          </div>
          <div>
            <p class="text-sm text-neutral-500">Low Stock</p>
            <p class="text-2xl font-bold text-neutral-900">{{ lowStockCount }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Low Stock Alert -->
    <div v-if="lowStockCount > 0" class="card p-4 lg:p-6 border-warning-300 bg-warning-50">
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 bg-warning-200 rounded-lg flex items-center justify-center flex-shrink-0">
          <AlertTriangle class="w-5 h-5 text-warning-700" />
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-warning-800">Perhatian: Stok Menipis</h3>
          <p class="text-sm text-warning-700 mt-1">
            {{ lowStockCount }} produk memiliki stok di bawah batas minimum
          </p>
          <router-link
            :to="{ path: '/app/inventory', query: { filter: 'low-stock' } }"
            class="inline-flex items-center gap-1 text-sm font-medium text-warning-800 hover:underline mt-2"
          >
            Lihat produk
            <Plus class="w-4 h-4 rotate-45" />
          </router-link>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card">
      <div class="flex items-center justify-between p-4 border-b border-neutral-100">
        <h3 class="font-semibold text-neutral-900">Aktivitas Terkini</h3>
        <router-link to="/app/activity" class="text-sm text-primary-600 hover:text-primary-700">
          Lihat semua
        </router-link>
      </div>
      <div class="divide-y divide-neutral-100">
        <div
          v-for="activity in recentActivities"
          :key="activity.id"
          class="p-4 flex items-center gap-4"
        >
          <div
            :class="[
              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
              activity.type === 'in' ? 'bg-success-100' : activity.type === 'out' ? 'bg-danger-100' : 'bg-primary-100'
            ]"
          >
            <TrendingUp
              v-if="activity.type === 'in'"
              class="w-5 h-5 text-success-600"
            />
            <TrendingDown
              v-else-if="activity.type === 'out'"
              class="w-5 h-5 text-danger-600"
            />
            <Package
              v-else
              class="w-5 h-5 text-primary-600"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-neutral-900 truncate">
              {{ activity.product_name }}
            </p>
            <p class="text-xs text-neutral-500">
              {{ activity.type === 'in' ? 'Masuk' : activity.type === 'out' ? 'Keluar' : 'Transfer' }}
              {{ activity.type === 'transfer' ? `ke ${activity.to_warehouse_name}` : '' }}
              · {{ activity.warehouse_name }}
            </p>
          </div>
          <div class="text-right">
            <p
              :class="[
                'text-sm font-semibold',
                activity.type === 'in' ? 'text-success-600' : activity.type === 'out' ? 'text-danger-600' : 'text-primary-600'
              ]"
            >
              {{ activity.type === 'in' ? '+' : activity.type === 'out' ? '-' : '' }}{{ activity.quantity }}
            </p>
            <p class="text-xs text-neutral-500">{{ formatDate(activity.created_at) }}</p>
          </div>
        </div>

        <div v-if="recentActivities.length === 0" class="p-8 text-center">
          <Package class="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p class="text-neutral-500">Belum ada aktivitas</p>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <router-link to="/app/inventory/new" class="card-hover p-4 text-center group">
        <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-200 transition-colors">
          <Plus class="w-6 h-6 text-primary-600" />
        </div>
        <p class="text-sm font-medium text-neutral-900">Tambah Produk</p>
      </router-link>

      <router-link to="/app/warehouses/new" class="card-hover p-4 text-center group">
        <div class="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-success-200 transition-colors">
          <Warehouse class="w-6 h-6 text-success-600" />
        </div>
        <p class="text-sm font-medium text-neutral-900">Tambah Gudang</p>
      </router-link>

      <router-link to="/app/suppliers/new" class="card-hover p-4 text-center group">
        <div class="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-warning-200 transition-colors">
          <Package class="w-6 h-6 text-warning-600" />
        </div>
        <p class="text-sm font-medium text-neutral-900">Tambah Supplier</p>
      </router-link>

      <router-link to="/app/tutorial" class="card-hover p-4 text-center group">
        <div class="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-neutral-200 transition-colors">
          <AlertTriangle class="w-6 h-6 text-neutral-600" />
        </div>
        <p class="text-sm font-medium text-neutral-900">Pusat Bantuan</p>
      </router-link>
    </div>
  </div>
</template>