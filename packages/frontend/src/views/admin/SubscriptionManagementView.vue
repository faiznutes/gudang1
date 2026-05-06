<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronLeft, ChevronRight, CreditCard, Eye, RefreshCw, Save, Search, TrendingUp, Wallet, XCircle } from 'lucide-vue-next'
import adminService, { type AdminPlan, type Subscription } from '@/services/api/admin'
import { labelFrom, planLabels, subscriptionStatusLabels, workspaceStatusLabels } from '@/lib/labels'

const subscriptions = ref<Subscription[]>([])
const searchQuery = ref('')
const selectedPlanFilter = ref('all')
const selectedStatusFilter = ref('all')
const currentPage = ref(1)
const totalPages = ref(1)
const totalSubscriptions = ref(0)
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const showDetailModal = ref(false)
const showPlanModal = ref(false)
const selectedSubscription = ref<Subscription | null>(null)
const planDraft = ref<AdminPlan>('starter')
const itemsPerPage = 10

const revenueStats = computed(() => {
  const active = subscriptions.value.filter(subscription => subscription.status === 'active')
  const trials = subscriptions.value.filter(subscription => subscription.status === 'trialing')
  const mrr = active.reduce((sum, subscription) => sum + subscription.amount, 0)
  return {
    mrr,
    yearly: mrr * 12,
    active: active.length,
    trial: trials.length,
  }
})

const planStats = computed(() => {
  const plans: AdminPlan[] = ['pro', 'growth', 'starter', 'free', 'custom']
  return plans.map(plan => ({
    plan,
    count: subscriptions.value.filter(subscription => subscription.plan === plan).length,
    revenue: subscriptions.value.filter(subscription => subscription.plan === plan && subscription.status === 'active').reduce((sum, subscription) => sum + subscription.amount, 0),
  })).filter(item => item.count > 0)
})

const pageStart = computed(() => totalSubscriptions.value === 0 ? 0 : (currentPage.value - 1) * itemsPerPage + 1)
const pageEnd = computed(() => Math.min(currentPage.value * itemsPerPage, totalSubscriptions.value))

async function loadSubscriptions(page = currentPage.value) {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await adminService.getAllSubscriptions({
      page,
      q: searchQuery.value,
      plan: selectedPlanFilter.value,
      status: selectedStatusFilter.value,
    })
    subscriptions.value = response.data
    currentPage.value = response.meta.current_page
    totalPages.value = response.meta.total_pages
    totalSubscriptions.value = response.meta.total
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Subscription gagal dimuat'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  loadSubscriptions(1)
}

function openDetailModal(subscription: Subscription) {
  selectedSubscription.value = subscription
  showDetailModal.value = true
}

function openPlanModal(subscription: Subscription) {
  selectedSubscription.value = subscription
  planDraft.value = subscription.plan
  showPlanModal.value = true
}

async function savePlan() {
  if (!selectedSubscription.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await adminService.changePlan(selectedSubscription.value.workspace_id, planDraft.value)
    showPlanModal.value = false
    await loadSubscriptions()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Paket gagal diperbarui'
  } finally {
    saving.value = false
  }
}

async function cancelSubscription(subscription: Subscription) {
  if (!confirm(`Batalkan subscription tenant ${subscription.workspace?.name ?? '-'}?`)) return
  saving.value = true
  errorMessage.value = ''
  try {
    await adminService.cancelSubscription(subscription.workspace_id)
    await loadSubscriptions()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Subscription gagal dibatalkan'
  } finally {
    saving.value = false
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) loadSubscriptions(currentPage.value + 1)
}

function previousPage() {
  if (currentPage.value > 1) loadSubscriptions(currentPage.value - 1)
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
    trialing: 'bg-warning-50 text-warning-700',
    cancelled: 'bg-danger-50 text-danger-700',
    past_due: 'bg-warning-50 text-warning-700',
    expired: 'bg-neutral-100 text-neutral-700',
  }
  return badges[status] || 'bg-neutral-100 text-neutral-700'
}

