<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  RefreshCw,
  Server,
  UserCog,
  Users,
  Wallet,
} from 'lucide-vue-next'
import adminService, { type DashboardStats } from '@/services/api/admin'
import { labelFrom, planLabels, roleLabels, workspaceStatusLabels } from '@/lib/labels'

const router = useRouter()
const stats = ref<DashboardStats | null>(null)
const loading = ref(true)
const errorMessage = ref('')

const totalPlans = computed(() => {
  return stats.value?.plan_distribution.reduce((sum, item) => sum + item.count, 0) ?? 0
})

const metricCards = computed(() => {
  if (!stats.value) return []
  return [
    { label: 'Total tenant', value: formatNumber(stats.value.total_workspaces), icon: Building2, color: 'bg-primary-50 text-primary-600' },
    { label: 'Tenant aktif', value: formatNumber(stats.value.active_workspaces), icon: CheckCircle2, color: 'bg-success-50 text-success-600' },
    { label: 'Total user', value: formatNumber(stats.value.total_users), icon: Users, color: 'bg-purple-50 text-purple-600' },
    { label: 'MRR aktif', value: formatCurrency(stats.value.total_revenue), icon: Wallet, color: 'bg-warning-50 text-warning-600' },
  ]
})

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''
  try {
    stats.value = await adminService.getDashboardStats()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Dashboard admin gagal dimuat'
  } finally {
    loading.value = false
  }
}

function navigateTo(path: string) {
  router.push(path)
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value)
}

function formatDate(dateStr: string) {
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
  return status === 'healthy' ? 'text-success-700 bg-success-50' : 'text-warning-700 bg-warning-50'
}

