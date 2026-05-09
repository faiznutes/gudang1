<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import importExportService from '@/services/api/importExport'
import {
  Search,
  Plus,
  Filter,
  Package,
  AlertTriangle,
  Download,
  Upload,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const inventoryStore = useInventoryStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const selectedCategory = ref('')
const selectedWarehouse = ref('')
const selectedStatus = ref(typeof route.query.filter === 'string' ? route.query.filter : '')
const showFilter = ref(false)
const activeDropdown = ref<string | null>(null)
const importInput = ref<HTMLInputElement | null>(null)
const importMessage = ref('')

const products = computed(() => {
  let result = inventoryStore.productsWithInventory

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query)
    )
  }

  if (selectedCategory.value) {
    result = result.filter(p => p.category_id === selectedCategory.value)
  }

  if (selectedWarehouse.value) {
    result = result.filter(p =>
      p.inventory.some(i => i.warehouse_id === selectedWarehouse.value)
    )
  }

  if (selectedStatus.value === 'low-stock') {
    result = result.filter(p => p.low_stock)
  } else if (selectedStatus.value === 'out-of-stock') {
    result = result.filter(p => p.total_quantity <= 0)
  } else if (selectedStatus.value === 'available') {
    result = result.filter(p => p.total_quantity > 0)
  }

  return result
})

const categories = computed(() => inventoryStore.categories)
const warehouses = computed(() => inventoryStore.warehouses)
const lowStockCount = computed(() => inventoryStore.getLowStockProducts().length)
const outOfStockCount = computed(() => inventoryStore.productsWithInventory.filter(product => product.total_quantity <= 0).length)

function getCategoryName(categoryId: string) {
  return categories.value.find(c => c.id === categoryId)?.name || '-'
}

function getStockQuantity(productId: string) {
  const product = inventoryStore.productsWithInventory.find(p => p.id === productId)
  return product?.total_quantity || 0
}

function resetFilters() {
  searchQuery.value = ''
  selectedCategory.value = ''
  selectedWarehouse.value = ''
  selectedStatus.value = ''
}

function isLowStock(productId: string) {
  const product = inventoryStore.productsWithInventory.find(p => p.id === productId)
  return product?.low_stock || false
}

function toggleDropdown(id: string) {
  activeDropdown.value = activeDropdown.value === id ? null : id
}

async function deleteProduct(id: string) {
  if (authStore.isActivitySessionExpired) return
  if (confirm('Yakin hapus produk ini?')) {
    await inventoryStore.deleteProduct(id)
  }
  activeDropdown.value = null
}

async function exportProducts() {
  await importExportService.exportData('products')
}

async function downloadTemplate() {
  await importExportService.downloadTemplate('products')
}

function openImportPicker() {
  if (authStore.isActivitySessionExpired) return
  importInput.value?.click()
}

