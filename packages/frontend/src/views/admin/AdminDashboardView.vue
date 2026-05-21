<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  Layers3,
  PackagePlus,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
  Warehouse,
  Wallet,
} from 'lucide-vue-next'
import adminService, { type DashboardStats } from '@/services/api/admin'
import { labelFrom, planLabels, roleLabels, workspaceStatusLabels } from '@/lib/labels'

const router = useRouter()
const stats = ref<DashboardStats | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const selectedRange = ref('monthly')

const rangeOptions = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
]

const totalPlans = computed(() => {
  return stats.value?.plan_distribution.reduce((sum, item) => sum + item.count, 0) ?? 0
})

const activeSubscriptions = computed(() => {
  if (!stats.value) return 0
  if (typeof stats.value.active_subscriptions === 'number') return stats.value.active_subscriptions
  return stats.value.plan_distribution
    .filter(item => item.plan !== 'free')
    .reduce((sum, item) => sum + item.count, 0)
})

const platformCards = computed(() => {
  if (!stats.value) return []
  return [
    {
      label: 'Tenant & cabang',
      value: formatNumber(stats.value.total_workspaces),
      caption: `${formatNumber(stats.value.active_workspaces)} aktif, ${formatNumber(stats.value.trial_workspaces)} trial`,
      icon: Building2,
      tone: 'bg-primary-50 text-primary-700 ring-primary-100',
    },
    {
      label: 'Paket aktif',
      value: formatNumber(activeSubscriptions.value),
      caption: `${formatCurrency(stats.value.total_revenue)} MRR paket + add-on`,
      icon: Wallet,
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    },
    {
      label: 'Approval pending',
      value: formatNumber(stats.value.pending_approvals ?? 0),
      caption: 'Task dan persetujuan perlu ditindaklanjuti',
      icon: ClipboardCheck,
      tone: 'bg-amber-50 text-amber-700 ring-amber-100',
    },
    {
      label: 'User platform',
      value: formatNumber(stats.value.total_users),
      caption: 'Super admin, admin tenant, staff, supplier',
      icon: Users,
      tone: 'bg-sky-50 text-sky-700 ring-sky-100',
    },
  ]
})

const operationCards = computed(() => {
  if (!stats.value) return []
  return [
    {
      label: 'Produk terdaftar',
      value: formatNumber(stats.value.total_products ?? 0),
      caption: 'SKU aktif lintas tenant',
      icon: PackageCheck,
    },
    {
      label: 'Gudang aktif',
      value: formatNumber(stats.value.total_warehouses ?? 0),
      caption: 'Cabang dan lokasi penyimpanan',
      icon: Warehouse,
    },
    {
      label: 'Supplier',
      value: formatNumber(stats.value.total_suppliers ?? 0),
      caption: 'Partner pengadaan terhubung',
      icon: UserCog,
    },
    {
      label: 'Mutasi 7 hari',
      value: formatNumber(stats.value.stock_movements_7d ?? 0),
      caption: 'Stock masuk, keluar, transfer',
      icon: TrendingUp,
    },
  ]
})

