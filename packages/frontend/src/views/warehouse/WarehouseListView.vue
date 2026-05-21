<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'
import {
  Search,
  Plus,
  Warehouse,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const inventoryStore = useInventoryStore()

const searchQuery = ref('')
const selectedWarehouseIds = ref<string[]>([])
const errorMessage = ref('')

const warehouses = computed(() => {
  let result = inventoryStore.warehouses

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(w =>
      w.name.toLowerCase().includes(query) ||
      w.address?.toLowerCase().includes(query)
    )
  }

  return result
})

const selectedWarehouseCount = computed(() => selectedWarehouseIds.value.length)

function isWarehouseSelected(warehouseId: string) {
  return selectedWarehouseIds.value.includes(warehouseId)
}

function toggleWarehouseSelection(warehouseId: string) {
  if (isWarehouseSelected(warehouseId)) {
    selectedWarehouseIds.value = selectedWarehouseIds.value.filter(id => id !== warehouseId)
  } else {
    selectedWarehouseIds.value = [...selectedWarehouseIds.value, warehouseId]
  }
}

function clearSelectedWarehouses() {
  selectedWarehouseIds.value = []
}

async function deleteWarehouse(id: string) {
  if (authStore.isActivitySessionExpired) return
  if (confirm('Yakin hapus gudang ini?')) {
    try {
      errorMessage.value = ''
      await inventoryStore.deleteWarehouse(id)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Gagal menghapus gudang'
    }
  }
}

async function bulkArchiveWarehouses() {
  if (authStore.isActivitySessionExpired || selectedWarehouseIds.value.length === 0) return
  if (!confirm(`Arsipkan ${selectedWarehouseIds.value.length} gudang terpilih?`)) return
  try {
    errorMessage.value = ''
    await inventoryStore.bulkArchiveWarehouses(selectedWarehouseIds.value)
    clearSelectedWarehouses()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal mengarsipkan gudang'
  }
}
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div v-if="authStore.isActivitySessionExpired" class="flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4 text-warning-800">
      <div>
        <p class="font-semibold">Aksi gudang terkunci</p>
        <p class="text-sm">Anda masih bisa melihat data, tetapi perubahan menunggu sesi aktivitas aktif kembali.</p>
      </div>
    </div>

    <div v-if="selectedWarehouseCount > 0" class="flex flex-col gap-3 rounded-xl border border-primary-100 bg-primary-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="font-semibold text-primary-900">{{ selectedWarehouseCount }} gudang dipilih</p>
        <p class="text-sm text-primary-700">Arsipkan banyak gudang dalam satu langkah.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn-secondary" :disabled="inventoryStore.isLoading || authStore.isActivitySessionExpired" @click="bulkArchiveWarehouses">
          Arsipkan terpilih
        </button>
        <button class="btn-ghost" @click="clearSelectedWarehouses">
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
          placeholder="Cari gudang..."
          class="input pl-9"
        />
      </div>
      <router-link to="/app/warehouses/new" class="btn-primary">
        <Plus class="w-4 h-4" />
        Tambah Gudang
      </router-link>
    </div>

    <!-- Warehouse Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="warehouse in warehouses"
        :key="warehouse.id"
        class="card-hover flex flex-col p-5"
      >
        <div class="flex items-start gap-3">
          <input
            class="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600"
            type="checkbox"
            :checked="isWarehouseSelected(warehouse.id)"
            @click.stop
            @change="toggleWarehouseSelection(warehouse.id)"
          />
          <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Warehouse class="w-6 h-6 text-primary-600" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="truncate font-semibold text-neutral-900">{{ warehouse.name }}</h3>
            <div v-if="warehouse.is_default" class="mt-2">
              <span class="badge-primary">Gudang Utama</span>
            </div>
          </div>
        </div>

        <div v-if="warehouse.address" class="mt-4 flex flex-1 items-start gap-2 text-sm text-neutral-500">
          <MapPin class="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{{ warehouse.address }}</span>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-2">
          <button
            class="btn-secondary btn-sm justify-center"
            :disabled="authStore.isActivitySessionExpired"
            @click="router.push({ name: 'warehouse-edit', params: { id: warehouse.id } })"
          >
            <Pencil class="w-4 h-4" />
            Edit
          </button>
          <button
            class="btn-secondary btn-sm justify-center text-danger-600"
            :disabled="authStore.isActivitySessionExpired"
            @click="deleteWarehouse(warehouse.id)"
          >
            <Trash2 class="w-4 h-4" />
            Hapus
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="warehouses.length === 0" class="card p-12 text-center">
      <Warehouse class="w-16 h-16 text-neutral-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-neutral-900 mb-2">Tidak ada gudang</h3>
      <p class="text-neutral-500 mb-4">Tambahkan gudang pertama kamu</p>
      <router-link to="/app/warehouses/new" class="btn-primary">
        <Plus class="w-4 h-4" />
        Tambah Gudang
      </router-link>
    </div>
  </div>
</template>
