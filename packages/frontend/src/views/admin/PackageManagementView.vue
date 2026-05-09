<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Archive, CheckCircle2, Gift, Layers3, PackagePlus, RefreshCw, Save, ShieldCheck } from 'lucide-vue-next'
import adminService, { type Addon, type FeatureKey, type PlanPackage } from '@/services/api/admin'

const featureLabels: Record<FeatureKey, string> = {
  stockInOut: 'Stock masuk/keluar',
  multiWarehouse: 'Multi gudang',
  analytics: 'Analytics',
  exportPDF: 'Export PDF',
  batchImport: 'Import CSV',
  reports: 'Laporan',
}

const limitLabels = {
  warehouses: 'Gudang',
  products: 'Produk',
  users: 'User',
}

const packages = ref<PlanPackage[]>([])
const addons = ref<Addon[]>([])
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const selectedPackageId = ref<string | null>(null)
const selectedAddonId = ref<string | null>(null)

const blankFeatures = (): Record<FeatureKey, boolean> => ({
  stockInOut: false,
  multiWarehouse: false,
  analytics: false,
  exportPDF: false,
  batchImport: false,
  reports: true,
})

const packageForm = ref({
  code: '',
  name: '',
  description: '',
  status: 'active' as 'active' | 'archived',
  monthly_price: 0,
  yearly_price: 0,
  original_monthly_price: 0,
  trial_days: 0,
  sort_order: 100,
  limits: { warehouses: 1, products: 100, users: 1 },
  features: blankFeatures(),
})

const addonForm = ref({
  code: '',
  name: '',
  description: '',
  status: 'active' as 'active' | 'archived',
  monthly_price: 0,
  yearly_price: 0,
  feature_key: '' as FeatureKey | '',
  limit_key: '' as keyof typeof limitLabels | '',
  limit_increment: 0,
  sort_order: 100,
})

const activePackages = computed(() => packages.value.filter(item => item.status === 'active').length)
const activeAddons = computed(() => addons.value.filter(item => item.status === 'active').length)
const monthlyPackageRevenue = computed(() => packages.value.filter(item => item.status === 'active').reduce((sum, item) => sum + item.monthly_price, 0))

function normalizeCode(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '')
}

function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount ?? 0)
}

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [packageRows, addonRows] = await Promise.all([
      adminService.getPackages(),
      adminService.getAddons(),
    ])
    packages.value = packageRows
    addons.value = addonRows
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Data paket dan add-on gagal dimuat'
  } finally {
    loading.value = false
  }
}

function resetPackageForm() {
  selectedPackageId.value = null
  packageForm.value = {
    code: '',
    name: '',
    description: '',
    status: 'active',
    monthly_price: 0,
    yearly_price: 0,
    original_monthly_price: 0,
    trial_days: 0,
    sort_order: 100,
    limits: { warehouses: 1, products: 100, users: 1 },
    features: blankFeatures(),
  }
}

function editPackage(planPackage: PlanPackage) {
  selectedPackageId.value = planPackage.id
  packageForm.value = {
    code: planPackage.code,
    name: planPackage.name,
    description: planPackage.description ?? '',
    status: planPackage.status,
    monthly_price: planPackage.monthly_price,
    yearly_price: planPackage.yearly_price ?? 0,
    original_monthly_price: planPackage.original_monthly_price ?? 0,
    trial_days: planPackage.trial_days,
    sort_order: planPackage.sort_order,
    limits: { ...planPackage.limits },
    features: { ...blankFeatures(), ...planPackage.features },
  }
}

async function savePackage() {
  saving.value = true
  errorMessage.value = ''
  try {
    const payload = {
      ...packageForm.value,
      code: normalizeCode(packageForm.value.code),
      description: packageForm.value.description || null,
      yearly_price: packageForm.value.yearly_price || null,
      original_monthly_price: packageForm.value.original_monthly_price || null,
    }
    if (selectedPackageId.value) {
      await adminService.updatePackage(selectedPackageId.value, payload)
    } else {
      await adminService.createPackage(payload)
    }
    resetPackageForm()
    await loadData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Paket gagal disimpan'
  } finally {
    saving.value = false
  }
}

