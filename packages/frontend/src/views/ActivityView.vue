<script setup lang="ts">
import { ref, computed } from 'vue'
import { useActivityStore } from '@/stores/activity'
import { Search, TrendingUp, TrendingDown, Package, ArrowLeftRight, User } from 'lucide-vue-next'

const activityStore = useActivityStore()

const searchQuery = ref('')
const selectedType = ref('')
const selectedDate = ref('')

const activities = computed(() => {
  let result = [...activityStore.activities]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(a =>
      a.product_name.toLowerCase().includes(query) ||
      a.product_sku.toLowerCase().includes(query) ||
      a.user_name.toLowerCase().includes(query)
    )
  }

  if (selectedType.value) {
    result = result.filter(a => a.type === selectedType.value)
  }

  if (selectedDate.value) {
    const today = new Date()
    const filterDate = new Date()
    
    if (selectedDate.value === 'today') {
      filterDate.setHours(0, 0, 0, 0)
      result = result.filter(a => new Date(a.created_at) >= filterDate)
    } else if (selectedDate.value === 'week') {
      filterDate.setDate(today.getDate() - 7)
      result = result.filter(a => new Date(a.created_at) >= filterDate)
    } else if (selectedDate.value === 'month') {
      filterDate.setMonth(today.getMonth() - 1)
      result = result.filter(a => new Date(a.created_at) >= filterDate)
    }
  }

  return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
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
            placeholder="Cari aktivitas..."
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
        <select v-model="selectedDate" class="input w-auto">
          <option value="">Semua Waktu</option>
          <option value="today">Hari Ini</option>
          <option value="week">Minggu Ini</option>
          <option value="month">Bulan Ini</option>
        </select>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
            <TrendingUp class="w-5 h-5 text-success-600" />
          </div>
          <div>
            <p class="text-xs text-neutral-500">Stock Masuk</p>
            <p class="text-xl font-bold text-neutral-900">{{ activityStore.totalStockIn }}</p>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center">
            <TrendingDown class="w-5 h-5 text-danger-600" />
          </div>
          <div>
            <p class="text-xs text-neutral-500">Stock Keluar</p>
            <p class="text-xl font-bold text-neutral-900">{{ activityStore.totalStockOut }}</p>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <ArrowLeftRight class="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p class="text-xs text-neutral-500">Total Transfer</p>
            <p class="text-xl font-bold text-neutral-900">
              {{ activityStore.activities.filter(a => a.type === 'transfer').length }}
            </p>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
            <User class="w-5 h-5 text-neutral-600" />
          </div>
          <div>
            <p class="text-xs text-neutral-500">Total Aktivitas</p>
            <p class="text-xl font-bold text-neutral-900">{{ activityStore.activities.length }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity List -->
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
              activity.type === 'in' ? 'bg-success-100' : 
              activity.type === 'out' ? 'bg-danger-100' : 'bg-primary-100'
            ]"
          >
            <TrendingUp v-if="activity.type === 'in'" class="w-5 h-5 text-success-600" />
            <TrendingDown v-else-if="activity.type === 'out'" class="w-5 h-5 text-danger-600" />
            <ArrowLeftRight v-else class="w-5 h-5 text-primary-600" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="font-medium text-neutral-900">{{ activity.product_name }}</p>
              <span
                :class="[
                  'badge text-xs',
                  activity.type === 'in' ? 'badge-success' : 
                  activity.type === 'out' ? 'badge-danger' : 'badge-primary'
                ]"
              >
                {{ getTypeLabel(activity.type) }}
              </span>
            </div>
            <p class="text-sm text-neutral-500">
              {{ activity.warehouse_name }}
              <span v-if="activity.to_warehouse_name"> → {{ activity.to_warehouse_name }}</span>
              · {{ activity.notes || '-' }}
            </p>
          </div>
          <div class="text-right">
            <p :class="['font-semibold', activity.type === 'in' ? 'text-success-600' : activity.type === 'out' ? 'text-danger-600' : 'text-primary-600']">
              {{ activity.type === 'in' ? '+' : activity.type === 'out' ? '-' : '→' }}{{ activity.quantity }}
            </p>
            <p class="text-xs text-neutral-500">{{ formatDate(activity.created_at) }}</p>
            <p class="text-xs text-neutral-400">{{ activity.user_name }}</p>
          </div>
        </div>

        <div v-if="activities.length === 0" class="p-12 text-center">
          <Package class="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-neutral-900 mb-2">Tidak ada aktivitas</h3>
          <p class="text-neutral-500">Aktivitas akan muncul di sini</p>
        </div>
      </div>
    </div>
  </div>
</template>