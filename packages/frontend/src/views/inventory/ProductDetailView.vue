<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useActivityStore } from '@/stores/activity'
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Package, Warehouse, AlertTriangle } from 'lucide-vue-next'

const route = useRoute()
const inventoryStore = useInventoryStore()
const activityStore = useActivityStore()

const productId = computed(() => route.params.id as string)

const product = computed(() => inventoryStore.getProductById(productId.value))

const productWithInventory = computed(() => {
  return inventoryStore.productsWithInventory.find(p => p.id === productId.value)
})

const activities = computed(() => {
  return activityStore.getActivitiesByProduct(productId.value)
})

const categoryName = computed(() => {
  if (!product.value) return '-'
  return inventoryStore.categories.find(c => c.id === product.value?.category_id)?.name || '-'
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(amount: number) {
  return 'Rp ' + (amount || 0).toLocaleString('id-ID')
}
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <!-- Back -->
    <router-link
      :to="{ name: 'inventory' }"
      class="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
    >
      <ArrowLeft class="w-4 h-4" />
      Kembali ke Inventori
    </router-link>

    <div v-if="product" class="space-y-6">
      <!-- Product Header -->
      <div class="card p-6">
        <div class="flex flex-col md:flex-row md:items-start gap-6">
          <div class="w-20 h-20 bg-neutral-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package class="w-10 h-10 text-neutral-400" />
          </div>
          <div class="flex-1">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h1 class="text-2xl font-bold text-neutral-900">{{ product.name }}</h1>
                <p class="text-neutral-500">SKU: {{ product.sku }}</p>
              </div>
              <div class="flex gap-2">
                <router-link
                  :to="{ name: 'inventory-edit', params: { id: product.id } }"
                  class="btn-secondary btn-sm"
                >
                  Edit
                </router-link>
              </div>
            </div>
            <p v-if="product.description" class="mt-3 text-neutral-600">{{ product.description }}</p>

            <div class="mt-4 flex flex-wrap gap-4">
              <div>
                <p class="text-xs text-neutral-500">Kategori</p>
                <p class="font-medium">{{ categoryName }}</p>
              </div>
              <div>
                <p class="text-xs text-neutral-500">Harga</p>
                <p class="font-medium">{{ formatCurrency(product.price) }}</p>
              </div>
              <div>
                <p class="text-xs text-neutral-500">Stok Minimum</p>
                <p class="font-medium">{{ product.min_stock }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stock Summary -->
      <div class="card p-6">
        <h2 class="font-semibold text-neutral-900 mb-4">Stok per Gudang</h2>
        <div v-if="productWithInventory?.inventory.length" class="space-y-3">
          <div
            v-for="inv in productWithInventory.inventory"
            :key="inv.id"
            class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <Warehouse class="w-5 h-5 text-neutral-400" />
              <div>
                <p class="font-medium text-neutral-900">{{ inv.warehouse?.name || 'Gudang' }}</p>
                <p class="text-xs text-neutral-500">Terakhir update: {{ formatDate(inv.updated_at) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span :class="['text-xl font-bold', inv.quantity <= product.min_stock ? 'text-danger-600' : 'text-neutral-900']">
                {{ inv.quantity }}
              </span>
              <AlertTriangle
                v-if="inv.quantity <= product.min_stock"
                class="w-5 h-5 text-danger-500"
              />
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8 text-neutral-500">
          <Package class="w-12 h-12 mx-auto mb-2 text-neutral-300" />
          <p>Belum ada stok di gudang manapun</p>
        </div>

        <!-- Quick Actions -->
        <div class="mt-4 flex gap-3">
          <router-link :to="{ name: 'stock-in' }" class="btn-primary btn-sm">
            <ArrowDownToLine class="w-4 h-4" />
            Stock Masuk
          </router-link>
          <router-link :to="{ name: 'stock-out' }" class="btn-secondary btn-sm">
            <ArrowUpFromLine class="w-4 h-4" />
            Stock Keluar
          </router-link>
        </div>
      </div>

      <!-- Activity History -->
      <div class="card">
        <div class="p-4 border-b border-neutral-100">
          <h2 class="font-semibold text-neutral-900">Riwayat Aktivitas</h2>
        </div>
        <div class="divide-y divide-neutral-100">
          <div
            v-for="activity in activities"
            :key="activity.id"
            class="p-4 flex items-center gap-4"
          >
            <div
              :class="[
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                activity.type === 'in' ? 'bg-success-100' : 'bg-danger-100'
              ]"
            >
              <ArrowDownToLine v-if="activity.type === 'in'" class="w-5 h-5 text-success-600" />
              <ArrowUpFromLine v-else class="w-5 h-5 text-danger-600" />
            </div>
            <div class="flex-1">
              <p class="font-medium text-neutral-900">
                {{ activity.type === 'in' ? 'Stock Masuk' : 'Stock Keluar' }}
              </p>
              <p class="text-sm text-neutral-500">
                {{ activity.warehouse_name }} · {{ activity.notes || '-' }}
              </p>
            </div>
            <div class="text-right">
              <p :class="['font-semibold', activity.type === 'in' ? 'text-success-600' : 'text-danger-600']">
                {{ activity.type === 'in' ? '+' : '-' }}{{ activity.quantity }}
              </p>
              <p class="text-xs text-neutral-500">{{ formatDate(activity.created_at) }}</p>
            </div>
          </div>

          <div v-if="activities.length === 0" class="p-8 text-center text-neutral-500">
            Belum ada aktivitas untuk produk ini
          </div>
        </div>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else class="card p-12 text-center">
      <Package class="w-16 h-16 text-neutral-300 mx-auto mb-4" />
      <h2 class="text-lg font-medium text-neutral-900 mb-2">Produk tidak ditemukan</h2>
      <router-link :to="{ name: 'inventory' }" class="btn-primary mt-4">
        Kembali ke Inventori
      </router-link>
    </div>
  </div>
</template>