async function archivePackage(planPackage: PlanPackage) {
  if (!confirm(`Arsipkan paket ${planPackage.name}? Tenant aktif tidak akan otomatis berubah.`)) return
  await adminService.archivePackage(planPackage.id)
  await loadData()
}

function resetAddonForm() {
  selectedAddonId.value = null
  addonForm.value = {
    code: '',
    name: '',
    description: '',
    status: 'active',
    monthly_price: 0,
    yearly_price: 0,
    feature_key: '',
    limit_key: '',
    limit_increment: 0,
    sort_order: 100,
  }
}

function editAddon(addon: Addon) {
  selectedAddonId.value = addon.id
  addonForm.value = {
    code: addon.code,
    name: addon.name,
    description: addon.description ?? '',
    status: addon.status,
    monthly_price: addon.monthly_price,
    yearly_price: addon.yearly_price ?? 0,
    feature_key: addon.feature_key ?? '',
    limit_key: addon.limit_key ?? '',
    limit_increment: addon.limit_increment ?? 0,
    sort_order: addon.sort_order,
  }
}

async function saveAddon() {
  saving.value = true
  errorMessage.value = ''
  try {
    const payload = {
      ...addonForm.value,
      code: normalizeCode(addonForm.value.code),
      description: addonForm.value.description || null,
      yearly_price: addonForm.value.yearly_price || null,
      feature_key: addonForm.value.feature_key || null,
      limit_key: addonForm.value.limit_key || null,
      limit_increment: addonForm.value.limit_increment || null,
    }
    if (selectedAddonId.value) {
      await adminService.updateAddon(selectedAddonId.value, payload)
    } else {
      await adminService.createAddon(payload)
    }
    resetAddonForm()
    await loadData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Add-on gagal disimpan'
  } finally {
    saving.value = false
  }
}

async function archiveAddon(addon: Addon) {
  if (!confirm(`Arsipkan add-on ${addon.name}? Assignment aktif tetap tercatat.`)) return
  await adminService.archiveAddon(addon.id)
  await loadData()
}

