<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Ban,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Users,
  Warehouse,
} from 'lucide-vue-next'
import adminService, { type AdminPlan, type Workspace, type WorkspaceStatus, type WorkspaceSummary } from '@/services/api/admin'
import { labelFrom, planLabels, roleLabels, subscriptionStatusLabels, workspaceStatusLabels } from '@/lib/labels'

const workspaces = ref<Workspace[]>([])
const summary = ref<WorkspaceSummary | null>(null)
const searchQuery = ref('')
const planFilter = ref('all')
const statusFilter = ref('all')
const currentPage = ref(1)
const totalPages = ref(1)
const totalWorkspaces = ref(0)
const loading = ref(true)
const summaryLoading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const showDetailModal = ref(false)
const showEditModal = ref(false)
const showCreateModal = ref(false)
const selectedWorkspace = ref<Workspace | null>(null)
const formData = ref<{ name: string; plan: AdminPlan; status: WorkspaceStatus }>({
  name: '',
  plan: 'free',
  status: 'active',
})
const createStep = ref(1)
const tenantForm = ref({
  name: '',
  plan: 'starter' as AdminPlan,
  status: 'active' as WorkspaceStatus,
  subscription_status: 'active' as 'active' | 'trialing',
  current_period_start: formatDateTimeLocal(new Date()),
  current_period_end: formatDateTimeLocal(addMonths(new Date(), 1)),
  owner: { name: '', email: '', password: 'password123' },
  warehouse: { name: 'Gudang Utama', address: '' },
  staff: [] as Array<{ name: string; email: string; password: string; role: 'admin' | 'staff' | 'supplier' }>,
  suppliers: [] as Array<{ name: string; contact_person: string; phone: string; email: string; address: string; notes: string }>,
})
const itemsPerPage = 10

const pageStart = computed(() => totalWorkspaces.value === 0 ? 0 : (currentPage.value - 1) * itemsPerPage + 1)
const pageEnd = computed(() => Math.min(currentPage.value * itemsPerPage, totalWorkspaces.value))
const totalMRR = computed(() => workspaces.value.reduce((sum, workspace) => sum + (workspace.mrr ?? 0), 0))
const activeCount = computed(() => workspaces.value.filter(workspace => workspace.status === 'active').length)
const trialCount = computed(() => workspaces.value.filter(workspace => workspace.status === 'trial').length)

async function loadWorkspaces(page = currentPage.value) {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await adminService.getWorkspaces(page, {
      q: searchQuery.value,
      plan: planFilter.value,
      status: statusFilter.value,
    })
    workspaces.value = response.data
    currentPage.value = response.meta.current_page
    totalPages.value = response.meta.total_pages
    totalWorkspaces.value = response.meta.total
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Data tenant gagal dimuat'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  loadWorkspaces(1)
}

async function openDetailModal(workspace: Workspace) {
  selectedWorkspace.value = workspace
  summary.value = null
  showDetailModal.value = true
  summaryLoading.value = true
  try {
    summary.value = await adminService.getWorkspaceSummary(workspace.id)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Ringkasan tenant gagal dimuat'
  } finally {
    summaryLoading.value = false
  }
}

