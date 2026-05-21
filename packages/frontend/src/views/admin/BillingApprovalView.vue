<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CheckCircle2, Clock, FileText, RefreshCw, Search, ShieldCheck, XCircle } from 'lucide-vue-next'
import adminService, { type BillingRequest, type BillingRequestStatus, type BillingRequestType, type CustomizationClassification } from '@/services/api/admin'
import { billingRequestStatusLabels, billingRequestTypeLabels, customizationClassificationLabels, labelFrom } from '@/lib/labels'

const requests = ref<BillingRequest[]>([])
const selectedRequest = ref<BillingRequest | null>(null)
const selectedRequestIds = ref<string[]>([])
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const searchQuery = ref('')
const statusFilter = ref<'all' | BillingRequestStatus>('pending')
const typeFilter = ref<'all' | BillingRequestType>('all')
const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(0)
const decisionDraft = ref<{
  notes: string
  approved_amount: number | null
  promotional_amount: number | null
  classification: '' | CustomizationClassification
  temporary_access_until: string
  rejection_reason: string
}>({
  notes: '',
  approved_amount: null,
  promotional_amount: null,
  classification: '',
  temporary_access_until: '',
  rejection_reason: '',
})

const statusOptions: Array<'all' | BillingRequestStatus> = ['pending', 'approved', 'rejected', 'cancelled', 'all']
const typeOptions: Array<'all' | BillingRequestType> = ['all', 'plan_change', 'addon_activation', 'limit_increase', 'subscription_extension', 'custom_feature', 'manual_adjustment', 'enterprise_customization']
const classificationOptions: CustomizationClassification[] = ['future_roadmap', 'enterprise_only', 'billable_customization', 'global_feature_candidate', 'rejected']

const pendingCount = computed(() => requests.value.filter(request => request.status === 'pending').length)
const recurringImpact = computed(() => requests.value.filter(request => request.status === 'pending').reduce((sum, request) => sum + request.billing_impact, 0))
const selectableRequests = computed(() => requests.value.filter(request => request.status === 'pending'))
const selectedRequests = computed(() => selectableRequests.value.filter(request => selectedRequestIds.value.includes(request.id)))
const allVisibleRequestsSelected = computed(() => selectableRequests.value.length > 0 && selectableRequests.value.every(request => selectedRequestIds.value.includes(request.id)))

function statusTone(status: BillingRequestStatus) {
  const tones: Record<BillingRequestStatus, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rejected: 'bg-rose-50 text-rose-700 border-rose-100',
    cancelled: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  }
  return tones[status]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function billingCycleLabel(value: string) {
  if (value === 'yearly') return 'Tahunan'
  if (value === 'monthly') return 'Bulanan'
  return 'Manual'
}

function metadataValue(request: BillingRequest, key: string) {
  const metadata = request.metadata ?? {}
  return metadata[key]
}

async function loadRequests(page = currentPage.value) {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await adminService.getBillingRequests({
      page,
      q: searchQuery.value,
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
      type: typeFilter.value === 'all' ? undefined : typeFilter.value,
    })
    requests.value = response.data
    selectedRequestIds.value = selectedRequestIds.value.filter(id => response.data.some(request => request.id === id && request.status === 'pending'))
    currentPage.value = response.meta.current_page
    totalPages.value = response.meta.total_pages
    totalItems.value = response.meta.total
    if (!selectedRequest.value && response.data.length > 0) openRequest(response.data[0])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Request billing gagal dimuat'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  selectedRequest.value = null
  loadRequests(1)
}

function toggleRequestSelection(request: BillingRequest) {
  if (request.status !== 'pending') return
  selectedRequestIds.value = selectedRequestIds.value.includes(request.id)
    ? selectedRequestIds.value.filter(id => id !== request.id)
    : [...selectedRequestIds.value, request.id]
}

function toggleAllVisibleRequests() {
  selectedRequestIds.value = allVisibleRequestsSelected.value ? [] : selectableRequests.value.map(request => request.id)
}

