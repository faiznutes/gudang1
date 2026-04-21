<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import {
  Search,
  Plus,
  Warehouse,
  MapPin,
  Pencil,
  Trash2,
  MoreVertical,
} from 'lucide-vue-next'

const router = useRouter()
const inventoryStore = useInventoryStore()

const searchQuery = ref('')
const activeDropdown = ref<string | null>(null)

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

function toggleDropdown(id: string) {
  activeDropdown.value = activeDropdown.value === id ? null : id
}

function deleteWarehouse(id: string) {
  if (confirm('Yakin hapus gudang ini?')) {
    inventoryStore.deleteWarehouse(id)
  }
  activeDropdown.value = null
}
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
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
      <router-link :to="{ name: 'warehouse-new' }" class="btn-primary">
        <Plus class="w-4 h-4" />
        Tambah Gudang
      </router-link>
    </div>

    <!-- Warehouse Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="warehouse in warehouses"
        :key="warehouse.id"
        class="card-hover p-5 relative"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Warehouse class="w-6 h-6 text-primary-600" />
          </div>
          <div class="relative">
            <button
              @click="toggleDropdown(warehouse.id)"
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
                v-if="activeDropdown === warehouse.id"
                class="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-dropdown border border-neutral-100 py-1 z-10"
              >
                <button
                  @click="router.push({ name: 'warehouse-edit', params: { id: warehouse.id } })"
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  <Pencil class="w-4 h-4" />
                  Edit
                </button>
                <button
                  @click="deleteWarehouse(warehouse.id)"
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                >
                  <Trash2 class="w-4 h-4" />
                  Hapus
                </button>
              </div>
            </transition>
          </div>
        </div>

        <h3 class="font-semibold text-neutral-900 mt-4">{{ warehouse.name }}</h3>
        <div v-if="warehouse.address" class="flex items-start gap-2 mt-2 text-sm text-neutral-500">
          <MapPin class="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{{ warehouse.address }}</span>
        </div>
        <div v-if="warehouse.is_default" class="mt-3">
          <span class="badge-primary">Gudang Utama</span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="warehouses.length === 0" class="card p-12 text-center">
      <Warehouse class="w-16 h-16 text-neutral-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-neutral-900 mb-2">Tidak ada gudang</h3>
      <p class="text-neutral-500 mb-4">Tambahkan gudang pertama kamu</p>
      <router-link :to="{ name: 'warehouse-new' }" class="btn-primary">
        <Plus class="w-4 h-4" />
        Tambah Gudang
      </router-link>
    </div>
  </div>
</template>