async function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const result = await importExportService.importData('products', await file.text())
  importMessage.value = `${result.imported} baris produk berhasil diimport`
  input.value = ''
  await inventoryStore.loadAll()
}
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <button
        :class="['rounded-xl border p-4 text-left transition', selectedStatus === '' ? 'border-primary-200 bg-primary-50 text-primary-900' : 'border-neutral-100 bg-white text-neutral-800 hover:bg-neutral-50']"
        @click="selectedStatus = ''"
      >
        <p class="text-xs font-semibold text-current/70">Semua produk</p>
        <p class="mt-1 text-xl font-bold">{{ inventoryStore.totalProducts }}</p>
      </button>
      <button
        :class="['rounded-xl border p-4 text-left transition', selectedStatus === 'low-stock' ? 'border-warning-200 bg-warning-50 text-warning-900' : 'border-neutral-100 bg-white text-neutral-800 hover:bg-neutral-50']"
        @click="selectedStatus = 'low-stock'"
      >
        <p class="text-xs font-semibold text-current/70">Stok menipis</p>
        <p class="mt-1 text-xl font-bold">{{ lowStockCount }}</p>
      </button>
      <button
        :class="['rounded-xl border p-4 text-left transition', selectedStatus === 'out-of-stock' ? 'border-danger-200 bg-danger-50 text-danger-900' : 'border-neutral-100 bg-white text-neutral-800 hover:bg-neutral-50']"
        @click="selectedStatus = 'out-of-stock'"
      >
        <p class="text-xs font-semibold text-current/70">Stok kosong</p>
        <p class="mt-1 text-xl font-bold">{{ outOfStockCount }}</p>
      </button>
    </div>

    <!-- Header Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3 flex-1">
        <div class="relative flex-1 max-w-md">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari produk atau SKU..."
            class="input pl-9"
          />
        </div>
        <button
          @click="showFilter = !showFilter"
          :class="['btn-secondary', showFilter ? 'bg-neutral-100' : '']"
        >
          <Filter class="w-4 h-4" />
          Filter
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn-secondary" @click="downloadTemplate">
          <Download class="w-4 h-4" />
          Template
        </button>
        <button class="btn-secondary" @click="exportProducts">
          <Download class="w-4 h-4" />
          Export CSV
        </button>
        <button class="btn-secondary" :disabled="authStore.isActivitySessionExpired" @click="openImportPicker">
          <Upload class="w-4 h-4" />
          Import CSV
        </button>
        <input ref="importInput" class="hidden" type="file" accept=".csv,text/csv" @change="handleImport" />
        <router-link v-if="!authStore.isActivitySessionExpired" to="/app/inventory/new" class="btn-primary">
          <Plus class="w-4 h-4" />
          Tambah Produk
        </router-link>
        <button v-else class="btn-secondary text-danger-600" disabled title="Aksi saat ini dikunci">
          x Aksi terkunci
        </button>
      </div>
    </div>

    <div v-if="importMessage" class="rounded-lg border border-success-100 bg-success-50 p-3 text-sm text-success-700">
      {{ importMessage }}
    </div>

    <!-- Filters -->
    <div v-if="showFilter" class="card p-4 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="label">Status stok</label>
          <select v-model="selectedStatus" class="input">
            <option value="">Semua</option>
            <option value="available">Ada stok</option>
            <option value="low-stock">Stok menipis</option>
            <option value="out-of-stock">Stok kosong</option>
          </select>
        </div>
        <div>
          <label class="label">Kategori</label>
          <select v-model="selectedCategory" class="input">
            <option value="">Semua</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">Gudang</label>
          <select v-model="selectedWarehouse" class="input">
            <option value="">Semua</option>
            <option v-for="wh in warehouses" :key="wh.id" :value="wh.id">
              {{ wh.name }}
            </option>
          </select>
        </div>
      </div>
      <button class="btn-ghost btn-sm" @click="resetFilters">
        Reset filter
      </button>
    </div>

    <!-- Product Table -->
    <div class="card overflow-hidden">
      <div class="divide-y divide-neutral-100 md:hidden">
        <article v-for="product in products" :key="product.id" class="p-4">
          <div class="flex items-start gap-3">
            <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100">
              <Package class="h-5 w-5 text-neutral-400" />
            </div>
            <div class="min-w-0 flex-1">
              <button class="block truncate text-left font-semibold text-neutral-900" @click="router.push({ name: 'inventory-detail', params: { id: product.id } })">
                {{ product.name }}
              </button>
              <p class="mt-0.5 truncate text-xs text-neutral-500">{{ product.sku }} - {{ getCategoryName(product.category_id) }}</p>
              <div class="mt-3 flex items-center justify-between gap-3">
                <span :class="['rounded-full px-2.5 py-1 text-xs font-bold', isLowStock(product.id) ? 'bg-warning-100 text-warning-800' : getStockQuantity(product.id) <= 0 ? 'bg-danger-100 text-danger-800' : 'bg-emerald-100 text-emerald-800']">
                  Stok {{ getStockQuantity(product.id) }}
                </span>
                <span class="text-sm font-semibold text-neutral-800">Rp {{ product.price?.toLocaleString('id-ID') || 0 }}</span>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div class="hidden overflow-x-auto md:block">
        <table class="w-full">
          <thead>
            <tr class="border-b border-neutral-100">
              <th class="table-header">Produk</th>
              <th class="table-header">SKU</th>
              <th class="table-header">Kategori</th>
              <th class="table-header text-right">Stok</th>
              <th class="table-header text-right">Harga</th>
              <th class="table-header w-12"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr
              v-for="product in products"
              :key="product.id"
              class="hover:bg-neutral-50 transition-colors"
            >
              <td class="table-cell">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                    <Package class="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <p class="font-medium text-neutral-900">{{ product.name }}</p>
                    <p class="text-xs text-neutral-500">{{ product.description }}</p>
                  </div>
                </div>
              </td>
              <td class="table-cell font-mono text-xs">{{ product.sku }}</td>
              <td class="table-cell">{{ getCategoryName(product.category_id) }}</td>
              <td class="table-cell text-right">
                <div class="flex items-center justify-end gap-2">
                  <span :class="['font-semibold', isLowStock(product.id) ? 'text-danger-600' : '']">
                    {{ getStockQuantity(product.id) }}
                  </span>
                  <AlertTriangle
                    v-if="isLowStock(product.id)"
                    class="w-4 h-4 text-danger-500"
                  />
                </div>
              </td>
              <td class="table-cell text-right font-medium">
                Rp {{ product.price?.toLocaleString('id-ID') || 0 }}
              </td>
              <td class="table-cell">
                <div class="relative">
                  <button
                    @click="toggleDropdown(product.id)"
                    class="p-1.5 rounded-lg hover:bg-neutral-100"
                  >
                    <MoreVertical class="w-4 h-4 text-neutral-400" />
                  </button>
                  <transition
                    enter-active-class="transition ease-out duration-100"
                    enter-from-class="transform opacity-0 scale-95"
                    enter-to-class="transform opacity-100 scale-100"
                    leave-active-class="transition ease-in duration-75"
                    leave-from-class="transform opacity-100 scale-100"
                    leave-to-class="transform opacity-0 scale-95"
                  >
                    <div
                      v-if="activeDropdown === product.id"
                      class="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-dropdown border border-neutral-100 py-1 z-10"
                    >
                      <button
                        @click="router.push({ name: 'inventory-detail', params: { id: product.id } })"
                        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                      >
                        <Eye class="w-4 h-4" />
                        Lihat
                      </button>
                      <button
                        @click="router.push({ name: 'inventory-edit', params: { id: product.id } })"
                        :disabled="authStore.isActivitySessionExpired"
                        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                      >
                        <Pencil class="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        @click="deleteProduct(product.id)"
                        :disabled="authStore.isActivitySessionExpired"
                        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                      >
                        <Trash2 class="w-4 h-4" />
                        Hapus
                      </button>
                    </div>
                  </transition>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-if="products.length === 0" class="p-12 text-center">
        <Package class="w-16 h-16 text-neutral-300 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-neutral-900 mb-2">Tidak ada produk</h3>
        <p class="text-neutral-500 mb-4">Mulai tambahkan produk pertama kamu</p>
        <router-link v-if="!authStore.isActivitySessionExpired" to="/app/inventory/new" class="btn-primary">
          <Plus class="w-4 h-4" />
          Tambah Produk
        </router-link>
      </div>
    </div>
  </div>
</template>
