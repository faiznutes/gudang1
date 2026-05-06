<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Building2, ChevronLeft, ChevronRight, Eye, RefreshCw, Save, Search, Shield, Trash2, UserCog } from 'lucide-vue-next'
import adminService, { type AdminRole, type WorkspaceUser } from '@/services/api/admin'
import { labelFrom, planLabels, roleLabels, workspaceStatusLabels } from '@/lib/labels'

const users = ref<WorkspaceUser[]>([])
const searchQuery = ref('')
const roleFilter = ref('all')
const statusFilter = ref('all')
const currentPage = ref(1)
const totalPages = ref(1)
const totalUsers = ref(0)
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const selectedUser = ref<WorkspaceUser | null>(null)
const showDetailModal = ref(false)
const showRoleModal = ref(false)
const roleDraft = ref<AdminRole>('staff')
const itemsPerPage = 10

const pageStart = computed(() => totalUsers.value === 0 ? 0 : (currentPage.value - 1) * itemsPerPage + 1)
const pageEnd = computed(() => Math.min(currentPage.value * itemsPerPage, totalUsers.value))

async function loadUsers(page = currentPage.value) {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await adminService.getPlatformUsers({
      page,
      q: searchQuery.value,
      role: roleFilter.value,
      status: statusFilter.value,
    })
    users.value = response.data
    currentPage.value = response.meta.current_page
    totalPages.value = response.meta.total_pages
    totalUsers.value = response.meta.total
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Data user gagal dimuat'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  loadUsers(1)
}

function openDetailModal(user: WorkspaceUser) {
  selectedUser.value = user
  showDetailModal.value = true
}

function openRoleModal(user: WorkspaceUser) {
  selectedUser.value = user
  roleDraft.value = user.role
  showRoleModal.value = true
}

async function saveRole() {
  if (!selectedUser.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await adminService.updateUserRole(selectedUser.value.workspace_id, selectedUser.value.user_id, roleDraft.value)
    showRoleModal.value = false
    await loadUsers()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Role user gagal disimpan'
  } finally {
    saving.value = false
  }
}

async function deleteUser(user: WorkspaceUser) {
  if (!confirm(`Hapus akses ${user.user.name} dari tenant ${user.workspace?.name ?? '-'}?`)) return
  saving.value = true
  errorMessage.value = ''
  try {
    await adminService.removeUser(user.workspace_id, user.user_id)
    await loadUsers()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Akses user gagal dihapus'
  } finally {
    saving.value = false
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) loadUsers(currentPage.value + 1)
}

function previousPage() {
  if (currentPage.value > 1) loadUsers(currentPage.value - 1)
}

function getRoleBadge(role: string) {
  const badges: Record<string, string> = {
    super_admin: 'bg-danger-50 text-danger-700',
    admin: 'bg-purple-50 text-purple-700',
    staff: 'bg-primary-50 text-primary-700',
    supplier: 'bg-warning-50 text-warning-700',
    trial: 'bg-neutral-100 text-neutral-700',
  }
  return badges[role] || 'bg-neutral-100 text-neutral-700'
}

function getStatusBadge(status?: string) {
  const badges: Record<string, string> = {
    active: 'bg-success-50 text-success-700',
    suspended: 'bg-danger-50 text-danger-700',
    trial: 'bg-warning-50 text-warning-700',
  }
  return badges[status ?? ''] || 'bg-neutral-100 text-neutral-700'
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr))
}