function openEditModal(workspace: Workspace) {
  selectedWorkspace.value = workspace
  formData.value = {
    name: workspace.name,
    plan: workspace.plan,
    status: workspace.status,
  }
  showEditModal.value = true
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function formatDateTimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function openCreateModal() {
  createStep.value = 1
  tenantForm.value = {
    name: '',
    plan: 'starter',
    status: 'active',
    subscription_status: 'active',
    current_period_start: formatDateTimeLocal(new Date()),
    current_period_end: formatDateTimeLocal(addMonths(new Date(), 1)),
    owner: { name: '', email: '', password: 'password123' },
    warehouse: { name: 'Gudang Utama', address: '' },
    staff: [],
    suppliers: [],
  }
  showCreateModal.value = true
}

function addStaffRow() {
  tenantForm.value.staff.push({ name: '', email: '', password: 'password123', role: 'staff' })
}

function removeStaffRow(index: number) {
  tenantForm.value.staff.splice(index, 1)
}

function addSupplierRow() {
  tenantForm.value.suppliers.push({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' })
}

function removeSupplierRow(index: number) {
  tenantForm.value.suppliers.splice(index, 1)
}

async function createTenant() {
  saving.value = true
  errorMessage.value = ''
  try {
    await adminService.createWorkspace({
      name: tenantForm.value.name,
      plan: tenantForm.value.plan,
      status: tenantForm.value.status,
      subscription_status: tenantForm.value.subscription_status,
      current_period_start: new Date(tenantForm.value.current_period_start).toISOString(),
      current_period_end: new Date(tenantForm.value.current_period_end).toISOString(),
      owner: tenantForm.value.owner,
      warehouse: tenantForm.value.warehouse,
      staff: tenantForm.value.staff,
      suppliers: tenantForm.value.suppliers.filter(supplier => supplier.name.trim()),
    })
    showCreateModal.value = false
    await loadWorkspaces(1)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Tenant gagal dibuat'
  } finally {
    saving.value = false
  }
}

async function saveWorkspace() {
  if (!selectedWorkspace.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await adminService.updateWorkspace(selectedWorkspace.value.id, formData.value)
    showEditModal.value = false
    await loadWorkspaces()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Tenant gagal disimpan'
  } finally {
    saving.value = false
  }
}

async function setWorkspaceStatus(workspace: Workspace, status: 'active' | 'suspended') {
  const action = status === 'active' ? 'mengaktifkan' : 'menangguhkan'
  if (!confirm(`Yakin ingin ${action} tenant ${workspace.name}?`)) return
  saving.value = true
  errorMessage.value = ''
  try {
    if (status === 'active') await adminService.activateWorkspace(workspace.id)
    else await adminService.suspendWorkspace(workspace.id)
    await loadWorkspaces()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Status tenant gagal diperbarui'
  } finally {
    saving.value = false
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) loadWorkspaces(currentPage.value + 1)
}

function previousPage() {
  if (currentPage.value > 1) loadWorkspaces(currentPage.value - 1)
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr))
}

function getPlanBadge(plan: string) {
  const badges: Record<string, string> = {
    free: 'bg-neutral-100 text-neutral-700',
    starter: 'bg-primary-50 text-primary-700',
    growth: 'bg-warning-50 text-warning-700',
    pro: 'bg-purple-50 text-purple-700',
    custom: 'bg-danger-50 text-danger-700',
  }
  return badges[plan] || 'bg-neutral-100 text-neutral-700'
}

function getStatusBadge(status: string) {
  const badges: Record<string, string> = {
    active: 'bg-success-50 text-success-700',
    trial: 'bg-warning-50 text-warning-700',
    suspended: 'bg-danger-50 text-danger-700',
  }
  return badges[status] || 'bg-neutral-100 text-neutral-700'
}

onMounted(() => loadWorkspaces(1))
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-neutral-900">Kelola Tenant</h2>
        <p class="text-neutral-600">Pantau tenant, pemilik, pemakaian, dan status operasional</p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row">
        <button class="btn-primary" @click="openCreateModal">
          <Plus class="h-4 w-4" />
          Tambah Tenant
        </button>
        <button class="btn-secondary" :disabled="loading" @click="loadWorkspaces()">
          <RefreshCw :class="['h-4 w-4', loading ? 'animate-spin' : '']" />
          Refresh
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-danger-100 bg-danger-50 p-4 text-sm text-danger-700">
      {{ errorMessage }}
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div class="card p-4">
        <p class="text-sm text-neutral-500">Tenant halaman ini</p>
        <p class="text-2xl font-bold text-neutral-900">{{ workspaces.length }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-neutral-500">Aktif</p>
        <p class="text-2xl font-bold text-success-600">{{ activeCount }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-neutral-500">Trial</p>
        <p class="text-2xl font-bold text-warning-600">{{ trialCount }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-neutral-500">MRR halaman ini</p>
        <p class="text-2xl font-bold text-purple-600">{{ formatCurrency(totalMRR) }}</p>
      </div>
    </div>

    <div class="card p-4">
      <div class="flex flex-col gap-4 md:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
          <input v-model="searchQuery" type="text" placeholder="Cari nama tenant" class="input w-full pl-10" @keyup.enter="applyFilters" />
        </div>
        <select v-model="planFilter" class="input w-full md:w-40" @change="applyFilters">
          <option value="all">Semua Paket</option>
          <option value="free">Gratis</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="pro">Pro</option>
          <option value="custom">Kustom</option>
        </select>
        <select v-model="statusFilter" class="input w-full md:w-44" @change="applyFilters">
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="trial">Trial</option>
          <option value="suspended">Ditangguhkan</option>
        </select>
        <button class="btn-primary" @click="applyFilters">Cari</button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Tenant</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Pemilik</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Paket</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Pemakaian</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">MRR</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Status</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Dibuat</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr v-if="loading">
              <td colspan="8" class="px-4 py-10 text-center text-sm text-neutral-500">Memuat data tenant...</td>
            </tr>
            <tr v-else-if="workspaces.length === 0">
              <td colspan="8" class="px-4 py-10 text-center text-sm text-neutral-500">Tenant tidak ditemukan.</td>
            </tr>
            <template v-else>
              <tr v-for="workspace in workspaces" :key="workspace.id" class="hover:bg-neutral-50">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100">
                      <Building2 class="h-4 w-4 text-primary-600" />
                    </div>
                    <div>
                      <p class="text-sm font-medium text-neutral-900">{{ workspace.name }}</p>
                      <p class="text-xs text-neutral-500">{{ workspace.id }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <p class="text-sm text-neutral-900">{{ workspace.owner_name ?? '-' }}</p>
                  <p class="text-xs text-neutral-500">{{ workspace.owner_email ?? '-' }}</p>
                </td>
                <td class="px-4 py-3">
                  <span :class="['rounded-full px-2 py-1 text-xs font-medium', getPlanBadge(workspace.plan)]">
                    {{ labelFrom(planLabels, workspace.plan) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3 text-xs text-neutral-500">
                    <span class="flex items-center gap-1"><Users class="h-3 w-3" /> {{ workspace.users ?? 0 }}</span>
                    <span class="flex items-center gap-1"><Package class="h-3 w-3" /> {{ workspace.products ?? 0 }}</span>
                    <span class="flex items-center gap-1"><Warehouse class="h-3 w-3" /> {{ workspace.warehouses ?? 0 }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm font-medium text-neutral-900">{{ formatCurrency(workspace.mrr ?? 0) }}</td>
                <td class="px-4 py-3">
                  <span :class="['rounded-full px-2 py-1 text-xs font-medium', getStatusBadge(workspace.status)]">
                    {{ labelFrom(workspaceStatusLabels, workspace.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-neutral-500">{{ formatDate(workspace.created_at) }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-2">
                    <button class="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-primary-600" title="Ringkasan tenant" @click="openDetailModal(workspace)">
                      <Eye class="h-4 w-4" />
                    </button>
                    <button class="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-primary-600" title="Ubah tenant" @click="openEditModal(workspace)">
                      <Save class="h-4 w-4" />
                    </button>
                    <button
                      v-if="workspace.status === 'suspended'"
                      class="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-success-600"
                      title="Aktifkan tenant"
                      @click="setWorkspaceStatus(workspace, 'active')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      v-else
                      class="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-danger-600"
                      title="Tangguhkan tenant"
                      @click="setWorkspaceStatus(workspace, 'suspended')"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between border-t border-neutral-100 px-4 py-3">
        <p class="text-sm text-neutral-500">Menampilkan {{ pageStart }} - {{ pageEnd }} dari {{ totalWorkspaces }} tenant</p>
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

    <div v-if="showDetailModal && selectedWorkspace" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-neutral-200 p-4">
          <h3 class="text-lg font-semibold text-neutral-900">Ringkasan Tenant</h3>
          <button class="rounded-lg p-1 hover:bg-neutral-100" @click="showDetailModal = false">x</button>
        </div>
        <div v-if="summaryLoading" class="p-8 text-center text-sm text-neutral-500">Memuat ringkasan tenant...</div>
        <div v-else-if="summary" class="space-y-5 p-4">
          <div class="flex flex-col gap-4 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 class="text-xl font-bold text-neutral-900">{{ summary.workspace.name }}</h4>
              <p class="text-sm text-neutral-500">Pemilik: {{ summary.workspace.owner_name }} · {{ summary.workspace.owner_email }}</p>
            </div>
            <span :class="['self-start rounded-full px-2 py-1 text-xs font-medium', getStatusBadge(summary.workspace.status)]">
              {{ labelFrom(workspaceStatusLabels, summary.workspace.status) }}
            </span>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-lg bg-neutral-50 p-3">
              <p class="text-xs uppercase text-neutral-500">User</p>
              <p class="text-xl font-bold text-neutral-900">{{ summary.usage.users }}</p>
            </div>
            <div class="rounded-lg bg-neutral-50 p-3">
              <p class="text-xs uppercase text-neutral-500">Produk</p>
              <p class="text-xl font-bold text-neutral-900">{{ summary.usage.products }}</p>
            </div>
            <div class="rounded-lg bg-neutral-50 p-3">
              <p class="text-xs uppercase text-neutral-500">Total Stok</p>
              <p class="text-xl font-bold text-neutral-900">{{ summary.usage.total_stock }}</p>
            </div>
            <div class="rounded-lg bg-neutral-50 p-3">
              <p class="text-xs uppercase text-neutral-500">Stok Rendah</p>
              <p class="text-xl font-bold text-warning-600">{{ summary.usage.low_stock_items }}</p>
            </div>
          </div>

          <div class="grid gap-5 lg:grid-cols-2">
            <section class="rounded-lg border border-neutral-100">
              <div class="border-b border-neutral-100 p-3 font-semibold text-neutral-900">User Tenant</div>
              <div class="divide-y divide-neutral-100">
                <div v-for="member in summary.users" :key="member.id" class="flex items-center justify-between p-3">
                  <div>
                    <p class="text-sm font-medium text-neutral-900">{{ member.user.name }}</p>
                    <p class="text-xs text-neutral-500">{{ member.user.email }}</p>
                  </div>
                  <span class="text-xs text-neutral-600">{{ labelFrom(roleLabels, member.role) }}</span>
                </div>
              </div>
            </section>

            <section class="rounded-lg border border-neutral-100">
              <div class="border-b border-neutral-100 p-3 font-semibold text-neutral-900">Subscription</div>
              <div class="p-3 text-sm text-neutral-700">
                <template v-if="summary.subscription">
                  <p>Paket: <span class="font-medium text-neutral-900">{{ labelFrom(planLabels, summary.subscription.plan) }}</span></p>
                  <p>Status: <span class="font-medium text-neutral-900">{{ labelFrom(subscriptionStatusLabels, summary.subscription.status) }}</span></p>
                  <p>Periode: {{ formatDate(summary.subscription.current_period_start) }} - {{ formatDate(summary.subscription.current_period_end) }}</p>
                  <p>MRR: {{ formatCurrency(summary.subscription.amount) }}</p>
                </template>
                <p v-else>Tenant belum memiliki subscription.</p>
              </div>
            </section>
          </div>

          <section class="rounded-lg border border-neutral-100">
            <div class="border-b border-neutral-100 p-3 font-semibold text-neutral-900">Audit Terbaru</div>
            <div v-if="summary.recent_audit_logs.length === 0" class="p-3 text-sm text-neutral-500">Belum ada audit log.</div>
            <div v-else class="divide-y divide-neutral-100">
              <div v-for="log in summary.recent_audit_logs" :key="log.id" class="flex items-center justify-between gap-3 p-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-neutral-900">{{ log.action }}</p>
                  <p class="text-xs text-neutral-500">{{ log.user?.name ?? 'System' }}</p>
                </div>
                <span class="text-xs text-neutral-500">{{ formatDate(log.created_at) }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <form class="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-2xl" @submit.prevent="createTenant">
        <div class="sticky top-0 z-10 border-b border-neutral-100 bg-white/95 p-4 backdrop-blur">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-neutral-900">Tambah Tenant Baru</h3>
              <p class="text-sm text-neutral-500">Setup tenant, owner, paket, gudang, staff, dan supplier awal.</p>
            </div>
            <button type="button" class="rounded-lg p-2 hover:bg-neutral-100" @click="showCreateModal = false">x</button>
          </div>
          <div class="mt-4 grid grid-cols-4 gap-2">
            <button
              v-for="step in [
                [1, 'Tenant'],
                [2, 'Owner'],
                [3, 'Gudang'],
                [4, 'Review'],
              ]"
              :key="step[0]"
              type="button"
              :class="['rounded-xl px-3 py-2 text-sm font-medium', createStep === step[0] ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600']"
              @click="createStep = Number(step[0])"
            >
              {{ step[1] }}
            </button>
          </div>
        </div>

        <div class="space-y-5 p-4 lg:p-6">
          <section v-if="createStep === 1" class="grid gap-4 lg:grid-cols-2">
            <div>
              <label class="label">Nama Tenant</label>
              <input v-model="tenantForm.name" class="input w-full" required placeholder="Contoh: Gudang Maju Bersama" />
            </div>
            <div>
              <label class="label">Paket</label>
              <select v-model="tenantForm.plan" class="input w-full">
                <option value="free">Gratis</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="pro">Pro</option>
                <option value="custom">Kustom</option>
              </select>
            </div>
            <div>
              <label class="label">Status Tenant</label>
              <select v-model="tenantForm.status" class="input w-full">
                <option value="active">Aktif</option>
                <option value="trial">Trial</option>
                <option value="suspended">Ditangguhkan</option>
              </select>
            </div>
            <div>
              <label class="label">Status Subscription</label>
              <select v-model="tenantForm.subscription_status" class="input w-full">
                <option value="active">Aktif</option>
                <option value="trialing">Trial</option>
              </select>
            </div>
            <div>
              <label class="label">Mulai Subscription</label>
              <input v-model="tenantForm.current_period_start" type="datetime-local" class="input w-full" required />
            </div>
            <div>
              <label class="label">Berakhir Subscription</label>
              <input v-model="tenantForm.current_period_end" type="datetime-local" class="input w-full" required />
            </div>
          </section>

          <section v-if="createStep === 2" class="space-y-5">
            <div class="grid gap-4 lg:grid-cols-3">
              <div>
                <label class="label">Nama Owner</label>
                <input v-model="tenantForm.owner.name" class="input w-full" required placeholder="Nama tenant admin" />
              </div>
              <div>
                <label class="label">Email Owner</label>
                <input v-model="tenantForm.owner.email" class="input w-full" type="email" required placeholder="owner@email.com" />
              </div>
              <div>
                <label class="label">Password Awal</label>
                <input v-model="tenantForm.owner.password" class="input w-full" type="text" required />
              </div>
            </div>

            <div class="rounded-2xl border border-neutral-100 p-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h4 class="font-semibold text-neutral-900">Staff Tenant</h4>
                  <p class="text-sm text-neutral-500">Staff hanya masuk ke tenant ini, tidak dibagikan ke tenant lain.</p>
                </div>
                <button type="button" class="btn-secondary btn-sm" @click="addStaffRow">
                  <Plus class="h-4 w-4" />
                  Tambah Staff
                </button>
              </div>
              <div class="mt-4 space-y-3">
                <div v-for="(staff, index) in tenantForm.staff" :key="index" class="grid gap-3 rounded-xl bg-neutral-50 p-3 lg:grid-cols-[1fr_1fr_120px_44px]">
                  <input v-model="staff.name" class="input" placeholder="Nama staff" required />
                  <input v-model="staff.email" class="input" type="email" placeholder="staff@email.com" required />
                  <select v-model="staff.role" class="input">
                    <option value="staff">Staff</option>
                    <option value="supplier">Supplier</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="button" class="rounded-lg p-2 text-danger-600 hover:bg-danger-50" @click="removeStaffRow(index)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
                <p v-if="tenantForm.staff.length === 0" class="text-sm text-neutral-500">Belum ada staff tambahan.</p>
              </div>
            </div>
          </section>

          <section v-if="createStep === 3" class="space-y-5">
            <div class="grid gap-4 lg:grid-cols-2">
              <div>
                <label class="label">Gudang Default</label>
                <input v-model="tenantForm.warehouse.name" class="input w-full" required />
              </div>
              <div>
                <label class="label">Alamat Gudang</label>
                <input v-model="tenantForm.warehouse.address" class="input w-full" placeholder="Alamat gudang utama" />
              </div>
            </div>
            <div class="rounded-2xl border border-neutral-100 p-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h4 class="font-semibold text-neutral-900">Supplier Awal</h4>
                  <p class="text-sm text-neutral-500">Supplier akan tersimpan hanya untuk tenant ini.</p>
                </div>
                <button type="button" class="btn-secondary btn-sm" @click="addSupplierRow">
                  <Plus class="h-4 w-4" />
                  Tambah Supplier
                </button>
              </div>
              <div class="mt-4 space-y-3">
                <div v-for="(supplier, index) in tenantForm.suppliers" :key="index" class="grid gap-3 rounded-xl bg-neutral-50 p-3 lg:grid-cols-[1fr_1fr_1fr_44px]">
                  <input v-model="supplier.name" class="input" placeholder="Nama supplier" required />
                  <input v-model="supplier.contact_person" class="input" placeholder="PIC" />
                  <input v-model="supplier.phone" class="input" placeholder="Telepon" />
                  <button type="button" class="rounded-lg p-2 text-danger-600 hover:bg-danger-50" @click="removeSupplierRow(index)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                  <input v-model="supplier.email" class="input lg:col-span-2" type="email" placeholder="email@supplier.com" />
                  <input v-model="supplier.address" class="input lg:col-span-2" placeholder="Alamat supplier" />
                </div>
                <p v-if="tenantForm.suppliers.length === 0" class="text-sm text-neutral-500">Belum ada supplier awal.</p>
              </div>
            </div>
          </section>

          <section v-if="createStep === 4" class="grid gap-4 lg:grid-cols-2">
            <div class="rounded-2xl bg-primary-50 p-4">
              <p class="text-sm text-primary-700">Tenant</p>
              <p class="text-xl font-bold text-primary-950">{{ tenantForm.name || 'Nama tenant belum diisi' }}</p>
              <p class="mt-2 text-sm text-primary-700">{{ labelFrom(planLabels, tenantForm.plan) }} - {{ tenantForm.subscription_status }}</p>
            </div>
            <div class="rounded-2xl bg-neutral-50 p-4">
              <p class="text-sm text-neutral-500">Owner</p>
              <p class="text-lg font-semibold text-neutral-900">{{ tenantForm.owner.name || '-' }}</p>
              <p class="text-sm text-neutral-600">{{ tenantForm.owner.email || '-' }}</p>
            </div>
            <div class="rounded-2xl bg-neutral-50 p-4">
              <p class="text-sm text-neutral-500">Gudang</p>
              <p class="text-lg font-semibold text-neutral-900">{{ tenantForm.warehouse.name }}</p>
              <p class="text-sm text-neutral-600">{{ tenantForm.warehouse.address || '-' }}</p>
            </div>
            <div class="rounded-2xl bg-neutral-50 p-4">
              <p class="text-sm text-neutral-500">Setup Awal</p>
              <p class="text-lg font-semibold text-neutral-900">{{ tenantForm.staff.length }} staff, {{ tenantForm.suppliers.length }} supplier</p>
              <p class="text-sm text-neutral-600">{{ formatDate(tenantForm.current_period_start) }} - {{ formatDate(tenantForm.current_period_end) }}</p>
            </div>
          </section>
        </div>

        <div class="sticky bottom-0 flex items-center justify-between gap-3 border-t border-neutral-100 bg-white p-4">
          <button type="button" class="btn-secondary" :disabled="createStep === 1" @click="createStep = Math.max(1, createStep - 1)">Kembali</button>
          <div class="flex gap-2">
            <button v-if="createStep < 4" type="button" class="btn-primary" @click="createStep = Math.min(4, createStep + 1)">Lanjut</button>
            <button v-else type="submit" class="btn-primary" :disabled="saving">
              <Save class="h-4 w-4" />
              Buat Tenant
            </button>
          </div>
        </div>
      </form>
    </div>

    <div v-if="showEditModal && selectedWorkspace" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div class="border-b border-neutral-200 p-4">
          <h3 class="text-lg font-semibold text-neutral-900">Ubah Tenant</h3>
        </div>
        <div class="space-y-4 p-4">
          <div>
            <label class="label">Nama Tenant</label>
            <input v-model="formData.name" class="input w-full" type="text" />
          </div>
          <div>
            <label class="label">Paket</label>
            <select v-model="formData.plan" class="input w-full">
              <option value="free">Gratis</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Pro</option>
              <option value="custom">Kustom</option>
            </select>
          </div>
          <div>
            <label class="label">Status</label>
            <select v-model="formData.status" class="input w-full">
              <option value="active">Aktif</option>
              <option value="trial">Trial</option>
              <option value="suspended">Ditangguhkan</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-3 border-t border-neutral-200 p-4">
          <button class="btn-secondary" @click="showEditModal = false">Batal</button>
          <button class="btn-primary" :disabled="saving" @click="saveWorkspace">
            <Save class="h-4 w-4" />
            Simpan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
