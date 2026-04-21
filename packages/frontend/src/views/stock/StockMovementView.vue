<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useActivityStore } from '@/stores/activity'
import { Search, ArrowLeftRight } from 'lucide-vue-next'

const inventoryStore = useInventoryStore()
const activityStore = useActivityStore()

const searchQuery = ref('')
const selectedType = ref('')
const selectedWarehouse = ref('')

const activities = computed(() => {
  let result = [...activityStore.activities]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(a =>
      a.product_name.toLowerCase().includes(query) ||
      a.product_sku.toLowerCase().includes(query)
    )
  }

  if (selectedType.value) {
    result = result.filter(a => a.type === selectedType.value)
  }

  if (selectedWarehouse.value) {
    result = result.filter(a => a.warehouse_id === selectedWarehouse.value)
  }

  return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
})

const warehouses = computed(() => inventoryStore.warehouses)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    in: 'Masuk',
    out: 'Keluar',
    transfer: 'Transfer',
  }
  return labels[type] || type
}
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
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
      </div>
      <div class="flex gap-2">
        <select v-model="selectedType" class="input w-auto">
          <option value="">Semua Tipe</option>
          <option value="in">Stock Masuk</option>
          <option value="out">Stock Keluar</option>
          <option value="transfer">Transfer</option>
        </select>
        <select v-model="selectedWarehouse" class="input w-auto">
          <option value="">Semua Gudang</option>
          <option v-for="w in warehouses" :key="w.id" :value="w.id">
            {{ w.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Activity List -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-neutral-100">
              <th class="table-header">Produk</th>
              <th class="table-header">Tipe</th>
              <th class="table-header">Gudang</th>
              <th class="table-header">Jumlah</th>
              <th class="table-header">User</th>
              <th class="table-header">Waktu</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr
              v-for="activity in activities"
              :key="activity.id"
              class="hover:bg-neutral-50 transition-colors"
            >
              <td class="table-cell">
                <div>
                  <p class="font-medium text-neutral-900">{{ activity.product_name }}</p>
                  <p class="text-xs text-neutral-500">{{ activity.product_sku }}</p>
                </div>
              </td>
              <td class="table-cell">
                <span
                  :class="[
                    'badge',
                    activity.type === 'in' ? 'badge-success' :
                    activity.type === 'out' ? 'badge-danger' : 'badge-primary'
                  ]"
                >
                  {{ getTypeLabel(activity.type) }}
                </span>
              </td>
              <td class="table-cell">
                <div>
                  <p class="text-neutral-900">{{ activity.warehouse_name }}</p>
                  <p v-if="activity.to_warehouse_name" class="text-xs text-neutral-500">
                    → {{ activity.to_warehouse_name }}
                  </p>
                </div>
              </td>
              <td class="table-cell">
                <span
                  :class="[
                    'font-semibold',
                    activity.type === 'in' ? 'text-success-600' :
                    activity.type === 'out' ? 'text-danger-600' : 'text-primary-600'
                  ]"
                >
                  {{ activity.type === 'in' ? '+' : activity.type === 'out' ? '-' : '→' }}{{ activity.quantity }}
                </span>
              </td>
              <td class="table-cell text-neutral-500">
                {{ activity.user_name }}
              </td>
              <td class="table-cell text-neutral-500">
                {{ formatDate(activity.created_at) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-if="activities.length === 0" class="p-12 text-center">
        <ArrowLeftRight class="w-16 h-16 text-neutral-300 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-neutral-900 mb-2">Tidak ada aktivitas</h3>
        <p class="text-neutral-500">Aktivitas stock akan muncul di sini</p>
      </div>
    </div>
  </div>
</template>