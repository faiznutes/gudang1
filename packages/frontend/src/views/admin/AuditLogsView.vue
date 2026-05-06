<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
} from 'lucide-vue-next'
import adminService, { type AuditLog } from '@/services/api/admin'

const auditLogs = ref<AuditLog[]>([])
const searchQuery = ref('')
const categoryFilter = ref('all')
const currentPage = ref(1)
const totalPages = ref(1)
const totalLogs = ref(0)
const loading = ref(true)
const errorMessage = ref('')
const showDetailModal = ref(false)
const selectedLog = ref<AuditLog | null>(null)
const itemsPerPage = 10

const pageStart = computed(() => totalLogs.value === 0 ? 0 : (currentPage.value - 1) * itemsPerPage + 1)
const pageEnd = computed(() => Math.min(currentPage.value * itemsPerPage, totalLogs.value))
const categoryStats = computed(() => {
  return auditLogs.value.reduce<Record<string, number>>((stats, log) => {
    stats[log.category] = (stats[log.category] ?? 0) + 1
    return stats
  }, { user: 0, workspace: 0, subscription: 0, system: 0, security: 0 })
})

async function loadLogs(page = currentPage.value) {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await adminService.getAllAuditLogs({
      page,
      q: searchQuery.value,
      category: categoryFilter.value,
    })
    auditLogs.value = response.data
    currentPage.value = response.meta.current_page
    totalPages.value = response.meta.total_pages
    totalLogs.value = response.meta.total
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Audit log gagal dimuat'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  loadLogs(1)
}

function openDetailModal(log: AuditLog) {
  selectedLog.value = log
  showDetailModal.value = true
}

function nextPage() {
  if (currentPage.value < totalPages.value) loadLogs(currentPage.value + 1)
}

function previousPage() {
  if (currentPage.value > 1) loadLogs(currentPage.value - 1)
}

function getActionIcon(action: string) {
  if (action.includes('create') || action.includes('seed')) return Plus
  if (action.includes('update') || action.includes('edit') || action.includes('changed')) return Edit
  if (action.includes('delete') || action.includes('cancel')) return Trash2
  if (action.includes('login')) return LogIn
  if (action.includes('logout')) return LogOut
  return Settings
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    user: 'User',
    workspace: 'Tenant',
    subscription: 'Subscription',
    system: 'Sistem',
    security: 'Keamanan',
  }
  return labels[category] ?? category
}