onMounted(() => loadSubscriptions(1))
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-neutral-900">Subscription Management</h2>
        <p class="text-neutral-600">Kelola paket, status subscription, dan MRR tenant</p>
      </div>
      <button class="btn-secondary" :disabled="loading" @click="loadSubscriptions()">
        <RefreshCw :class="['h-4 w-4', loading ? 'animate-spin' : '']" />
        Refresh
      </button>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-danger-100 bg-danger-50 p-4 text-sm text-danger-700">
      {{ errorMessage }}
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div class="card p-4 lg:p-6">
        <Wallet class="mb-4 h-8 w-8 text-success-600" />
        <p class="text-sm text-neutral-500">MRR Aktif</p>
        <p class="text-2xl font-bold text-neutral-900">{{ formatCurrency(revenueStats.mrr) }}</p>
      </div>
      <div class="card p-4 lg:p-6">
        <TrendingUp class="mb-4 h-8 w-8 text-purple-600" />
        <p class="text-sm text-neutral-500">Proyeksi Tahunan</p>
        <p class="text-2xl font-bold text-neutral-900">{{ formatCurrency(revenueStats.yearly) }}</p>
      </div>
      <div class="card p-4 lg:p-6">
        <CreditCard class="mb-4 h-8 w-8 text-primary-600" />
        <p class="text-sm text-neutral-500">Subscription Aktif</p>
        <p class="text-2xl font-bold text-neutral-900">{{ revenueStats.active }}</p>
      </div>
      <div class="card p-4 lg:p-6">
        <RefreshCw class="mb-4 h-8 w-8 text-warning-600" />
        <p class="text-sm text-neutral-500">Trial</p>
        <p class="text-2xl font-bold text-neutral-900">{{ revenueStats.trial }}</p>
      </div>
    </div>

    <div class="card p-4">
      <div class="flex flex-col gap-4 md:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
          <input v-model="searchQuery" type="text" placeholder="Cari tenant" class="input w-full pl-10" @keyup.enter="applyFilters" />
        </div>
        <select v-model="selectedPlanFilter" class="input w-full md:w-40" @change="applyFilters">
          <option value="all">Semua Paket</option>
          <option value="free">Gratis</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="pro">Pro</option>
          <option value="custom">Kustom</option>
        </select>
        <select v-model="selectedStatusFilter" class="input w-full md:w-44" @change="applyFilters">
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="trialing">Trial</option>
          <option value="past_due">Tertunggak</option>
          <option value="cancelled">Dibatalkan</option>
          <option value="expired">Berakhir</option>
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
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Paket</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">MRR</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Periode</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Status</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr v-if="loading">
              <td colspan="6" class="px-4 py-10 text-center text-sm text-neutral-500">Memuat subscription...</td>
            </tr>
            <tr v-else-if="subscriptions.length === 0">
              <td colspan="6" class="px-4 py-10 text-center text-sm text-neutral-500">Subscription tidak ditemukan.</td>
            </tr>
            <template v-else>
              <tr v-for="subscription in subscriptions" :key="subscription.id" class="hover:bg-neutral-50">
                <td class="px-4 py-3">
                  <p class="text-sm font-medium text-neutral-900">{{ subscription.workspace?.name ?? '-' }}</p>
                  <p class="text-xs text-neutral-500">{{ labelFrom(workspaceStatusLabels, subscription.workspace?.status) }}</p>
                </td>
                <td class="px-4 py-3">
                  <span :class="['rounded-full px-2 py-1 text-xs font-medium', getPlanBadge(subscription.plan)]">
                    {{ labelFrom(planLabels, subscription.plan) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm font-medium text-neutral-900">{{ formatCurrency(subscription.amount) }}</td>
                <td class="px-4 py-3 text-sm text-neutral-500">
                  {{ formatDate(subscription.current_period_start) }} - {{ formatDate(subscription.current_period_end) }}
                </td>
                <td class="px-4 py-3">
                  <span :class="['rounded-full px-2 py-1 text-xs font-medium', getStatusBadge(subscription.status)]">
                    {{ labelFrom(subscriptionStatusLabels, subscription.status) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-2">
                    <button class="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-primary-600" title="Detail" @click="openDetailModal(subscription)">
                      <Eye class="h-4 w-4" />
                    </button>
                    <button class="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-primary-600" title="Ubah paket" @click="openPlanModal(subscription)">
                      <Save class="h-4 w-4" />
                    </button>
                    <button
                      class="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-danger-600 disabled:opacity-40"
                      title="Batalkan subscription"
                      :disabled="subscription.status === 'cancelled'"
                      @click="cancelSubscription(subscription)"
                    >
                      <XCircle class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between border-t border-neutral-100 px-4 py-3">
        <p class="text-sm text-neutral-500">Menampilkan {{ pageStart }} - {{ pageEnd }} dari {{ totalSubscriptions }} subscription</p>
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

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="card">
        <div class="border-b border-neutral-100 p-4">
          <h3 class="font-semibold text-neutral-900">Revenue by Plan</h3>
        </div>
        <div class="space-y-4 p-4">
          <div v-if="planStats.length === 0" class="text-sm text-neutral-500">Belum ada subscription pada filter ini.</div>
          <div v-for="plan in planStats" :key="plan.plan" class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-neutral-700">{{ labelFrom(planLabels, plan.plan) }}</span>
              <span class="text-sm text-neutral-900">{{ plan.count }} subscription</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div class="h-full rounded-full bg-purple-500" :style="{ width: `${subscriptions.length ? (plan.count / subscriptions.length) * 100 : 0}%` }"></div>
              </div>
              <span class="w-28 text-right text-sm font-medium text-neutral-700">{{ formatCurrency(plan.revenue) }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="border-b border-neutral-100 p-4">
          <h3 class="font-semibold text-neutral-900">Revenue Summary</h3>
        </div>
        <div class="space-y-3 p-4">
          <div class="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
            <span class="text-sm text-neutral-600">Total Active MRR</span>
            <span class="text-lg font-bold text-success-600">{{ formatCurrency(revenueStats.mrr) }}</span>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
            <span class="text-sm text-neutral-600">Projected Annual Revenue</span>
            <span class="text-lg font-bold text-purple-600">{{ formatCurrency(revenueStats.yearly) }}</span>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
            <span class="text-sm text-neutral-600">Average Revenue per Active Subscription</span>
            <span class="text-lg font-bold text-primary-600">{{ formatCurrency(revenueStats.active ? revenueStats.mrr / revenueStats.active : 0) }}</span>
          </div>
        </div>
      </section>
    </div>

    <div v-if="showDetailModal && selectedSubscription" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-neutral-200 p-4">
          <h3 class="text-lg font-semibold text-neutral-900">Detail Subscription</h3>
          <button class="rounded-lg p-1 hover:bg-neutral-100" @click="showDetailModal = false">x</button>
        </div>
        <div class="grid gap-3 p-4 sm:grid-cols-2">
          <div class="rounded-lg bg-neutral-50 p-3">
            <p class="text-xs uppercase text-neutral-500">Tenant</p>
            <p class="text-sm font-medium text-neutral-900">{{ selectedSubscription.workspace?.name ?? '-' }}</p>
          </div>
          <div class="rounded-lg bg-neutral-50 p-3">
            <p class="text-xs uppercase text-neutral-500">Paket</p>
            <p class="text-sm font-medium text-neutral-900">{{ labelFrom(planLabels, selectedSubscription.plan) }}</p>
          </div>
          <div class="rounded-lg bg-neutral-50 p-3">
            <p class="text-xs uppercase text-neutral-500">Status</p>
            <p class="text-sm font-medium text-neutral-900">{{ labelFrom(subscriptionStatusLabels, selectedSubscription.status) }}</p>
          </div>
          <div class="rounded-lg bg-neutral-50 p-3">
            <p class="text-xs uppercase text-neutral-500">MRR</p>
            <p class="text-sm font-medium text-neutral-900">{{ formatCurrency(selectedSubscription.amount) }}</p>
          </div>
          <div class="rounded-lg bg-neutral-50 p-3 sm:col-span-2">
            <p class="text-xs uppercase text-neutral-500">Periode</p>
            <p class="text-sm font-medium text-neutral-900">{{ formatDate(selectedSubscription.current_period_start) }} - {{ formatDate(selectedSubscription.current_period_end) }}</p>
          </div>
        </div>
        <div class="flex justify-end gap-3 border-t border-neutral-200 p-4">
          <button class="btn-secondary" @click="showDetailModal = false">Tutup</button>
          <button class="btn-primary" @click="openPlanModal(selectedSubscription); showDetailModal = false">Ubah Paket</button>
        </div>
      </div>
    </div>

    <div v-if="showPlanModal && selectedSubscription" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div class="border-b border-neutral-200 p-4">
          <h3 class="text-lg font-semibold text-neutral-900">Ubah Paket Tenant</h3>
        </div>
        <div class="space-y-4 p-4">
          <p class="text-sm text-neutral-600">Tenant: {{ selectedSubscription.workspace?.name ?? '-' }}</p>
          <select v-model="planDraft" class="input w-full">
            <option value="free">Gratis</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="pro">Pro</option>
            <option value="custom">Kustom</option>
          </select>
        </div>
        <div class="flex justify-end gap-3 border-t border-neutral-200 p-4">
          <button class="btn-secondary" @click="showPlanModal = false">Batal</button>
          <button class="btn-primary" :disabled="saving" @click="savePlan">
            <Save class="h-4 w-4" />
            Simpan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