function clearSelectedRequests() {
  selectedRequestIds.value = []
}

function openRequest(request: BillingRequest) {
  selectedRequest.value = request
  decisionDraft.value = {
    notes: request.admin_notes ?? '',
    approved_amount: request.requested_amount,
    promotional_amount: request.promotional_amount ?? null,
    classification: request.classification ?? '',
    temporary_access_until: request.temporary_access_until ? request.temporary_access_until.slice(0, 16) : '',
    rejection_reason: request.rejection_reason ?? '',
  }
}

async function approveRequest() {
  if (!selectedRequest.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const updated = await adminService.approveBillingRequest(selectedRequest.value.id, {
      notes: decisionDraft.value.notes,
      approved_amount: decisionDraft.value.approved_amount ?? undefined,
      promotional_amount: decisionDraft.value.promotional_amount ?? undefined,
      temporary_access_until: decisionDraft.value.temporary_access_until ? new Date(decisionDraft.value.temporary_access_until).toISOString() : null,
      classification: decisionDraft.value.classification || undefined,
    })
    selectedRequest.value = updated
    await loadRequests()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Approval gagal diproses'
  } finally {
    saving.value = false
  }
}

async function rejectRequest() {
  if (!selectedRequest.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const updated = await adminService.rejectBillingRequest(selectedRequest.value.id, {
      notes: decisionDraft.value.notes,
      rejection_reason: decisionDraft.value.rejection_reason || decisionDraft.value.notes,
      classification: decisionDraft.value.classification || 'rejected',
    })
    selectedRequest.value = updated
    await loadRequests()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Penolakan gagal diproses'
  } finally {
    saving.value = false
  }
}

async function bulkApproveRequests() {
  if (selectedRequests.value.length === 0) return
  if (!confirm(`Approve ${selectedRequests.value.length} request pending terpilih? Harga disetujui memakai harga request masing-masing.`)) return
  saving.value = true
  errorMessage.value = ''
  try {
    await Promise.all(selectedRequests.value.map(request => adminService.approveBillingRequest(request.id, {
      notes: decisionDraft.value.notes || 'Bulk approve dari dashboard approval',
      approved_amount: request.requested_amount,
    })))
    clearSelectedRequests()
    selectedRequest.value = null
    await loadRequests()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Bulk approve gagal diproses'
  } finally {
    saving.value = false
  }
}

async function bulkRejectRequests() {
  if (selectedRequests.value.length === 0) return
  const reason = decisionDraft.value.rejection_reason || decisionDraft.value.notes || 'Ditolak melalui bulk action'
  if (!confirm(`Reject ${selectedRequests.value.length} request pending terpilih?`)) return
  saving.value = true
  errorMessage.value = ''
  try {
    await Promise.all(selectedRequests.value.map(request => adminService.rejectBillingRequest(request.id, {
      notes: decisionDraft.value.notes || reason,
      rejection_reason: reason,
      classification: decisionDraft.value.classification || 'rejected',
    })))
    clearSelectedRequests()
    selectedRequest.value = null
    await loadRequests()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Bulk reject gagal diproses'
  } finally {
    saving.value = false
  }
}

onMounted(() => loadRequests(1))
</script>

