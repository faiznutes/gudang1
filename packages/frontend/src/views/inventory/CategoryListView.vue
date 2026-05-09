<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import {
  AlertTriangle,
  ArrowRight,
  Package,
  Plus,
  Search,
  Tags,
} from 'lucide-vue-next'

const router = useRouter()
const inventoryStore = useInventoryStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const showCreateForm = ref(false)
const isSubmitting = ref(false)
const successMessage = ref('')
const errors = ref<Record<string, string>>({})

const form = ref({
  name: '',
  description: '',
})

const categories = computed(() => inventoryStore.categories)
const products = computed(() => inventoryStore.products)

const categoriesWithStats = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return categories.value
    .map(category => {
      const categoryProducts = products.value.filter(product => product.category_id === category.id)
      return {
        ...category,
        productCount: categoryProducts.length,
        lowStockCount: inventoryStore.productsWithInventory
          .filter(product => product.category_id === category.id && product.low_stock)
          .length,
        samples: categoryProducts.slice(0, 3),
      }
    })
    .filter(category => {
      if (!query) return true
      return category.name.toLowerCase().includes(query) ||
        category.description?.toLowerCase().includes(query)
    })
    .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name))
})

const uncategorizedCount = computed(() => {
  const categoryIds = new Set(categories.value.map(category => category.id))
  return products.value.filter(product => !categoryIds.has(product.category_id)).length
})

const totalAssignedProducts = computed(() => categoriesWithStats.value.reduce((sum, category) => sum + category.productCount, 0))

function resetForm() {
  form.value = { name: '', description: '' }
  errors.value = {}
}

function openCreateForm() {
  if (authStore.isActivitySessionExpired) return
  showCreateForm.value = true
  successMessage.value = ''
}

function closeCreateForm() {
  showCreateForm.value = false
  resetForm()
}

function validate() {
  errors.value = {}
  const name = form.value.name.trim()

  if (!name) {
    errors.value.name = 'Nama kategori wajib diisi'
  }

  const duplicate = categories.value.some(category => category.name.toLowerCase() === name.toLowerCase())
  if (duplicate) {
    errors.value.name = 'Kategori dengan nama ini sudah ada'
  }

  return Object.keys(errors.value).length === 0
}

async function submitCategory() {
  if (authStore.isActivitySessionExpired) return
  if (!validate()) return

  isSubmitting.value = true
  try {
    await inventoryStore.addCategory({
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
    })
    successMessage.value = 'Kategori baru berhasil dibuat'
    closeCreateForm()
  } catch (error) {
    errors.value.submit = error instanceof Error ? error.message : 'Gagal membuat kategori'
  } finally {
    isSubmitting.value = false
  }
}

