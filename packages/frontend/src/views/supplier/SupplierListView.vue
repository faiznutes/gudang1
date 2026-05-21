<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSupplierStore } from '@/stores/supplier'
import { Search, Plus, User, Phone, Mail, MapPin, Pencil, Trash2 } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const supplierStore = useSupplierStore()

const searchQuery = ref('')
const selectedSupplierIds = ref<string[]>([])
const errorMessage = ref('')

const suppliers = computed(() => {
  let result = supplierStore.suppliers

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.contact_person?.toLowerCase().includes(query) ||
      s.phone?.includes(query)
    )
  }

  return result
})

const selectedSupplierCount = computed(() => selectedSupplierIds.value.length)

function isSupplierSelected(supplierId: string) {
  return selectedSupplierIds.value.includes(supplierId)
}

function toggleSupplierSelection(supplierId: string) {
  if (isSupplierSelected(supplierId)) {
    selectedSupplierIds.value = selectedSupplierIds.value.filter(id => id !== supplierId)
  } else {
    selectedSupplierIds.value = [...selectedSupplierIds.value, supplierId]
  }
}

function clearSelectedSuppliers() {
  selectedSupplierIds.value = []
}

async function deleteSupplier(id: string) {
  if (authStore.isActivitySessionExpired) return
  if (confirm('Yakin hapus supplier ini?')) {
    try {
      errorMessage.value = ''
      await supplierStore.deleteSupplier(id)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Gagal menghapus supplier'
    }
  }
}

async function bulkArchiveSuppliers() {
  if (authStore.isActivitySessionExpired || selectedSupplierIds.value.length === 0) return
  if (!confirm(`Arsipkan ${selectedSupplierIds.value.length} supplier terpilih?`)) return
  try {
    errorMessage.value = ''
    await supplierStore.bulkArchiveSuppliers(selectedSupplierIds.value)
    clearSelectedSuppliers()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal mengarsipkan supplier'
  }
}
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div v-if="authStore.isActivitySessionExpired" class="flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4 text-warning-800">
      <div>
        <p class="font-semibold">Aksi supplier terkunci</p>
        <p class="text-sm">Anda masih bisa melihat data, tetapi perubahan menunggu sesi aktivitas aktif kembali.</p>
      </div>
    </div>

    <div v-if="selectedSupplierCount > 0" class="flex flex-col gap-3 rounded-xl border border-primary-100 bg-primary-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="font-semibold text-primary-900">{{ selectedSupplierCount }} supplier dipilih</p>
        <p class="text-sm text-primary-700">Arsipkan beberapa supplier sekaligus.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn-secondary" :disabled="supplierStore.isLoading || authStore.isActivitySessionExpired" @click="bulkArchiveSuppliers">
          Arsipkan terpilih
        </button>
        <button class="btn-ghost" @click="clearSelectedSuppliers">
          Batal
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">
      {{ errorMessage }}
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari supplier..."
          class="input pl-9"
        />
      </div>
      <router-link to="/app/suppliers/new" class="btn-primary">
        <Plus class="w-4 h-4" />
        Tambah Supplier
      </router-link>
    </div>

    <!-- Supplier Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="supplier in suppliers"
        :key="supplier.id"
        class="card-hover flex flex-col p-5"
      >
        <div class="flex items-start gap-3">
          <input
            class="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600"
            type="checkbox"
            :checked="isSupplierSelected(supplier.id)"
            @click.stop
            @change="toggleSupplierSelection(supplier.id)"
          />
          <div class="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <User class="w-6 h-6 text-warning-600" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="truncate font-semibold text-neutral-900">{{ supplier.name }}</h3>
            <p v-if="supplier.contact_person" class="mt-1 text-sm text-neutral-500">
              {{ supplier.contact_person }}
            </p>
          </div>
        </div>

        <div class="mt-4 flex-1 space-y-2">
          <div v-if="supplier.phone" class="flex items-center gap-2 text-sm text-neutral-500">
            <Phone class="w-4 h-4" />
            {{ supplier.phone }}
          </div>
          <div v-if="supplier.email" class="flex items-center gap-2 text-sm text-neutral-500">
            <Mail class="w-4 h-4" />
            {{ supplier.email }}
          </div>
          <div v-if="supplier.address" class="flex items-start gap-2 text-sm text-neutral-500">
            <MapPin class="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{{ supplier.address }}</span>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-2">
          <button
            class="btn-secondary btn-sm justify-center"
            :disabled="authStore.isActivitySessionExpired"
            @click="router.push({ name: 'supplier-edit', params: { id: supplier.id } })"
          >
            <Pencil class="w-4 h-4" />
            Edit
          </button>
          <button
            class="btn-secondary btn-sm justify-center text-danger-600"
            :disabled="authStore.isActivitySessionExpired"
            @click="deleteSupplier(supplier.id)"
          >
            <Trash2 class="w-4 h-4" />
            Hapus
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="suppliers.length === 0" class="card p-12 text-center">
      <User class="w-16 h-16 text-neutral-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-neutral-900 mb-2">Tidak ada supplier</h3>
      <p class="text-neutral-500 mb-4">Tambahkan supplier pertama kamu</p>
      <router-link to="/app/suppliers/new" class="btn-primary">
        <Plus class="w-4 h-4" />
        Tambah Supplier
      </router-link>
    </div>
  </div>
</template>