<template>
  <div class="min-h-screen bg-[#f8fbff] p-4 lg:p-8">
    <div class="mx-auto max-w-7xl space-y-6">
      <section class="rounded-3xl border border-white bg-white p-5 shadow-sm lg:p-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div class="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber-700">
              <ShieldCheck class="h-4 w-4" />
              Super admin approval
            </div>
            <h1 class="mt-4 text-3xl font-black text-neutral-950">Approval Billing & Customization</h1>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
              Pusat review upgrade, downgrade, add-on, limit, extension, dan request kustom agar monetisasi tetap terkendali.
            </p>
          </div>
          <button class="btn-secondary" :disabled="loading" @click="loadRequests()">
            <RefreshCw :class="['h-4 w-4', loading ? 'animate-spin' : '']" />
            Refresh
          </button>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl bg-amber-50 p-4">
            <Clock class="h-5 w-5 text-amber-700" />
            <p class="mt-3 text-2xl font-black text-neutral-950">{{ pendingCount }}</p>
            <p class="text-sm font-bold text-amber-700">Pending di halaman ini</p>
          </div>
          <div class="rounded-2xl bg-emerald-50 p-4">
            <CheckCircle2 class="h-5 w-5 text-emerald-700" />
            <p class="mt-3 text-2xl font-black text-neutral-950">{{ formatCurrency(recurringImpact) }}</p>
            <p class="text-sm font-bold text-emerald-700">Estimasi impact MRR</p>
          </div>
          <div class="rounded-2xl bg-sky-50 p-4">
            <FileText class="h-5 w-5 text-sky-700" />
            <p class="mt-3 text-2xl font-black text-neutral-950">{{ totalItems }}</p>
            <p class="text-sm font-bold text-sky-700">Total request terfilter</p>
          </div>
        </div>
      </section>

      <div v-if="errorMessage" class="rounded-2xl border border-danger-100 bg-danger-50 p-4 text-sm font-semibold text-danger-700">
        {{ errorMessage }}
      </div>

      <section class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div class="rounded-3xl border border-white bg-white p-5 shadow-sm lg:p-6">
          <div class="grid gap-3 lg:grid-cols-[1fr_150px_170px]">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input v-model="searchQuery" class="input pl-10" placeholder="Cari tenant, email, request" @keyup.enter="applyFilters" />
            </div>
            <select v-model="statusFilter" class="input" @change="applyFilters">
              <option v-for="status in statusOptions" :key="status" :value="status">
                {{ status === 'all' ? 'Semua status' : labelFrom(billingRequestStatusLabels, status) }}
              </option>
            </select>
            <select v-model="typeFilter" class="input" @change="applyFilters">
              <option v-for="type in typeOptions" :key="type" :value="type">
                {{ type === 'all' ? 'Semua tipe' : labelFrom(billingRequestTypeLabels, type) }}
              </option>
            </select>
          </div>

          <div v-if="requests.length > 0" class="mt-4 flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-[#fbfdff] p-3 sm:flex-row sm:items-center sm:justify-between">
            <label class="inline-flex items-center gap-2 text-xs font-black text-neutral-700">
              <input type="checkbox" class="h-4 w-4 rounded border-neutral-300 text-primary-600" :checked="allVisibleRequestsSelected" @change="toggleAllVisibleRequests" />
              Pilih pending halaman ini
            </label>
            <div v-if="selectedRequestIds.length > 0" class="flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-black text-primary-700">{{ selectedRequestIds.length }} request dipilih</span>
              <button class="btn-secondary btn-sm" :disabled="saving" @click="bulkApproveRequests">Approve</button>
              <button class="btn-secondary btn-sm border-danger-200 text-danger-700 hover:bg-danger-50" :disabled="saving" @click="bulkRejectRequests">Reject</button>
              <button class="btn-secondary btn-sm" @click="clearSelectedRequests">Batal</button>
            </div>
          </div>

          <div class="mt-5 space-y-3">
            <article
              v-for="request in requests"
              :key="request.id"
              :class="['cursor-pointer rounded-2xl border p-4 transition hover:border-primary-200 hover:bg-primary-50/30', selectedRequest?.id === request.id ? 'border-primary-300 bg-primary-50/50' : 'border-neutral-100 bg-[#fbfdff]']"
              @click="openRequest(request)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 gap-3">
                  <input type="checkbox" class="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-600 disabled:opacity-30" :checked="selectedRequestIds.includes(request.id)" :disabled="request.status !== 'pending'" @click.stop @change="toggleRequestSelection(request)" />
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black text-neutral-950">{{ request.title }}</p>
                    <p class="mt-1 truncate text-xs text-neutral-500">{{ request.workspace_name || request.workspace_id }} - {{ labelFrom(billingRequestTypeLabels, request.type) }}</p>
                  </div>
                </div>
                <span :class="['rounded-full border px-2.5 py-1 text-xs font-black', statusTone(request.status)]">
                  {{ labelFrom(billingRequestStatusLabels, request.status) }}
                </span>
              </div>
              <div class="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div class="rounded-lg bg-white p-2">
                  <p class="font-black text-neutral-900">{{ formatCurrency(request.current_amount) }}</p>
                  <p class="text-neutral-500">Current</p>
                </div>
                <div class="rounded-lg bg-white p-2">
                  <p class="font-black text-neutral-900">{{ formatCurrency(request.requested_amount) }}</p>
                  <p class="text-neutral-500">Request</p>
                </div>
                <div class="rounded-lg bg-white p-2">
                  <p class="font-black text-neutral-900">{{ formatCurrency(request.billing_impact) }}</p>
                  <p class="text-neutral-500">Impact</p>
                </div>
              </div>
            </article>
            <div v-if="!loading && requests.length === 0" class="rounded-2xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
              Tidak ada request pada filter ini.
            </div>
          </div>

          <div class="mt-5 flex items-center justify-between text-sm text-neutral-500">
            <span>Halaman {{ currentPage }} dari {{ totalPages }}</span>
            <div class="flex gap-2">
              <button class="btn-secondary" :disabled="currentPage <= 1" @click="loadRequests(currentPage - 1)">Prev</button>
              <button class="btn-secondary" :disabled="currentPage >= totalPages" @click="loadRequests(currentPage + 1)">Next</button>
            </div>
          </div>
        </div>

        <div class="rounded-3xl border border-white bg-white p-5 shadow-sm lg:p-6">
          <div v-if="!selectedRequest" class="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-neutral-200 text-sm text-neutral-500">
            Pilih request untuk review.
          </div>
          <template v-else>
            <div class="flex flex-col gap-3 border-b border-neutral-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 class="text-2xl font-black text-neutral-950">{{ selectedRequest.title }}</h2>
                <p class="mt-1 text-sm text-neutral-500">{{ selectedRequest.workspace_name || selectedRequest.workspace_id }} - dibuat {{ formatDate(selectedRequest.created_at) }}</p>
              </div>
              <span :class="['rounded-full border px-3 py-1 text-xs font-black', statusTone(selectedRequest.status)]">
                {{ labelFrom(billingRequestStatusLabels, selectedRequest.status) }}
              </span>
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl bg-neutral-50 p-4">
                <p class="text-xs font-bold uppercase text-neutral-500">Current package</p>
                <p class="mt-2 font-black text-neutral-950">{{ selectedRequest.current_package?.name || '-' }}</p>
                <p class="text-sm text-neutral-500">{{ formatCurrency(selectedRequest.current_amount) }}</p>
              </div>
              <div class="rounded-2xl bg-primary-50 p-4">
                <p class="text-xs font-bold uppercase text-primary-700">Requested</p>
                <p class="mt-2 font-black text-neutral-950">{{ selectedRequest.requested_package?.name || selectedRequest.addon?.name || labelFrom(billingRequestTypeLabels, selectedRequest.type) }}</p>
                <p class="text-sm text-primary-700">{{ formatCurrency(selectedRequest.requested_amount) }}</p>
              </div>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              <div class="rounded-xl border border-neutral-100 p-3">
                <p class="text-xs text-neutral-500">Billing impact</p>
                <p class="mt-1 font-black text-neutral-950">{{ formatCurrency(selectedRequest.billing_impact) }}</p>
              </div>
              <div class="rounded-xl border border-neutral-100 p-3">
                <p class="text-xs text-neutral-500">Cycle</p>
                <p class="mt-1 font-black text-neutral-950">{{ billingCycleLabel(selectedRequest.billing_cycle) }}</p>
              </div>
              <div class="rounded-xl border border-neutral-100 p-3">
                <p class="text-xs text-neutral-500">Requested by</p>
                <p class="mt-1 truncate font-black text-neutral-950">{{ selectedRequest.requested_by?.name || '-' }}</p>
              </div>
            </div>

            <div class="mt-5 rounded-2xl border border-neutral-100 bg-[#fbfdff] p-4">
              <p class="text-sm font-black text-neutral-950">Snapshot operasional</p>
              <div class="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                <div class="rounded-lg bg-white p-3">
                  <p class="font-black">{{ (metadataValue(selectedRequest, 'usage') as any)?.warehouses ?? '-' }}</p>
                  <p class="text-xs text-neutral-500">Gudang</p>
                </div>
                <div class="rounded-lg bg-white p-3">
                  <p class="font-black">{{ (metadataValue(selectedRequest, 'usage') as any)?.products ?? '-' }}</p>
                  <p class="text-xs text-neutral-500">Produk</p>
                </div>
                <div class="rounded-lg bg-white p-3">
                  <p class="font-black">{{ (metadataValue(selectedRequest, 'usage') as any)?.users ?? '-' }}</p>
                  <p class="text-xs text-neutral-500">User</p>
                </div>
                <div class="rounded-lg bg-white p-3">
                  <p class="font-black">{{ (metadataValue(selectedRequest, 'usage') as any)?.suppliers ?? '-' }}</p>
                  <p class="text-xs text-neutral-500">Supplier</p>
                </div>
              </div>
            </div>

            <div class="mt-5 space-y-3">
              <textarea v-model="decisionDraft.notes" class="input min-h-24" placeholder="Catatan internal / catatan untuk tenant"></textarea>
              <div class="grid gap-3 sm:grid-cols-2">
                <input v-model.number="decisionDraft.approved_amount" type="number" min="0" class="input" placeholder="Harga disetujui" />
                <input v-model.number="decisionDraft.promotional_amount" type="number" min="0" class="input" placeholder="Harga promo opsional" />
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <input v-model="decisionDraft.temporary_access_until" type="datetime-local" class="input" />
                <select v-model="decisionDraft.classification" class="input">
                  <option value="">Klasifikasi opsional</option>
                  <option v-for="classification in classificationOptions" :key="classification" :value="classification">
                    {{ labelFrom(customizationClassificationLabels, classification) }}
                  </option>
                </select>
              </div>
              <textarea v-model="decisionDraft.rejection_reason" class="input min-h-20" placeholder="Alasan penolakan jika ditolak"></textarea>
            </div>

            <div class="mt-5 flex flex-col gap-3 sm:flex-row">
              <button class="btn-primary flex-1" :disabled="saving || selectedRequest.status !== 'pending'" @click="approveRequest">
                <CheckCircle2 class="h-4 w-4" />
                Approve
              </button>
              <button class="btn-secondary flex-1 border-danger-200 text-danger-700 hover:bg-danger-50" :disabled="saving || selectedRequest.status !== 'pending'" @click="rejectRequest">
                <XCircle class="h-4 w-4" />
                Reject
              </button>
            </div>

            <div class="mt-6 border-t border-neutral-100 pt-5">
              <h3 class="font-black text-neutral-950">Status history</h3>
              <div class="mt-3 space-y-2">
                <div v-for="item in selectedRequest.history ?? []" :key="item.id" class="rounded-xl bg-neutral-50 p-3 text-sm">
                  <p class="font-bold text-neutral-900">{{ item.action }}</p>
                  <p class="mt-1 text-xs text-neutral-500">{{ item.user?.name || 'System' }} - {{ formatDate(item.created_at) }}</p>
                  <p v-if="item.notes" class="mt-2 text-neutral-600">{{ item.notes }}</p>
                </div>
              </div>
            </div>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>