onMounted(loadDashboard)
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-neutral-900">Admin Dashboard</h2>
        <p class="text-neutral-600">Ringkasan tenant, user, subscription, dan kesehatan platform</p>
      </div>
      <button class="btn-secondary" :disabled="loading" @click="loadDashboard">
        <RefreshCw :class="['h-4 w-4', loading ? 'animate-spin' : '']" />
        Refresh
      </button>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-danger-100 bg-danger-50 p-4 text-sm text-danger-700">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div v-for="index in 4" :key="index" class="card h-32 animate-pulse bg-white p-4">
        <div class="h-10 w-10 rounded-lg bg-neutral-100"></div>
        <div class="mt-5 h-6 w-24 rounded bg-neutral-100"></div>
        <div class="mt-2 h-4 w-32 rounded bg-neutral-100"></div>
      </div>
    </div>

    <template v-else-if="stats">
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div v-for="card in metricCards" :key="card.label" class="card p-4 lg:p-6">
          <div :class="['mb-4 flex h-11 w-11 items-center justify-center rounded-lg', card.color]">
            <component :is="card.icon" class="h-5 w-5" />
          </div>
          <p class="text-2xl font-bold text-neutral-900">{{ card.value }}</p>
          <p class="text-sm text-neutral-500">{{ card.label }}</p>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <section class="card">
          <div class="flex items-center justify-between border-b border-neutral-100 p-4">
            <h3 class="font-semibold text-neutral-900">User Terbaru</h3>
            <button class="text-sm font-medium text-primary-600 hover:text-primary-700" @click="navigateTo('/admin/users')">
              Lihat semua
            </button>
          </div>
          <div v-if="stats.recent_users.length === 0" class="p-6 text-sm text-neutral-500">Belum ada user tenant.</div>
          <div v-else class="divide-y divide-neutral-100">
            <div v-for="user in stats.recent_users" :key="`${user.workspace_id}-${user.id}`" class="flex items-center gap-4 p-4">
              <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                <span class="text-sm font-semibold text-purple-700">{{ user.name.charAt(0) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-neutral-900">{{ user.name }}</p>
                <p class="truncate text-xs text-neutral-500">{{ user.workspace_name }} · {{ labelFrom(roleLabels, user.role) }}</p>
              </div>
              <span :class="['rounded-full px-2 py-1 text-xs font-medium', getPlanBadge(user.plan)]">
                {{ labelFrom(planLabels, user.plan) }}
              </span>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="flex items-center justify-between border-b border-neutral-100 p-4">
            <h3 class="font-semibold text-neutral-900">Tenant Terbaru</h3>
            <button class="text-sm font-medium text-primary-600 hover:text-primary-700" @click="navigateTo('/admin/workspaces')">
              Lihat semua
            </button>
          </div>
          <div v-if="stats.recent_workspaces.length === 0" class="p-6 text-sm text-neutral-500">Belum ada tenant.</div>
          <div v-else class="divide-y divide-neutral-100">
            <div v-for="workspace in stats.recent_workspaces" :key="workspace.id" class="flex items-center gap-4 p-4">
              <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100">
                <Building2 class="h-5 w-5 text-primary-600" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-neutral-900">{{ workspace.name }}</p>
                <p class="truncate text-xs text-neutral-500">{{ workspace.users ?? 0 }} user · dibuat {{ formatDate(workspace.created_at) }}</p>
              </div>
              <span class="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
                {{ labelFrom(workspaceStatusLabels, workspace.status) }}
              </span>
            </div>
          </div>
        </section>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <section class="card">
          <div class="flex items-center justify-between border-b border-neutral-100 p-4">
            <h3 class="font-semibold text-neutral-900">Kesehatan Sistem</h3>
            <Server class="h-5 w-5 text-neutral-400" />
          </div>
          <div class="space-y-3 p-4">
            <div v-for="service in stats.system_health" :key="service.service" class="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
              <div class="flex items-center gap-3">
                <Activity class="h-5 w-5 text-neutral-500" />
                <span class="text-sm font-medium text-neutral-900">{{ service.service }}</span>
              </div>
              <span :class="['rounded-full px-2 py-1 text-xs font-medium', getStatusBadge(service.status)]">
                <CheckCircle2 v-if="service.status === 'healthy'" class="mr-1 inline h-3 w-3" />
                <AlertCircle v-else class="mr-1 inline h-3 w-3" />
                {{ service.status === 'healthy' ? 'Sehat' : 'Perlu cek' }}
              </span>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="flex items-center justify-between border-b border-neutral-100 p-4">
            <h3 class="font-semibold text-neutral-900">Distribusi Paket</h3>
            <button class="text-sm font-medium text-primary-600 hover:text-primary-700" @click="navigateTo('/admin/subscriptions')">
              Detail
            </button>
          </div>
          <div class="space-y-4 p-4">
            <div v-for="plan in stats.plan_distribution" :key="plan.plan" class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-neutral-700">{{ labelFrom(planLabels, plan.plan) }}</span>
                <span class="text-sm text-neutral-900">{{ plan.count }} tenant</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-neutral-100">
                <div class="h-full rounded-full bg-primary-500" :style="{ width: `${totalPlans ? (plan.count / totalPlans) * 100 : 0}%` }"></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <button class="card-hover p-4 text-center" @click="navigateTo('/admin/users')">
          <UserCog class="mx-auto mb-3 h-7 w-7 text-purple-600" />
          <p class="text-sm font-medium text-neutral-900">Kelola User</p>
        </button>
        <button class="card-hover p-4 text-center" @click="navigateTo('/admin/workspaces')">
          <Building2 class="mx-auto mb-3 h-7 w-7 text-primary-600" />
          <p class="text-sm font-medium text-neutral-900">Kelola Tenant</p>
        </button>
        <button class="card-hover p-4 text-center" @click="navigateTo('/admin/subscriptions')">
          <CreditCard class="mx-auto mb-3 h-7 w-7 text-success-600" />
          <p class="text-sm font-medium text-neutral-900">Subscription</p>
        </button>
        <button class="card-hover p-4 text-center" @click="navigateTo('/admin/audit-logs')">
          <FileText class="mx-auto mb-3 h-7 w-7 text-warning-600" />
          <p class="text-sm font-medium text-neutral-900">Audit Logs</p>
        </button>
      </div>
    </template>
  </div>
</template>
