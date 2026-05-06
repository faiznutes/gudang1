<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSupplierStore } from '@/stores/supplier'
import { Search, Plus, User, Phone, Mail, MapPin, Pencil, Trash2, MoreVertical } from 'lucide-vue-next'

const router = useRouter()
const supplierStore = useSupplierStore()

const searchQuery = ref('')
const activeDropdown = ref<string | null>(null)

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

function toggleDropdown(id: string) {
  activeDropdown.value = activeDropdown.value === id ? null : id
}

async function deleteSupplier(id: string) {
  if (confirm('Yakin hapus supplier ini?')) {
    await supplierStore.deleteSupplier(id)
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
        class="card-hover p-5"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <User class="w-6 h-6 text-warning-600" />
          </div>
          <div class="relative">
            <button
              @click="toggleDropdown(supplier.id)"
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
                v-if="activeDropdown === supplier.id"
                class="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-dropdown border border-neutral-100 py-1 z-10"
              >
                <button
                  @click="router.push({ name: 'supplier-edit', params: { id: supplier.id } })"
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  <Pencil class="w-4 h-4" />
                  Edit
                </button>
                <button
                  @click="deleteSupplier(supplier.id)"
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                >
                  <Trash2 class="w-4 h-4" />
                  Hapus
                </button>
              </div>
            </transition>
          </div>
        </div>

        <h3 class="font-semibold text-neutral-900 mt-4">{{ supplier.name }}</h3>
        <p v-if="supplier.contact_person" class="text-sm text-neutral-500 mt-1">
          {{ supplier.contact_person }}
        </p>

        <div class="mt-3 space-y-2">
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