function openProducts(categoryId: string) {
  router.push({ path: '/app/inventory', query: { category_id: categoryId } })
}
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-neutral-100 bg-white p-4">
        <p class="text-xs font-semibold text-neutral-500">Total kategori</p>
        <p class="mt-1 text-2xl font-bold text-neutral-900">{{ categories.length }}</p>
      </div>
      <div class="rounded-xl border border-neutral-100 bg-white p-4">
        <p class="text-xs font-semibold text-neutral-500">Produk terkelompok</p>
        <p class="mt-1 text-2xl font-bold text-neutral-900">{{ totalAssignedProducts }}</p>
      </div>
      <div class="rounded-xl border border-neutral-100 bg-white p-4">
        <p class="text-xs font-semibold text-neutral-500">Perlu dirapikan</p>
        <p class="mt-1 text-2xl font-bold text-neutral-900">{{ uncategorizedCount }}</p>
      </div>
    </div>

    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative flex-1 sm:max-w-md">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari kategori..."
          class="input pl-9"
        />
      </div>
      <button
        v-if="!showCreateForm"
        class="btn-primary"
        :disabled="authStore.isActivitySessionExpired"
        @click="openCreateForm"
      >
        <Plus class="h-4 w-4" />
        Tambah Kategori
      </button>
    </div>

    <div
      v-if="authStore.isActivitySessionExpired"
      class="flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4 text-warning-800"
    >
      <AlertTriangle class="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div>
        <p class="font-semibold">Aksi kategori terkunci</p>
        <p class="text-sm">Anda tetap bisa melihat kategori, tetapi belum bisa menambah data sampai sesi aktivitas aktif kembali.</p>
      </div>
    </div>

    <div v-if="successMessage" class="rounded-lg border border-success-100 bg-success-50 p-3 text-sm text-success-700">
      {{ successMessage }}
    </div>

    <div v-if="showCreateForm" class="card p-5">
      <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="font-semibold text-neutral-900">Kategori baru</h2>
          <p class="text-sm text-neutral-500">Gunakan nama yang mudah dipahami saat filter produk dan laporan.</p>
        </div>
      </div>
      <form class="mt-5 grid gap-4 lg:grid-cols-[1fr_1.4fr_auto]" @submit.prevent="submitCategory">
        <div>
          <label class="label">Nama kategori</label>
          <input
            v-model="form.name"
            class="input"
            :class="errors.name ? 'input-error' : ''"
            placeholder="Contoh: Pakaian"
          />
          <p v-if="errors.name" class="mt-1 text-xs text-danger-600">{{ errors.name }}</p>
        </div>
        <div>
          <label class="label">Catatan</label>
          <input
            v-model="form.description"
            class="input"
            placeholder="Opsional, misalnya untuk tipe barang"
          />
        </div>
        <div class="flex items-end gap-2">
          <button type="button" class="btn-secondary" @click="closeCreateForm">
            Batal
          </button>
          <button type="submit" class="btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </form>
      <p v-if="errors.submit" class="mt-3 rounded-lg border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">
        {{ errors.submit }}
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="category in categoriesWithStats"
        :key="category.id"
        class="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm"
      >
        <div class="flex items-start gap-3">
          <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Tags class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="truncate font-semibold text-neutral-900">{{ category.name }}</h2>
            <p class="mt-1 line-clamp-2 text-sm text-neutral-500">
              {{ category.description || 'Dipakai untuk mengelompokkan produk dan laporan stok.' }}
            </p>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-neutral-50 p-3">
            <p class="text-xs font-semibold text-neutral-500">Produk</p>
            <p class="mt-1 text-xl font-bold text-neutral-900">{{ category.productCount }}</p>
          </div>
          <div class="rounded-xl bg-warning-50 p-3">
            <p class="text-xs font-semibold text-warning-700">Stok menipis</p>
            <p class="mt-1 text-xl font-bold text-warning-900">{{ category.lowStockCount }}</p>
          </div>
        </div>

        <div class="mt-4 min-h-12">
          <div v-if="category.samples.length > 0" class="flex flex-wrap gap-2">
            <span
              v-for="product in category.samples"
              :key="product.id"
              class="inline-flex max-w-full items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700"
            >
              <Package class="h-3.5 w-3.5 flex-shrink-0" />
              <span class="truncate">{{ product.name }}</span>
            </span>
          </div>
          <p v-else class="text-sm text-neutral-500">Belum ada produk di kategori ini.</p>
        </div>

        <button class="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800" @click="openProducts(category.id)">
          Buka produk
          <ArrowRight class="h-4 w-4" />
        </button>
      </article>
    </div>

    <div v-if="categoriesWithStats.length === 0" class="card p-12 text-center">
      <Tags class="mx-auto mb-4 h-16 w-16 text-neutral-300" />
      <h3 class="mb-2 text-lg font-medium text-neutral-900">Kategori belum ada</h3>
      <p class="mb-4 text-neutral-500">Buat kategori pertama agar produk lebih mudah dicari dan dilaporkan.</p>
      <button
        class="btn-primary mx-auto"
        :disabled="authStore.isActivitySessionExpired"
        @click="openCreateForm"
      >
        <Plus class="h-4 w-4" />
        Tambah Kategori
      </button>
    </div>
  </div>
</template>