onMounted(() => loadUsers(1))
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-neutral-900">Kelola User</h2>
        <p class="text-neutral-600">Pantau user tenant dan role lintas workspace</p>
      </div>
      <button class="btn-secondary" :disabled="loading" @click="loadUsers()">
        <RefreshCw :class="['h-4 w-4', loading ? 'animate-spin' : '']" />
        Refresh
      </button>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-danger-100 bg-danger-50 p-4 text-sm text-danger-700">
      {{ errorMessage }}
    </div>

    <div class="card p-4">
      <div class="flex flex-col gap-4 md:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
          <input v-model="searchQuery" type="text" placeholder="Cari nama, email, atau tenant" class="input w-full pl-10" @keyup.enter="applyFilters" />
        </div>
        <select v-model="roleFilter" class="input w-full md:w-44" @change="applyFilters">
          <option value="all">Semua Role</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin Tenant</option>
          <option value="staff">Staff</option>
          <option value="supplier">Supplier</option>
          <option value="trial">Trial</option>
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
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">User</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Role</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Tenant</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Paket</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Status Tenant</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Bergabung</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr v-if="loading">
              <td colspan="7" class="px-4 py-10 text-center text-sm text-neutral-500">Memuat data user...</td>
            </tr>
            <tr v-else-if="users.length === 0">
              <td colspan="7" class="px-4 py-10 text-center text-sm text-neutral-500">Tidak ada user yang cocok.</td>
            </tr>
            <template v-else>
              <tr v-for="user in users" :key="user.id" class="hover:bg-neutral-50">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                      <span class="text-sm font-semibold text-purple-700">{{ user.user.name.charAt(0) }}</span>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-neutral-900">{{ user.user.name }}</p>
                      <p class="text-xs text-neutral-500">{{ user.user.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span :class="['rounded-full px-2 py-1 text-xs font-medium', getRoleBadge(user.role)]">
                    {{ labelFrom(roleLabels, user.role) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2 text-sm text-neutral-700">
                    <Building2 class="h-4 w-4 text-neutral-400" />
                    {{ user.workspace?.name ?? '-' }}
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-neutral-700">{{ labelFrom(planLabels, user.workspace?.plan) }}</td>
                <td class="px-4 py-3">
                  <span :class="['rounded-full px-2 py-1 text-xs font-medium', getStatusBadge(user.workspace?.status)]">
                    {{ labelFrom(workspaceStatusLabels, user.workspace?.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-neutral-500">{{ formatDate(user.created_at) }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-2">
                    <button class="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-primary-600" title="Lihat detail" @click="openDetailModal(user)">
                      <Eye class="h-4 w-4" />
                    </button>
                    <button class="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-primary-600" title="Ubah role" @click="openRoleModal(user)">
                      <Shield class="h-4 w-4" />
                    </button>
                    <button class="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-danger-600" title="Hapus akses" @click="deleteUser(user)">
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between border-t border-neutral-100 px-4 py-3">
        <p class="text-sm text-neutral-500">Menampilkan {{ pageStart }} - {{ pageEnd }} dari {{ totalUsers }} user</p>
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

    <div v-if="showDetailModal && selectedUser" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-neutral-200 p-4">
          <h3 class="text-lg font-semibold text-neutral-900">Detail User Tenant</h3>
          <button class="rounded-lg p-1 hover:bg-neutral-100" @click="showDetailModal = false">x</button>
        </div>
        <div class="space-y-4 p-4">
          <div class="flex items-center gap-4">
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
              <UserCog class="h-7 w-7 text-purple-600" />
            </div>
            <div>
              <h4 class="text-lg font-bold text-neutral-900">{{ selectedUser.user.name }}</h4>
              <p class="text-sm text-neutral-500">{{ selectedUser.user.email }}</p>
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-lg bg-neutral-50 p-3">
              <p class="text-xs uppercase text-neutral-500">Role</p>
              <p class="text-sm font-medium text-neutral-900">{{ labelFrom(roleLabels, selectedUser.role) }}</p>
            </div>
            <div class="rounded-lg bg-neutral-50 p-3">
              <p class="text-xs uppercase text-neutral-500">Tenant</p>
              <p class="text-sm font-medium text-neutral-900">{{ selectedUser.workspace?.name ?? '-' }}</p>
            </div>
            <div class="rounded-lg bg-neutral-50 p-3">
              <p class="text-xs uppercase text-neutral-500">Paket</p>
              <p class="text-sm font-medium text-neutral-900">{{ labelFrom(planLabels, selectedUser.workspace?.plan) }}</p>
            </div>
            <div class="rounded-lg bg-neutral-50 p-3">
              <p class="text-xs uppercase text-neutral-500">Status Tenant</p>
              <p class="text-sm font-medium text-neutral-900">{{ labelFrom(workspaceStatusLabels, selectedUser.workspace?.status) }}</p>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 border-t border-neutral-200 p-4">
          <button class="btn-secondary" @click="showDetailModal = false">Tutup</button>
          <button class="btn-primary" @click="openRoleModal(selectedUser); showDetailModal = false">Ubah Role</button>
        </div>
      </div>
    </div>

    <div v-if="showRoleModal && selectedUser" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div class="border-b border-neutral-200 p-4">
          <h3 class="text-lg font-semibold text-neutral-900">Ubah Role User</h3>
        </div>
        <div class="space-y-4 p-4">
          <p class="text-sm text-neutral-600">Role berlaku hanya untuk tenant {{ selectedUser.workspace?.name ?? '-' }}.</p>
          <select v-model="roleDraft" class="input w-full">
            <option value="admin">Admin Tenant</option>
            <option value="staff">Staff</option>
            <option value="supplier">Supplier</option>
            <option value="trial">Trial</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
        <div class="flex justify-end gap-3 border-t border-neutral-200 p-4">
          <button class="btn-secondary" @click="showRoleModal = false">Batal</button>
          <button class="btn-primary" :disabled="saving" @click="saveRole">
            <Save class="h-4 w-4" />
            Simpan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
