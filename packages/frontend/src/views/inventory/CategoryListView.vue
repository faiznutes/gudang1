<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import {
  AlertTriangle,
  ArrowRight,
  Archive,
  GitMerge,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Tags,
  X,
} from 'lucide-vue-next'

type CategoryMode = 'create' | 'edit'
type CategoryStatusFilter = 'all' | 'active' | 'archived'

const router = useRouter()
const inventoryStore = useInventoryStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const statusFilter = ref<CategoryStatusFilter>('all')
const showFormModal = ref(false)
const formMode = ref<CategoryMode>('create')
const editingCategoryId = ref<string | null>(null)
const showMergeModal = ref(false)
const mergeSourceId = ref<string | null>(null)
const mergeTargetId = ref('')
const isSubmitting = ref(false)
const successMessage = ref('')
const errors = ref<Record<string, string>>({})

const form = ref({
  name: '',
  description: '',
})

const categories = computed(() => inventoryStore.categories)
const products = computed(() => inventoryStore.products)

const categoryCards = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return categories.value
    .map(category => {
      const categoryProducts = products.value.filter(product => product.category_id === category.id)
      const inventoryCount = inventoryStore.productsWithInventory
        .filter(product => product.category_id === category.id)
        .reduce((sum, product) => sum + product.total_quantity, 0)

      return {
        ...category,
        isArchived: !!category.disabled_at,
        productCount: categoryProducts.length,
        lowStockCount: inventoryStore.productsWithInventory
          .filter(product => product.category_id === category.id && product.low_stock)
          .length,
        stockCount: inventoryCount,
        samples: categoryProducts.slice(0, 3),
      }
    })
    .filter(category => {
      const matchesStatus =
        statusFilter.value === 'all'
          ? true
          : statusFilter.value === 'active'
            ? !category.isArchived
            : category.isArchived

      if (!matchesStatus) return false
      if (!query) return true
      return category.name.toLowerCase().includes(query) ||
        category.description?.toLowerCase().includes(query)
    })
    .sort((a, b) => {
      const statusRank = Number(a.isArchived) - Number(b.isArchived)
      if (statusFilter.value === 'all' && statusRank !== 0) return statusRank
      return b.productCount - a.productCount || a.name.localeCompare(b.name)
    })
})

const activeCategories = computed(() => categories.value.filter(category => !category.disabled_at))
const archivedCategories = computed(() => categories.value.filter(category => category.disabled_at))
const uncategorizedCount = computed(() => {
  const categoryIds = new Set(categories.value.map(category => category.id))
  return products.value.filter(product => !categoryIds.has(product.category_id)).length
})
const totalCategoryProducts = computed(() => products.value.filter(product => categories.value.some(category => category.id === product.category_id)).length)

function resetForm() {
  form.value = { name: '', description: '' }
  errors.value = {}
  editingCategoryId.value = null
}

function openCreateForm() {
  if (authStore.isActivitySessionExpired) return
  formMode.value = 'create'
  resetForm()
  showFormModal.value = true
  successMessage.value = ''
}

function openEditForm(category: { id: string; name: string; description?: string | null }) {
  if (authStore.isActivitySessionExpired) return
  formMode.value = 'edit'
  editingCategoryId.value = category.id
  form.value = {
    name: category.name,
    description: category.description ?? '',
  }
  errors.value = {}
  showFormModal.value = true
}

function closeFormModal() {
  showFormModal.value = false
  resetForm()
}

function openMergeModal(categoryId: string) {
  if (authStore.isActivitySessionExpired) return
  mergeSourceId.value = categoryId
  mergeTargetId.value = activeCategories.value.find(category => category.id !== categoryId)?.id ?? ''
  errors.value = {}
  showMergeModal.value = true
}

function closeMergeModal() {
  showMergeModal.value = false
  mergeSourceId.value = null
  mergeTargetId.value = ''
  errors.value = {}
}

function validateForm() {
  errors.value = {}
  const name = form.value.name.trim()

  if (!name) {
    errors.value.name = 'Nama kategori wajib diisi'
  }

  const duplicate = categories.value.some(category => {
    if (formMode.value === 'edit' && category.id === editingCategoryId.value) return false
    if (formMode.value === 'create' && category.disabled_at) return false
    return category.name.toLowerCase() === name.toLowerCase()
  })
  if (duplicate) {
    errors.value.name = 'Kategori dengan nama ini sudah ada'
  }

  return Object.keys(errors.value).length === 0
}