function getCategoryBadge(category: string) {
  const badges: Record<string, string> = {
    user: 'bg-primary-50 text-primary-700',
    workspace: 'bg-success-50 text-success-700',
    subscription: 'bg-warning-50 text-warning-700',
    system: 'bg-neutral-100 text-neutral-700',
    security: 'bg-danger-50 text-danger-700',
  }
  return badges[category] || 'bg-neutral-100 text-neutral-700'
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

function details(log: AuditLog) {
  if (!log.metadata) return `${log.entity_type}${log.entity_id ? ` #${log.entity_id}` : ''}`
  return Object.entries(log.metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(', ')
}

onMounted(() => loadLogs(1))
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-neutral-900">Audit Logs</h2>
        <p class="text-neutral-600">Riwayat aktivitas tenant dan operasi platform</p>
      </div>
      <div class="flex gap-3">
        <button class="btn-secondary" :disabled="loading" @click="loadLogs()">
          <RefreshCw :class="['h-4 w-4', loading ? 'animate-spin' : '']" />
          Refresh
        </button>
        <button class="btn-secondary" disabled>
          <Download class="h-4 w-4" />
          Export
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-danger-100 bg-danger-50 p-4 text-sm text-danger-700">
      {{ errorMessage }}
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <div class="card p-4 text-center">
        <p class="text-sm text-neutral-500">User</p>
        <p class="text-xl font-bold text-primary-600">{{ categoryStats.user }}</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-sm text-neutral-500">Tenant</p>
        <p class="text-xl font-bold text-success-600">{{ categoryStats.workspace }}</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-sm text-neutral-500">Subscription</p>
        <p class="text-xl font-bold text-warning-600">{{ categoryStats.subscription }}</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-sm text-neutral-500">Sistem</p>
        <p class="text-xl font-bold text-neutral-600">{{ categoryStats.system }}</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-sm text-neutral-500">Keamanan</p>
        <p class="text-xl font-bold text-danger-600">{{ categoryStats.security }}</p>
      </div>
    </div>

    <div class="card p-4">
      <div class="flex flex-col gap-4 md:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
          <input v-model="searchQuery" type="text" placeholder="Cari aksi, user, atau tenant" class="input w-full pl-10" @keyup.enter="applyFilters" />
        </div>
        <select v-model="categoryFilter" class="input w-full md:w-44" @change="applyFilters">
          <option value="all">Semua Kategori</option>
          <option value="user">User</option>
          <option value="workspace">Tenant</option>
          <option value="subscription">Subscription</option>
          <option value="system">Sistem</option>
          <option value="security">Keamanan</option>
        </select>
        <button class="btn-primary" @click="applyFilters">Cari</button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Aksi</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">User</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Tenant</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Kategori</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Detail</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Waktu</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr v-if="loading">
              <td colspan="7" class="px-4 py-10 text-center text-sm text-neutral-500">Memuat audit log...</td>
            </tr>
            <tr v-else-if="auditLogs.length === 0">
              <td colspan="7" class="px-4 py-10 text-center text-sm text-neutral-500">Audit log tidak ditemukan.</td>
            </tr>
            <template v-else>
              <tr v-for="log in auditLogs" :key="log.id" class="hover:bg-neutral-50">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
                      <component :is="getActionIcon(log.action)" class="h-4 w-4 text-neutral-600" />
                    </div>
                    <span class="text-sm font-medium text-neutral-900">{{ log.action }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <p class="text-sm text-neutral-900">{{ log.user?.name ?? 'System' }}</p>
                  <p class="text-xs text-neutral-500">{{ log.user?.email ?? '-' }}</p>
                </td>
                <td class="px-4 py-3 text-sm text-neutral-700">{{ log.workspace?.name ?? '-' }}</td>
                <td class="px-4 py-3">
                  <span :class="['rounded-full px-2 py-1 text-xs font-medium', getCategoryBadge(log.category)]">
                    {{ getCategoryLabel(log.category) }}
                  </span>
                </td>
                <td class="max-w-xs truncate px-4 py-3 text-sm text-neutral-600">{{ details(log) }}</td>
                <td class="px-4 py-3 text-sm text-neutral-500">{{ formatDate(log.created_at) }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end">
                    <button class="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-primary-600" @click="openDetailModal(log)">
                      <Eye class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between border-t border-neutral-100 px-4 py-3">
        <p class="text-sm text-neutral-500">Menampilkan {{ pageStart }} - {{ pageEnd }} dari {{ totalLogs }} log</p>
        <div class="flex items-center gap-2">
          <button class="rounded-lg p-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50" :disabled="currentPage === 1" @click="previousPage">
            <ChevronLeft class="h-4 w-4" />
          </button>
          <span class="text-sm text-neutral-700">Halaman {{ currentPage }} dari {{ totalPages }}</span>
          <button class="rounded-lg p-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50" :disabled="currentPage === totalPages" @click="nextPage">
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDetailModal && selectedLog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-neutral-200 p-4">
          <h3 class="text-lg font-semibold text-neutral-900">Detail Audit Log</h3>
          <button class="rounded-lg p-1 hover:bg-neutral-100" @click="showDetailModal = false">x</button>
        </div>
        <div class="space-y-4 p-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs uppercase tracking-wider text-neutral-500">Aksi</p>
              <p class="text-sm font-medium text-neutral-900">{{ selectedLog.action }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wider text-neutral-500">Kategori</p>
              <span :class="['rounded-full px-2 py-1 text-xs font-medium', getCategoryBadge(selectedLog.category)]">
                {{ getCategoryLabel(selectedLog.category) }}
              </span>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wider text-neutral-500">User</p>
              <p class="text-sm text-neutral-900">{{ selectedLog.user?.name ?? 'System' }}</p>
              <p class="text-xs text-neutral-500">{{ selectedLog.user?.email ?? '-' }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wider text-neutral-500">Tenant</p>
              <p class="text-sm text-neutral-900">{{ selectedLog.workspace?.name ?? '-' }}</p>
            </div>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wider text-neutral-500">Detail</p>
            <p class="text-sm text-neutral-700">{{ details(selectedLog) }}</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs uppercase tracking-wider text-neutral-500">IP Address</p>
              <p class="font-mono text-sm text-neutral-700">{{ selectedLog.ip_address ?? '-' }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wider text-neutral-500">Waktu</p>
              <p class="text-sm text-neutral-700">{{ formatDate(selectedLog.created_at) }}</p>
            </div>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wider text-neutral-500">User Agent</p>
            <p class="rounded bg-neutral-50 p-2 font-mono text-xs text-neutral-600">{{ selectedLog.user_agent ?? '-' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