const riskSignals = computed(() => {
  if (!stats.value) return []
  return [
    {
      label: 'Subscription perlu follow-up',
      value: stats.value.expiring_subscriptions ?? 0,
      description: 'Tenant yang akan berakhir dalam 7 hari',
      tone: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    {
      label: 'Stok menipis',
      value: stats.value.low_stock_items ?? 0,
      description: 'Item di bawah ambang minimum tenant',
      tone: 'border-rose-200 bg-rose-50 text-rose-800',
    },
    {
      label: 'Tenant baru',
      value: stats.value.recent_signups,
      description: 'Workspace dibuat dalam 7 hari terakhir',
      tone: 'border-primary-200 bg-primary-50 text-primary-800',
    },
  ]
})

const quickActions = [
  { label: 'Tambah tenant', caption: 'Setup workspace, owner, gudang, staff', icon: Building2, path: '/admin/workspaces' },
  { label: 'Approval billing', caption: 'Review paket, add-on, dan kustomisasi', icon: ClipboardCheck, path: '/admin/approvals' },
  { label: 'Produk SaaS', caption: 'Kelola paket, fitur, dan add-on', icon: PackagePlus, path: '/admin/packages' },
  { label: 'Subscription tenant', caption: 'Naik, turun, atau perpanjang masa aktif', icon: CreditCard, path: '/admin/subscriptions' },
  { label: 'Data klien', caption: 'Kelola produk, stok, dan supplier tenant', icon: Warehouse, path: '/admin/client-warehouse' },
  { label: 'Audit aktivitas', caption: 'Lihat riwayat perubahan lintas tenant', icon: FileText, path: '/admin/audit-logs' },
]

const trendCards = computed(() => {
  if (!stats.value) return []
  return [
    {
      label: 'MRR & add-on',
      caption: 'Subscription dan add-on baru',
      tone: 'bg-emerald-500',
      unit: 'currency',
      data: (stats.value.revenue_trends ?? []).map(item => ({ label: item.label, value: item.total })),
    },
    {
      label: 'Pertumbuhan tenant',
      caption: 'Workspace baru per periode',
      tone: 'bg-sky-500',
      unit: 'number',
      data: (stats.value.tenant_growth_trends ?? []).map(item => ({ label: item.label, value: item.new_tenants })),
    },
    {
      label: 'Approval request',
      caption: 'Pending, approve, reject',
      tone: 'bg-amber-500',
      unit: 'number',
      data: (stats.value.request_trends ?? []).map(item => ({ label: item.label, value: item.pending + item.approved + item.rejected })),
    },
    {
      label: 'Penggunaan fitur stok',
      caption: 'Stock in, out, transfer',
      tone: 'bg-violet-500',
      unit: 'number',
      data: (stats.value.feature_usage_trends ?? []).map(item => ({ label: item.label, value: item.total })),
    },
  ]
})

const governanceCards = [
  {
    label: 'Super admin',
    value: 'Akses penuh',
    description: 'Masuk langsung ke control plane tanpa izin gudang tenant.',
    icon: ShieldCheck,
    tone: 'border-sky-100 bg-sky-50 text-sky-800',
  },
  {
    label: 'Admin klien',
    value: 'Tenant scoped',
    description: 'Hanya mengelola data workspace miliknya sendiri.',
    icon: UserCog,
    tone: 'border-violet-100 bg-violet-50 text-violet-800',
  },
  {
    label: 'Entitlement',
    value: 'Backend enforced',
    description: 'Paket, trial, dan fitur terkunci divalidasi di API.',
    icon: ClipboardCheck,
    tone: 'border-emerald-100 bg-emerald-50 text-emerald-800',
  },
  {
    label: 'Audit trail',
    value: 'Tercatat',
    description: 'Aksi tenant, user, subscription, dan sistem mudah ditelusuri.',
    icon: FileText,
    tone: 'border-amber-100 bg-amber-50 text-amber-800',
  },
]

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''
  try {
    stats.value = await adminService.getDashboardStats({ range: selectedRange.value })
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

function trendMax(data: Array<{ value: number }>) {
  return Math.max(1, ...data.map(item => item.value))
}

function trendHeight(value: number, data: Array<{ value: number }>) {
  return `${Math.max(8, Math.round((value / trendMax(data)) * 100))}%`
}

function formatTrendValue(value: number, unit: string) {
  return unit === 'currency' ? formatCurrency(value) : formatNumber(value)
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr))
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
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

function getAuditTone(category: string) {
  const tones: Record<string, string> = {
    security: 'bg-rose-50 text-rose-700',
    subscription: 'bg-amber-50 text-amber-700',
    workspace: 'bg-primary-50 text-primary-700',
    system: 'bg-purple-50 text-purple-700',
    user: 'bg-neutral-100 text-neutral-700',
  }
  return tones[category] ?? tones.user
}

onMounted(loadDashboard)
</script>

<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f5f7fb_42%,#ffffff_100%)] p-4 lg:p-8">
    <div class="mx-auto max-w-7xl space-y-6">
      <section class="overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-xl shadow-sky-900/5">
        <div class="grid gap-6 p-5 lg:grid-cols-[1.25fr_0.75fr] lg:p-7">
          <div>
            <div class="inline-flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-black uppercase text-primary-700">
              <ShieldCheck class="h-4 w-4" />
              Super admin control plane
            </div>
            <h2 class="mt-5 text-3xl font-black tracking-tight text-neutral-950 lg:text-4xl">
              <span class="sr-only">Admin Dashboard - </span>Platform Command Center
            </h2>
            <p class="mt-3 max-w-3xl text-base leading-7 text-neutral-600">
              Pantau tenant, paket, approval, data operasional klien, audit, dan risiko platform dari satu halaman kerja yang siap dipakai tim bisnis.
            </p>
            <div class="mt-6 flex flex-wrap gap-3">
              <button class="btn-primary" @click="navigateTo('/admin/workspaces')">
                <Building2 class="h-4 w-4" />
                Setup tenant baru
              </button>
              <button class="btn-secondary" @click="navigateTo('/admin/subscriptions')">
                <CreditCard class="h-4 w-4" />
                Kelola paket
              </button>
            </div>
          </div>
          <div class="rounded-2xl border border-neutral-100 bg-[linear-gradient(135deg,#f8fbff,#eef8ff)] p-5">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-bold text-neutral-500">Readiness platform</p>
                <p class="mt-1 text-2xl font-black text-neutral-950">Operational ready</p>
              </div>
              <button class="rounded-xl border border-white/80 bg-white px-3 py-2 text-sm font-bold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:text-primary-700" :disabled="loading" @click="loadDashboard">
                <RefreshCw :class="['mr-2 inline h-4 w-4', loading ? 'animate-spin' : '']" />
                Refresh
              </button>
            </div>
            <div class="mt-5 grid grid-cols-3 gap-3">
              <div class="rounded-2xl bg-white/85 p-3 text-center shadow-sm">
                <p class="text-xl font-black text-neutral-950">{{ formatNumber(stats?.active_workspaces ?? 0) }}</p>
                <p class="text-xs font-semibold text-neutral-500">tenant aktif</p>
              </div>
              <div class="rounded-2xl bg-white/85 p-3 text-center shadow-sm">
                <p class="text-xl font-black text-neutral-950">{{ formatNumber(stats?.pending_approvals ?? 0) }}</p>
                <p class="text-xs font-semibold text-neutral-500">approval</p>
              </div>
              <div class="rounded-2xl bg-white/85 p-3 text-center shadow-sm">
                <p class="text-xl font-black text-neutral-950">{{ formatNumber(stats?.low_stock_items ?? 0) }}</p>
                <p class="text-xs font-semibold text-neutral-500">low stock</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div v-if="errorMessage" class="rounded-2xl border border-danger-100 bg-danger-50 p-4 text-sm font-medium text-danger-700">
        {{ errorMessage }}
      </div>

      <div v-if="loading" class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div v-for="index in 4" :key="index" class="h-36 animate-pulse rounded-3xl border border-white bg-white p-5 shadow-sm">
          <div class="h-11 w-11 rounded-2xl bg-neutral-100"></div>
          <div class="mt-5 h-6 w-24 rounded bg-neutral-100"></div>
          <div class="mt-2 h-4 w-32 rounded bg-neutral-100"></div>
        </div>
      </div>

      <template v-else-if="stats">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article v-for="card in platformCards" :key="card.label" class="rounded-3xl border border-white bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-900/5">
            <div :class="['flex h-12 w-12 items-center justify-center rounded-2xl ring-1', card.tone]">
              <component :is="card.icon" class="h-6 w-6" />
            </div>
            <p class="mt-5 text-3xl font-black text-neutral-950">{{ card.value }}</p>
            <p class="mt-1 text-sm font-bold text-neutral-700">{{ card.label }}</p>
            <p class="mt-2 text-sm leading-5 text-neutral-500">{{ card.caption }}</p>
          </article>
        </div>

        <section class="rounded-3xl border border-white bg-white p-5 shadow-sm lg:p-6">
          <div class="flex flex-col gap-3 border-b border-neutral-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-xl font-black text-neutral-950">Tren revenue dan operasi SaaS</h3>
              <p class="mt-1 text-sm text-neutral-500">Grafik aktual dari subscription, add-on, tenant growth, request approval, dan mutasi stok.</p>
            </div>
            <select v-model="selectedRange" class="input max-w-44" @change="loadDashboard">
              <option v-for="option in rangeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="mt-5 grid gap-4 xl:grid-cols-4">
            <article v-for="trend in trendCards" :key="trend.label" class="rounded-2xl border border-neutral-100 bg-[#fbfdff] p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-black text-neutral-950">{{ trend.label }}</p>
                  <p class="mt-1 text-xs text-neutral-500">{{ trend.caption }}</p>
                </div>
                <p class="text-xs font-black text-neutral-500">{{ formatTrendValue(trend.data.at(-1)?.value ?? 0, trend.unit) }}</p>
              </div>
              <div class="mt-5 flex h-36 items-end gap-1 rounded-xl bg-white px-2 py-3">
                <div v-for="point in trend.data" :key="`${trend.label}-${point.label}`" class="group relative flex h-full flex-1 items-end">
                  <div :class="['w-full rounded-t-md transition group-hover:opacity-80', trend.tone]" :style="{ height: trendHeight(point.value, trend.data) }"></div>
                  <div class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg bg-neutral-950 px-2 py-1 text-xs font-bold text-white shadow-lg group-hover:block">
                    {{ point.label }} - {{ formatTrendValue(point.value, trend.unit) }}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <div class="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <section class="rounded-3xl border border-white bg-white p-5 shadow-sm lg:p-6">
            <div class="flex flex-col gap-3 border-b border-neutral-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 class="text-xl font-black text-neutral-950">Performa operasional lintas tenant</h3>
                <p class="mt-1 text-sm text-neutral-500">Ringkasan data yang mendukung gudang, supplier, produk, dan mutasi.</p>
              </div>
              <button class="text-sm font-black text-primary-700 transition hover:text-primary-900" @click="navigateTo('/admin/client-warehouse')">
                Kelola data klien
              </button>
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article v-for="item in operationCards" :key="item.label" class="rounded-2xl border border-neutral-100 bg-[#fbfdff] p-4">
                <component :is="item.icon" class="h-5 w-5 text-primary-700" />
                <p class="mt-4 text-2xl font-black text-neutral-950">{{ item.value }}</p>
                <p class="mt-1 text-sm font-bold text-neutral-800">{{ item.label }}</p>
                <p class="mt-1 text-xs leading-5 text-neutral-500">{{ item.caption }}</p>
              </article>
            </div>

            <div class="mt-6 grid gap-3 md:grid-cols-3">
              <article v-for="signal in riskSignals" :key="signal.label" :class="['rounded-2xl border p-4', signal.tone]">
                <p class="text-2xl font-black">{{ formatNumber(signal.value) }}</p>
                <p class="mt-1 text-sm font-black">{{ signal.label }}</p>
                <p class="mt-2 text-xs leading-5 opacity-80">{{ signal.description }}</p>
              </article>
            </div>
          </section>

          <section class="rounded-3xl border border-white bg-white p-5 shadow-sm lg:p-6">
            <div class="flex items-center justify-between border-b border-neutral-100 pb-5">
              <div>
                <h3 class="text-xl font-black text-neutral-950">Kesehatan sistem</h3>
                <p class="mt-1 text-sm text-neutral-500">API, database, dan permission engine.</p>
              </div>
              <Activity class="h-5 w-5 text-neutral-400" />
            </div>
            <div class="mt-5 space-y-3">
              <div v-for="service in stats.system_health" :key="service.service" class="flex items-center justify-between gap-3 rounded-2xl bg-neutral-50 p-3">
                <div class="flex min-w-0 items-center gap-3">
                  <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
                    <CheckCircle2 v-if="service.status === 'healthy'" class="h-5 w-5 text-success-600" />
                    <AlertCircle v-else class="h-5 w-5 text-warning-600" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black text-neutral-900">{{ service.service }}</p>
                    <p class="truncate text-xs text-neutral-500">{{ service.uptime }}</p>
                  </div>
                </div>
                <span :class="['rounded-full px-2.5 py-1 text-xs font-black', getStatusBadge(service.status)]">
                  {{ service.status === 'healthy' ? 'Sehat' : 'Perlu cek' }}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section class="rounded-3xl border border-white bg-white p-5 shadow-sm lg:p-6">
            <div class="flex items-center justify-between border-b border-neutral-100 pb-5">
              <div>
                <h3 class="text-xl font-black text-neutral-950">Distribusi paket</h3>
                <p class="mt-1 text-sm text-neutral-500">Monitoring tenant berdasarkan paket aktif.</p>
              </div>
              <button class="text-sm font-black text-primary-700 transition hover:text-primary-900" @click="navigateTo('/admin/subscriptions')">
                Detail paket
              </button>
            </div>
            <div class="mt-5 space-y-4">
              <div v-for="plan in stats.plan_distribution" :key="plan.plan" class="space-y-2">
                <div class="flex items-center justify-between gap-3">
                  <span :class="['rounded-full px-3 py-1 text-xs font-black', getPlanBadge(plan.plan)]">
                    {{ labelFrom(planLabels, plan.plan) }}
                  </span>
                  <span class="text-sm font-bold text-neutral-700">{{ plan.count }} tenant</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div class="h-full rounded-full bg-primary-600" :style="{ width: `${totalPlans ? (plan.count / totalPlans) * 100 : 0}%` }"></div>
                </div>
              </div>
            </div>
          </section>

          <section class="rounded-3xl border border-white bg-white p-5 shadow-sm lg:p-6">
            <div class="flex items-center justify-between border-b border-neutral-100 pb-5">
              <div>
                <h3 class="text-xl font-black text-neutral-950">Audit dan aktivitas terbaru</h3>
                <p class="mt-1 text-sm text-neutral-500">Perubahan penting dari tenant, user, subscription, dan sistem.</p>
              </div>
              <button class="text-sm font-black text-primary-700 transition hover:text-primary-900" @click="navigateTo('/admin/audit-logs')">
                Lihat audit
              </button>
            </div>

            <div v-if="(stats.recent_audit_logs ?? []).length === 0" class="mt-5 rounded-2xl border border-dashed border-neutral-200 p-6 text-center">
              <FileText class="mx-auto h-10 w-10 text-neutral-300" />
              <p class="mt-3 text-sm font-bold text-neutral-700">Belum ada audit terbaru.</p>
              <p class="mt-1 text-sm text-neutral-500">Aktivitas tenant akan tampil di sini setelah sistem digunakan.</p>
            </div>
            <div v-else class="mt-5 space-y-3">
              <article v-for="log in stats.recent_audit_logs" :key="log.id" class="rounded-2xl border border-neutral-100 bg-[#fbfdff] p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black text-neutral-950">{{ log.action }}</p>
                    <p class="mt-1 truncate text-xs text-neutral-500">
                      {{ log.workspace?.name ?? 'Platform' }} - {{ log.user?.name ?? 'System' }} - {{ formatDate(log.created_at) }}
                    </p>
                  </div>
                  <span :class="['rounded-full px-2.5 py-1 text-xs font-black', getAuditTone(log.category)]">
                    {{ log.category }}
                  </span>
                </div>
              </article>
            </div>
          </section>
        </div>

        <section class="rounded-2xl border border-white bg-white p-5 shadow-sm lg:p-6">
          <div class="flex flex-col gap-3 border-b border-neutral-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-xl font-black text-neutral-950">Role, permission, dan governance</h3>
              <p class="mt-1 text-sm text-neutral-500">Kontrol akses dipisah jelas antara platform dan tenant agar operasional SaaS tetap aman.</p>
            </div>
            <button class="text-sm font-black text-primary-700 transition hover:text-primary-900" @click="navigateTo('/admin/users')">
              Kelola role
            </button>
          </div>
          <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article v-for="item in governanceCards" :key="item.label" :class="['rounded-lg border p-4', item.tone]">
              <div class="flex items-center justify-between gap-3">
                <component :is="item.icon" class="h-5 w-5" />
                <span class="rounded-full bg-white/70 px-2.5 py-1 text-xs font-black">{{ item.label }}</span>
              </div>
              <p class="mt-4 text-lg font-black">{{ item.value }}</p>
              <p class="mt-2 text-sm leading-5 opacity-80">{{ item.description }}</p>
            </article>
          </div>
        </section>

        <div class="grid gap-6 xl:grid-cols-2">
          <section class="rounded-3xl border border-white bg-white p-5 shadow-sm lg:p-6">
            <div class="flex items-center justify-between border-b border-neutral-100 pb-5">
              <div>
                <h3 class="text-xl font-black text-neutral-950">Tenant terbaru</h3>
                <p class="mt-1 text-sm text-neutral-500">Workspace baru dan owner yang perlu di-follow-up.</p>
              </div>
              <button class="text-sm font-black text-primary-700 transition hover:text-primary-900" @click="navigateTo('/admin/workspaces')">
                Lihat semua
              </button>
            </div>
            <div v-if="stats.recent_workspaces.length === 0" class="mt-5 rounded-2xl border border-dashed border-neutral-200 p-6 text-sm text-neutral-500">
              Belum ada tenant.
            </div>
            <div v-else class="mt-5 divide-y divide-neutral-100">
              <div v-for="workspace in stats.recent_workspaces" :key="workspace.id" class="flex items-center gap-4 py-4">
                <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-50">
                  <Building2 class="h-5 w-5 text-primary-700" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-black text-neutral-950">{{ workspace.name }}</p>
                  <p class="truncate text-xs text-neutral-500">{{ workspace.users ?? 0 }} user - dibuat {{ formatDate(workspace.created_at) }}</p>
                </div>
                <span class="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-black text-neutral-700">
                  {{ labelFrom(workspaceStatusLabels, workspace.status) }}
                </span>
              </div>
            </div>
          </section>

          <section class="rounded-3xl border border-white bg-white p-5 shadow-sm lg:p-6">
            <div class="flex items-center justify-between border-b border-neutral-100 pb-5">
              <div>
                <h3 class="text-xl font-black text-neutral-950">User terbaru</h3>
                <p class="mt-1 text-sm text-neutral-500">Akses tenant dan role yang baru dibuat.</p>
              </div>
              <button class="text-sm font-black text-primary-700 transition hover:text-primary-900" @click="navigateTo('/admin/users')">
                Kelola akses
              </button>
            </div>
            <div v-if="stats.recent_users.length === 0" class="mt-5 rounded-2xl border border-dashed border-neutral-200 p-6 text-sm text-neutral-500">
              Belum ada user tenant.
            </div>
            <div v-else class="mt-5 divide-y divide-neutral-100">
              <div v-for="user in stats.recent_users" :key="`${user.workspace_id}-${user.id}`" class="flex items-center gap-4 py-4">
                <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-sky-50">
                  <span class="text-sm font-black text-sky-700">{{ user.name.charAt(0) }}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-black text-neutral-950">{{ user.name }}</p>
                  <p class="truncate text-xs text-neutral-500">{{ user.workspace_name }} - {{ labelFrom(roleLabels, user.role) }}</p>
                  <p class="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                    <Clock class="h-3.5 w-3.5" />
                    Login terakhir {{ formatDateTime(user.last_login_at) }}
                  </p>
                </div>
                <span :class="['rounded-full px-2.5 py-1 text-xs font-black', getPlanBadge(user.plan)]">
                  {{ labelFrom(planLabels, user.plan) }}
                </span>
              </div>
            </div>
          </section>
        </div>

        <section class="rounded-2xl border border-white bg-white p-5 shadow-sm lg:p-6">
          <div class="flex items-center gap-3 border-b border-neutral-100 pb-5">
            <Layers3 class="h-5 w-5 text-primary-700" />
            <div>
              <h3 class="text-xl font-black text-neutral-950">Aksi super admin</h3>
              <p class="mt-1 text-sm text-neutral-500">Jalur kerja utama untuk mengelola tenant, paket, gudang, dan audit.</p>
            </div>
          </div>
          <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button v-for="action in quickActions" :key="action.label" class="group rounded-2xl border border-neutral-100 bg-[#fbfdff] p-4 text-left transition hover:-translate-y-1 hover:border-primary-100 hover:bg-white hover:shadow-soft" @click="navigateTo(action.path)">
              <component :is="action.icon" class="h-6 w-6 text-primary-700 transition group-hover:scale-110" />
              <p class="mt-4 text-sm font-black text-neutral-950">{{ action.label }}</p>
              <p class="mt-1 text-xs leading-5 text-neutral-500">{{ action.caption }}</p>
            </button>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