async function submitCategory() {
  if (authStore.isActivitySessionExpired) return
  if (!validateForm()) return

  isSubmitting.value = true
  try {
    if (formMode.value === 'edit' && editingCategoryId.value) {
      await inventoryStore.updateCategory(editingCategoryId.value, {
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
      })
      successMessage.value = 'Kategori berhasil diperbarui'
    } else {
      await inventoryStore.addCategory({
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
      })
      successMessage.value = 'Kategori berhasil disimpan'
    }
    closeFormModal()
  } catch (error) {
    errors.value.submit = error instanceof Error ? error.message : 'Gagal menyimpan kategori'
  } finally {
    isSubmitting.value = false
  }
}

async function archiveCategory(categoryId: string) {
  if (authStore.isActivitySessionExpired) return
  if (!confirm('Arsipkan kategori ini? Produk lama tetap aman, tetapi kategori tidak akan dipakai untuk item baru.')) return
  isSubmitting.value = true
  try {
    await inventoryStore.archiveCategory(categoryId)
    successMessage.value = 'Kategori berhasil diarsipkan'
  } catch (error) {
    errors.value.submit = error instanceof Error ? error.message : 'Gagal mengarsipkan kategori'
  } finally {
    isSubmitting.value = false
  }
}

async function restoreCategory(categoryId: string) {
  if (authStore.isActivitySessionExpired) return
  isSubmitting.value = true
  try {
    await inventoryStore.restoreCategory(categoryId)
    successMessage.value = 'Kategori berhasil diaktifkan kembali'
  } catch (error) {
    errors.value.submit = error instanceof Error ? error.message : 'Gagal memulihkan kategori'
  } finally {
    isSubmitting.value = false
  }
}

async function submitMerge() {
  if (authStore.isActivitySessionExpired) return
  if (!mergeSourceId.value || !mergeTargetId.value) {
    errors.value.submit = 'Pilih kategori tujuan terlebih dahulu'
    return
  }

  isSubmitting.value = true
  try {
    await inventoryStore.mergeCategories(mergeSourceId.value, mergeTargetId.value)
    successMessage.value = 'Kategori berhasil digabung'
    closeMergeModal()
  } catch (error) {
    errors.value.submit = error instanceof Error ? error.message : 'Gagal menggabungkan kategori'
  } finally {
    isSubmitting.value = false
  }
}

function openProducts(categoryId: string) {
  router.push({ path: '/app/inventory', query: { category_id: categoryId } })
}

onMounted(async () => {
  if (inventoryStore.products.length === 0 || inventoryStore.categories.length === 0) {
    await inventoryStore.loadAll().catch(() => {})
  }
})
</script>