onMounted(loadData)
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-neutral-900">Paket Produk & Add-on</h2>
        <p class="text-neutral-600">Kelola katalog monetisasi tanpa mengubah kode aplikasi.</p>
      </div>
      <button class="btn-secondary" :disabled="loading" @click="loadData">
        <RefreshCw :class="['h-4 w-4', loading ? 'animate-spin' : '']" />
        Refresh
      </button>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-danger-100 bg-danger-50 p-4 text-sm text-danger-700">
      {{ errorMessage }}
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="card p-5">
        <Layers3 class="mb-3 h-7 w-7 text-primary-700" />
        <p class="text-sm text-neutral-500">Paket aktif</p>
        <p class="text-2xl font-black text-neutral-950">{{ activePackages }}</p>
      </div>
      <div class="card p-5">
        <Gift class="mb-3 h-7 w-7 text-emerald-700" />
        <p class="text-sm text-neutral-500">Add-on aktif</p>
        <p class="text-2xl font-black text-neutral-950">{{ activeAddons }}</p>
      </div>
      <div class="card p-5">
        <ShieldCheck class="mb-3 h-7 w-7 text-amber-700" />
        <p class="text-sm text-neutral-500">Total harga paket</p>
        <p class="text-2xl font-black text-neutral-950">{{ formatCurrency(monthlyPackageRevenue) }}</p>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section class="card p-5">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-neutral-900">{{ selectedPackageId ? 'Edit paket' : 'Paket baru' }}</h3>
            <p class="text-sm text-neutral-500">Fitur dan limit menjadi source-of-truth entitlement.</p>
          </div>
          <button v-if="selectedPackageId" class="btn-secondary btn-sm" @click="resetPackageForm">Batal edit</button>
        </div>

        <form class="space-y-4" @submit.prevent="savePackage">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label">Kode</label>
              <input v-model="packageForm.code" class="input w-full" placeholder="growth-plus" required />
            </div>
            <div>
              <label class="label">Nama</label>
              <input v-model="packageForm.name" class="input w-full" placeholder="Growth Plus" required />
            </div>
          </div>
          <div>
            <label class="label">Deskripsi</label>
            <textarea v-model="packageForm.description" class="input min-h-[76px] w-full" placeholder="Untuk operasional gudang yang sedang berkembang"></textarea>
          </div>
          <div class="grid gap-4 sm:grid-cols-4">
            <div>
              <label class="label">Bulanan</label>
              <input v-model.number="packageForm.monthly_price" type="number" min="0" class="input w-full" />
            </div>
            <div>
              <label class="label">Tahunan</label>
              <input v-model.number="packageForm.yearly_price" type="number" min="0" class="input w-full" />
            </div>
            <div>
              <label class="label">Trial</label>
              <input v-model.number="packageForm.trial_days" type="number" min="0" class="input w-full" />
            </div>
            <div>
              <label class="label">Urutan</label>
              <input v-model.number="packageForm.sort_order" type="number" min="0" class="input w-full" />
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <div v-for="(_, key) in packageForm.limits" :key="key">
              <label class="label">{{ limitLabels[key] }}</label>
              <input v-model.number="packageForm.limits[key]" type="number" min="1" class="input w-full" />
            </div>
          </div>
          <div class="grid gap-2 sm:grid-cols-2">
            <label v-for="(_, feature) in packageForm.features" :key="feature" class="flex items-center gap-2 rounded-lg border border-neutral-100 p-3 text-sm font-medium text-neutral-700">
              <input v-model="packageForm.features[feature]" type="checkbox" class="h-4 w-4 rounded border-neutral-300 text-primary-600" />
              {{ featureLabels[feature] }}
            </label>
          </div>
          <button class="btn-primary w-full" :disabled="saving">
            <Save class="h-4 w-4" />
            Simpan Paket
          </button>
        </form>
      </section>

      <section class="card overflow-hidden">
        <div class="border-b border-neutral-100 p-5">
          <h3 class="font-bold text-neutral-900">Katalog paket</h3>
        </div>
        <div class="divide-y divide-neutral-100">
          <div v-if="loading" class="p-5 text-sm text-neutral-500">Memuat paket...</div>
          <div v-else-if="packages.length === 0" class="p-5 text-sm text-neutral-500">Belum ada paket.</div>
          <template v-else>
            <article v-for="planPackage in packages" :key="planPackage.id" class="p-5">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="font-black text-neutral-950">{{ planPackage.name }}</h4>
                    <span class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-600">{{ planPackage.code }}</span>
                  </div>
                  <p class="mt-1 text-sm text-neutral-500">{{ planPackage.description || 'Tidak ada deskripsi' }}</p>
                  <p class="mt-2 text-sm font-bold text-neutral-900">{{ formatCurrency(planPackage.monthly_price) }}/bulan</p>
                </div>
                <div class="flex items-center gap-2">
                  <button class="btn-secondary btn-sm" @click="editPackage(planPackage)">Edit</button>
                  <button class="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-danger-600" title="Arsipkan" @click="archivePackage(planPackage)">
                    <Archive class="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div class="mt-4 flex flex-wrap gap-2">
                <span v-for="(enabled, feature) in planPackage.features" :key="feature" :class="['rounded-full px-2.5 py-1 text-xs font-bold', enabled ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-400']">
                  {{ featureLabels[feature] }}
                </span>
              </div>
            </article>
          </template>
        </div>
      </section>
    </div>

    <div class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section class="card p-5">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-neutral-900">{{ selectedAddonId ? 'Edit add-on' : 'Add-on baru' }}</h3>
            <p class="text-sm text-neutral-500">Add-on dapat membuka fitur atau menambah limit tenant.</p>
          </div>
          <button v-if="selectedAddonId" class="btn-secondary btn-sm" @click="resetAddonForm">Batal edit</button>
        </div>

        <form class="space-y-4" @submit.prevent="saveAddon">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label">Kode</label>
              <input v-model="addonForm.code" class="input w-full" placeholder="extra-users" required />
            </div>
            <div>
              <label class="label">Nama</label>
              <input v-model="addonForm.name" class="input w-full" placeholder="Extra User" required />
            </div>
          </div>
          <div>
            <label class="label">Deskripsi</label>
            <textarea v-model="addonForm.description" class="input min-h-[76px] w-full" placeholder="Tambahan kapasitas user untuk tenant aktif"></textarea>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label">Fitur yang dibuka</label>
              <select v-model="addonForm.feature_key" class="input w-full">
                <option value="">Tidak membuka fitur</option>
                <option v-for="(_, feature) in featureLabels" :key="feature" :value="feature">{{ featureLabels[feature] }}</option>
              </select>
            </div>
            <div>
              <label class="label">Limit yang ditambah</label>
              <select v-model="addonForm.limit_key" class="input w-full">
                <option value="">Tidak menambah limit</option>
                <option v-for="(label, key) in limitLabels" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-4">
            <div>
              <label class="label">Tambahan</label>
              <input v-model.number="addonForm.limit_increment" type="number" min="0" class="input w-full" />
            </div>
            <div>
              <label class="label">Bulanan</label>
              <input v-model.number="addonForm.monthly_price" type="number" min="0" class="input w-full" />
            </div>
            <div>
              <label class="label">Tahunan</label>
              <input v-model.number="addonForm.yearly_price" type="number" min="0" class="input w-full" />
            </div>
            <div>
              <label class="label">Urutan</label>
              <input v-model.number="addonForm.sort_order" type="number" min="0" class="input w-full" />
            </div>
          </div>
          <button class="btn-primary w-full" :disabled="saving">
            <PackagePlus class="h-4 w-4" />
            Simpan Add-on
          </button>
        </form>
      </section>

      <section class="card overflow-hidden">
        <div class="border-b border-neutral-100 p-5">
          <h3 class="font-bold text-neutral-900">Katalog add-on</h3>
        </div>
        <div class="divide-y divide-neutral-100">
          <div v-if="loading" class="p-5 text-sm text-neutral-500">Memuat add-on...</div>
          <div v-else-if="addons.length === 0" class="p-5 text-sm text-neutral-500">Belum ada add-on.</div>
          <template v-else>
            <article v-for="addon in addons" :key="addon.id" class="p-5">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="font-black text-neutral-950">{{ addon.name }}</h4>
                    <span class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-600">{{ addon.code }}</span>
                  </div>
                  <p class="mt-1 text-sm text-neutral-500">{{ addon.description || 'Tidak ada deskripsi' }}</p>
                  <div class="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    <span v-if="addon.feature_key" class="rounded-full bg-success-50 px-2 py-1 text-success-700">
                      <CheckCircle2 class="mr-1 inline h-3.5 w-3.5" />
                      {{ featureLabels[addon.feature_key] }}
                    </span>
                    <span v-if="addon.limit_key" class="rounded-full bg-primary-50 px-2 py-1 text-primary-700">
                      +{{ addon.limit_increment ?? 0 }} {{ limitLabels[addon.limit_key] }}
                    </span>
                  </div>
                  <p class="mt-2 text-sm font-bold text-neutral-900">{{ formatCurrency(addon.monthly_price) }}/bulan</p>
                </div>
                <div class="flex items-center gap-2">
                  <button class="btn-secondary btn-sm" @click="editAddon(addon)">Edit</button>
                  <button class="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-danger-600" title="Arsipkan" @click="archiveAddon(addon)">
                    <Archive class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>