<template>
  <div class="space-y-6 p-4 lg:p-8">
    <section class="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <div class="rounded-xl border border-neutral-100 bg-white p-4">
        <p class="text-xs font-semibold text-neutral-500">Kategori aktif</p>
        <p class="mt-1 text-2xl font-bold text-neutral-900">{{ activeCategories.length }}</p>
      </div>
      <div class="rounded-xl border border-neutral-100 bg-white p-4">
        <p class="text-xs font-semibold text-neutral-500">Kategori arsip</p>
        <p class="mt-1 text-2xl font-bold text-neutral-900">{{ archivedCategories.length }}</p>
      </div>
      <div class="rounded-xl border border-neutral-100 bg-white p-4">
        <p class="text-xs font-semibold text-neutral-500">Produk terkelompok</p>
        <p class="mt-1 text-2xl font-bold text-neutral-900">{{ totalCategoryProducts }}</p>
      </div>
      <div class="rounded-xl border border-neutral-100 bg-white p-4">
        <p class="text-xs font-semibold text-neutral-500">Perlu dirapikan</p>
        <p class="mt-1 text-2xl font-bold text-neutral-900">{{ uncategorizedCount }}</p>
      </div>
    </section>

    <section class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative flex-1 sm:max-w-md">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari kategori..."
          class="input pl-9"
        />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="rounded-full px-3 py-2 text-sm font-medium"
          :class="statusFilter === 'all' ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600'"
          @click="statusFilter = 'all'"
        >
          Semua
        </button>
        <button
          class="rounded-full px-3 py-2 text-sm font-medium"
          :class="statusFilter === 'active' ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600'"
          @click="statusFilter = 'active'"
        >
          Aktif
        </button>
        <button
          class="rounded-full px-3 py-2 text-sm font-medium"
          :class="statusFilter === 'archived' ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600'"
          @click="statusFilter = 'archived'"
        >
          Arsip
        </button>
        <button
          class="btn-primary"
          :disabled="authStore.isActivitySessionExpired"
          @click="openCreateForm"
        >
          <Plus class="h-4 w-4" />
          Tambah kategori
        </button>
      </div>
    </section>

    <div
      v-if="authStore.isActivitySessionExpired"
      class="flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4 text-warning-800"
    >
      <AlertTriangle class="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div>
        <p class="font-semibold">Aksi kategori terkunci</p>
        <p class="text-sm">Anda masih bisa melihat dan memfilter kategori, tetapi perubahan data menunggu sesi aktivitas aktif kembali.</p>
      </div>
    </div>

    <div v-if="successMessage" class="rounded-lg border border-success-100 bg-success-50 p-3 text-sm text-success-700">
      {{ successMessage }}
    </div>

    <div v-if="errors.submit" class="rounded-lg border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">
      {{ errors.submit }}
    </div>

    <section v-if="categoryCards.length > 0" class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="category in categoryCards"
        :key="category.id"
        class="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm"
      >
        <div class="flex items-start gap-3">
          <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Tags class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="truncate font-semibold text-neutral-900">{{ category.name }}</h2>
              <span
                :class="[
                  'rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide',
                  category.isArchived ? 'bg-neutral-100 text-neutral-600' : 'bg-emerald-50 text-emerald-700',
                ]"
              >
                {{ category.isArchived ? 'Arsip' : 'Aktif' }}
              </span>
            </div>
            <p class="mt-1 line-clamp-2 text-sm text-neutral-500">
              {{ category.description || 'Kategori ini dipakai untuk mengelompokkan produk dan membaca laporan stok lebih cepat.' }}
            </p>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-3 gap-3">
          <div class="rounded-xl bg-neutral-50 p-3">
            <p class="text-xs font-semibold text-neutral-500">Produk</p>
            <p class="mt-1 text-xl font-bold text-neutral-900">{{ category.productCount }}</p>
          </div>
          <div class="rounded-xl bg-warning-50 p-3">
            <p class="text-xs font-semibold text-warning-700">Stok menipis</p>
            <p class="mt-1 text-xl font-bold text-warning-900">{{ category.lowStockCount }}</p>
          </div>
          <div class="rounded-xl bg-primary-50 p-3">
            <p class="text-xs font-semibold text-primary-700">Total stok</p>
            <p class="mt-1 text-xl font-bold text-primary-950">{{ category.stockCount }}</p>
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

        <div class="mt-5 flex flex-wrap gap-2">
          <button class="btn-secondary btn-sm" @click="openProducts(category.id)">
            <ArrowRight class="h-4 w-4" />
            Buka produk
          </button>
          <button
            class="btn-secondary btn-sm"
            :disabled="authStore.isActivitySessionExpired"
            @click="openEditForm(category)"
          >
            <Pencil class="h-4 w-4" />
            Edit
          </button>
          <button
            v-if="!category.isArchived"
            class="btn-secondary btn-sm"
            :disabled="authStore.isActivitySessionExpired"
            @click="archiveCategory(category.id)"
          >
            <Archive class="h-4 w-4" />
            Arsipkan
          </button>
          <button
            v-else
            class="btn-secondary btn-sm"
            :disabled="authStore.isActivitySessionExpired"
            @click="restoreCategory(category.id)"
          >
            <RotateCcw class="h-4 w-4" />
            Pulihkan
          </button>
          <button
            v-if="!category.isArchived"
            class="btn-secondary btn-sm"
            :disabled="authStore.isActivitySessionExpired || activeCategories.length < 2"
            @click="openMergeModal(category.id)"
          >
            <GitMerge class="h-4 w-4" />
            Gabung
          </button>
        </div>
      </article>
    </section>

    <div v-else class="card p-12 text-center">
      <Tags class="mx-auto mb-4 h-16 w-16 text-neutral-300" />
      <h3 class="mb-2 text-lg font-medium text-neutral-900">Kategori belum ada</h3>
      <p class="mb-4 text-neutral-500">Buat kategori pertama agar produk lebih mudah dicari dan dilaporkan.</p>
      <button
        class="btn-primary mx-auto"
        :disabled="authStore.isActivitySessionExpired"
        @click="openCreateForm"
      >
        <Plus class="h-4 w-4" />
        Tambah kategori
      </button>
    </div>

    <Teleport to="body">
      <transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showFormModal" class="fixed inset-0 z-50">
          <button class="absolute inset-0 bg-neutral-950/40" aria-label="Tutup form kategori" @click="closeFormModal" />
          <aside class="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div class="flex items-start justify-between gap-4 border-b border-neutral-100 p-5">
              <div class="min-w-0">
                <p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {{ formMode === 'edit' ? 'Edit kategori' : 'Kategori baru' }}
                </p>
                <h2 class="mt-1 text-xl font-bold text-neutral-900">
                  {{ formMode === 'edit' ? 'Perbarui kategori' : 'Buat kategori operasional' }}
                </h2>
                <p class="mt-1 text-sm text-neutral-500">
                  Nama yang jelas membuat filter produk, laporan, dan onboarding lebih mudah dipahami.
                </p>
              </div>
              <button class="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" @click="closeFormModal">
                <X class="h-5 w-5" />
              </button>
            </div>

            <form class="flex-1 space-y-5 overflow-y-auto p-5" @submit.prevent="submitCategory">
              <div>
                <label class="label" for="category-name">Nama kategori</label>
                <input
                  id="category-name"
                  v-model="form.name"
                  class="input"
                  :class="errors.name ? 'input-error' : ''"
                  placeholder="Contoh: Pakaian"
                />
                <p v-if="errors.name" class="mt-1 text-xs text-danger-600">{{ errors.name }}</p>
              </div>

              <div>
                <label class="label" for="category-description">Catatan</label>
                <textarea
                  id="category-description"
                  v-model="form.description"
                  class="input min-h-[120px]"
                  placeholder="Opsional, misalnya untuk tipe barang atau layout laporan"
                />
              </div>

              <div v-if="errors.submit" class="rounded-lg border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">
                {{ errors.submit }}
              </div>
            </form>

            <div class="border-t border-neutral-100 p-4">
              <div class="flex items-center justify-end gap-2">
                <button type="button" class="btn-secondary" @click="closeFormModal">Batal</button>
                <button type="button" class="btn-primary" :disabled="isSubmitting" @click="submitCategory">
                  {{ isSubmitting ? 'Menyimpan...' : 'Simpan kategori' }}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </transition>
    </Teleport>

    <Teleport to="body">
      <transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showMergeModal" class="fixed inset-0 z-50">
          <button class="absolute inset-0 bg-neutral-950/40" aria-label="Tutup gabung kategori" @click="closeMergeModal" />
          <aside class="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div class="flex items-start justify-between gap-4 border-b border-neutral-100 p-5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">Gabung kategori</p>
                <h2 class="mt-1 text-xl font-bold text-neutral-900">Satukan kelompok produk</h2>
                <p class="mt-1 text-sm text-neutral-500">
                  Produk dari kategori sumber akan dipindahkan ke kategori tujuan, lalu kategori sumber diarsipkan.
                </p>
              </div>
              <button class="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" @click="closeMergeModal">
                <X class="h-5 w-5" />
              </button>
            </div>

            <div class="flex-1 space-y-5 overflow-y-auto p-5">
              <div v-if="mergeSourceId" class="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">Kategori sumber</p>
                <p class="mt-1 text-lg font-semibold text-neutral-900">
                  {{ categories.find(category => category.id === mergeSourceId)?.name || '-' }}
                </p>
              </div>

              <div>
                <label class="label" for="category-merge-target">Pilih kategori tujuan</label>
                <select id="category-merge-target" v-model="mergeTargetId" class="input w-full">
                  <option value="">Pilih tujuan</option>
                  <option
                    v-for="category in activeCategories"
                    :key="category.id"
                    :value="category.id"
                    :disabled="category.id === mergeSourceId"
                  >
                    {{ category.name }}
                  </option>
                </select>
              </div>

              <div class="rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800">
                Gabung kategori membantu merapikan laporan tanpa menghapus histori stok.
              </div>

              <div v-if="errors.submit" class="rounded-lg border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">
                {{ errors.submit }}
              </div>
            </div>

            <div class="border-t border-neutral-100 p-4">
              <div class="flex items-center justify-end gap-2">
                <button type="button" class="btn-secondary" @click="closeMergeModal">Batal</button>
                <button type="button" class="btn-primary" :disabled="isSubmitting || !mergeTargetId" @click="submitMerge">
                  {{ isSubmitting ? 'Menggabungkan...' : 'Gabungkan' }}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </transition>
    </Teleport>
  </div>
</template>
