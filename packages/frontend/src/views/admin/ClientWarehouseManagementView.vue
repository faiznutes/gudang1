<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowDownToLine, ArrowUpFromLine, Ban, CheckCircle2, ClipboardList, Package, Pencil, Plus, RefreshCw, Save, Trash2, Truck, Warehouse } from 'lucide-vue-next'
import adminService, { type ManagedProduct, type ManagedSupplier, type ManagedWarehouse, type ScheduledActivity, type Workspace, type WorkspaceInventorySummary } from '@/services/api/admin'

const workspaces = ref<Workspace[]>([])
const selectedWorkspaceId = ref('')
const products = ref<ManagedProduct[]>([])
const warehouses = ref<ManagedWarehouse[]>([])
const suppliers = ref<ManagedSupplier[]>([])
const activities = ref<ScheduledActivity[]>([])
const inventorySummary = ref<WorkspaceInventorySummary | null>(null)
const activeTab = ref<'products' | 'warehouses' | 'suppliers' | 'stock' | 'activities'>('products')
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const productForm = ref({ id: '', sku: '', name: '', category: 'Umum', description: '', min_stock: 0, price: 0 })
const warehouseForm = ref({ id: '', name: '', address: '', is_default: false })
const supplierForm = ref({ id: '', name: '', contact_person: '', phone: '', email: '', address: '', notes: '' })
const activityForm = ref({ id: '', title: '', type: 'task', status: 'pending', description: '', due_at: '' })
const stockForm = ref({ product_id: '', warehouse_id: '', to_warehouse_id: '', quantity: 1, notes: '', type: 'in' as 'in' | 'out' | 'transfer' })

const selectedWorkspace = computed(() => workspaces.value.find(workspace => workspace.id === selectedWorkspaceId.value))

function nextTransferWarehouseId(sourceId = stockForm.value.warehouse_id) {
  return warehouses.value.find(warehouse => !warehouse.disabled_at && warehouse.id !== sourceId)?.id ?? ''
}

function syncTransferDestination() {
  const destination = warehouses.value.find(warehouse => warehouse.id === stockForm.value.to_warehouse_id)
  if (stockForm.value.type === 'transfer' && (!destination || destination.disabled_at || destination.id === stockForm.value.warehouse_id)) {
    stockForm.value.to_warehouse_id = nextTransferWarehouseId()
  }
}

async function loadWorkspaces() {
  const response = await adminService.getWorkspaces(1, {})
  workspaces.value = response.data
  if (!selectedWorkspaceId.value && response.data[0]) {
    selectedWorkspaceId.value = response.data[0].id
  }
}

async function loadClientData() {
  if (!selectedWorkspaceId.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const [productData, warehouseData, activityData] = await Promise.all([
      adminService.getWorkspaceProducts(selectedWorkspaceId.value),
      adminService.getWorkspaceWarehouses(selectedWorkspaceId.value),
      adminService.getScheduledActivities(selectedWorkspaceId.value),
    ])
    const [supplierData, inventoryData] = await Promise.all([
      adminService.getWorkspaceSuppliers(selectedWorkspaceId.value),
      adminService.getWorkspaceInventorySummary(selectedWorkspaceId.value),
    ])
    products.value = productData
    warehouses.value = warehouseData
    activities.value = activityData
    suppliers.value = supplierData
    inventorySummary.value = inventoryData
    stockForm.value.product_id = productData.find(product => !product.disabled_at)?.id ?? productData[0]?.id ?? ''
    stockForm.value.warehouse_id = warehouseData.find(warehouse => !warehouse.disabled_at)?.id ?? warehouseData[0]?.id ?? ''
    stockForm.value.to_warehouse_id = nextTransferWarehouseId()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Data gudang klien gagal dimuat'
  } finally {
    loading.value = false
  }
}

function clearSupplierForm() {
  supplierForm.value = { id: '', name: '', contact_person: '', phone: '', email: '', address: '', notes: '' }
}

function editSupplier(supplier: ManagedSupplier) {
  supplierForm.value = {
    id: supplier.id,
    name: supplier.name,
    contact_person: supplier.contact_person ?? '',
    phone: supplier.phone ?? '',
    email: supplier.email ?? '',
    address: supplier.address ?? '',
    notes: supplier.notes ?? '',
  }
}

async function saveSupplier() {
  if (!selectedWorkspaceId.value) return
  saving.value = true
  try {
    if (supplierForm.value.id) {
      await adminService.updateWorkspaceSupplier(selectedWorkspaceId.value, supplierForm.value.id, supplierForm.value)
      successMessage.value = 'Supplier klien diperbarui'
    } else {
      await adminService.createWorkspaceSupplier(selectedWorkspaceId.value, supplierForm.value)
      successMessage.value = 'Supplier klien ditambahkan'
    }
    clearSupplierForm()
    await loadClientData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Supplier gagal disimpan'
  } finally {
    saving.value = false
  }
}

async function toggleSupplier(supplier: ManagedSupplier) {
  if (!selectedWorkspaceId.value) return
  if (supplier.disabled_at) await adminService.enableWorkspaceSupplier(selectedWorkspaceId.value, supplier.id)
  else await adminService.disableWorkspaceSupplier(selectedWorkspaceId.value, supplier.id)
  await loadClientData()
}

async function removeSupplier(supplier: ManagedSupplier) {
  if (!selectedWorkspaceId.value || !confirm(`Hapus permanen supplier ${supplier.name}?`)) return
  await adminService.removeWorkspaceSupplier(selectedWorkspaceId.value, supplier.id)
  await loadClientData()
}

async function saveStockOperation() {
  if (!selectedWorkspaceId.value) return
  saving.value = true
  try {
    const payload = {
      product_id: stockForm.value.product_id,
      warehouse_id: stockForm.value.warehouse_id,
      quantity: stockForm.value.quantity,
      notes: stockForm.value.notes,
    }
    if (stockForm.value.type === 'in') await adminService.adminStockIn(selectedWorkspaceId.value, payload)
    else if (stockForm.value.type === 'out') await adminService.adminStockOut(selectedWorkspaceId.value, payload)
    else await adminService.adminStockTransfer(selectedWorkspaceId.value, { ...payload, to_warehouse_id: stockForm.value.to_warehouse_id })
    successMessage.value = 'Stok tenant diperbarui'
    await loadClientData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Operasi stok gagal'
  } finally {
    saving.value = false
  }
}

function clearProductForm() {
  productForm.value = { id: '', sku: '', name: '', category: 'Umum', description: '', min_stock: 0, price: 0 }
}

function editProduct(product: ManagedProduct) {
  productForm.value = {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category?.name ?? 'Umum',
    description: product.description ?? '',
    min_stock: product.min_stock,
    price: product.price,
  }
}

async function saveProduct() {
  if (!selectedWorkspaceId.value) return
  saving.value = true
  try {
    if (productForm.value.id) {
      await adminService.updateWorkspaceProduct(selectedWorkspaceId.value, productForm.value.id, productForm.value)
      successMessage.value = 'Produk klien diperbarui'
    } else {
      await adminService.createWorkspaceProduct(selectedWorkspaceId.value, productForm.value)
      successMessage.value = 'Produk klien ditambahkan'
    }
    clearProductForm()
    await loadClientData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Produk gagal disimpan'
  } finally {
    saving.value = false
  }
}

async function toggleProduct(product: ManagedProduct) {
  if (!selectedWorkspaceId.value) return
  if (product.disabled_at) await adminService.enableWorkspaceProduct(selectedWorkspaceId.value, product.id)
  else await adminService.disableWorkspaceProduct(selectedWorkspaceId.value, product.id)
  await loadClientData()
}

async function removeProduct(product: ManagedProduct) {
  if (!selectedWorkspaceId.value || !confirm(`Hapus permanen produk ${product.name}? Jika ada histori stok, gunakan Nonaktifkan.`)) return
  try {
    await adminService.removeWorkspaceProduct(selectedWorkspaceId.value, product.id)
    await loadClientData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Produk tidak bisa dihapus permanen'
  }
}

function clearWarehouseForm() {
  warehouseForm.value = { id: '', name: '', address: '', is_default: false }
}

function editWarehouse(warehouse: ManagedWarehouse) {
  warehouseForm.value = {
    id: warehouse.id,
    name: warehouse.name,
    address: warehouse.address ?? '',
    is_default: warehouse.is_default,
  }
}

async function saveWarehouse() {
  if (!selectedWorkspaceId.value) return
  saving.value = true
  try {
    if (warehouseForm.value.id) {
      await adminService.updateWorkspaceWarehouse(selectedWorkspaceId.value, warehouseForm.value.id, warehouseForm.value)
      successMessage.value = 'Gudang klien diperbarui'
    } else {
      await adminService.createWorkspaceWarehouse(selectedWorkspaceId.value, warehouseForm.value)
      successMessage.value = 'Gudang klien ditambahkan'
    }
    clearWarehouseForm()
    await loadClientData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gudang gagal disimpan'
  } finally {
    saving.value = false
  }
}

async function toggleWarehouse(warehouse: ManagedWarehouse) {
  if (!selectedWorkspaceId.value) return
  if (warehouse.disabled_at) await adminService.enableWorkspaceWarehouse(selectedWorkspaceId.value, warehouse.id)
  else await adminService.disableWorkspaceWarehouse(selectedWorkspaceId.value, warehouse.id)
  await loadClientData()
}

async function removeWarehouse(warehouse: ManagedWarehouse) {
  if (!selectedWorkspaceId.value || !confirm(`Hapus permanen gudang ${warehouse.name}? Jika ada histori stok, gunakan Nonaktifkan.`)) return
  try {
    await adminService.removeWorkspaceWarehouse(selectedWorkspaceId.value, warehouse.id)
    await loadClientData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gudang tidak bisa dihapus permanen'
  }
}

function clearActivityForm() {
  activityForm.value = { id: '', title: '', type: 'task', status: 'pending', description: '', due_at: '' }
}

function editActivity(activity: ScheduledActivity) {
  activityForm.value = {
    id: activity.id,
    title: activity.title,
    type: activity.type,
    status: activity.status,
    description: activity.description ?? '',
    due_at: activity.due_at ? activity.due_at.slice(0, 16) : '',
  }
}

async function saveActivity() {
  if (!selectedWorkspaceId.value) return
  saving.value = true
  const payload = {
    ...activityForm.value,
    due_at: activityForm.value.due_at ? new Date(activityForm.value.due_at).toISOString() : null,
  }
  try {
    if (activityForm.value.id) {
      await adminService.updateScheduledActivity(selectedWorkspaceId.value, activityForm.value.id, payload)
      successMessage.value = 'Aktivitas diperbarui'
    } else {
      await adminService.createScheduledActivity(selectedWorkspaceId.value, payload)
      successMessage.value = 'Aktivitas dibuat'
    }
    clearActivityForm()
    await loadClientData()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Aktivitas gagal disimpan'
  } finally {
    saving.value = false
  }
}

async function toggleActivity(activity: ScheduledActivity) {
  if (!selectedWorkspaceId.value) return
  if (activity.disabled_at) await adminService.enableScheduledActivity(selectedWorkspaceId.value, activity.id)
  else await adminService.disableScheduledActivity(selectedWorkspaceId.value, activity.id)
  await loadClientData()
}

async function removeActivity(activity: ScheduledActivity) {
  if (!selectedWorkspaceId.value || !confirm(`Hapus permanen aktivitas ${activity.title}?`)) return
  await adminService.removeScheduledActivity(selectedWorkspaceId.value, activity.id)
  await loadClientData()
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

onMounted(async () => {
  await loadWorkspaces()
  await loadClientData()
})

watch(
  () => [stockForm.value.type, stockForm.value.warehouse_id, warehouses.value.map(warehouse => `${warehouse.id}:${warehouse.disabled_at ?? ''}`).join('|')],
  syncTransferDestination,
)
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-neutral-900">Gudang Klien</h2>
        <p class="text-neutral-600">Super admin dapat masuk ke data warehouse klien dan mengelola item operasional.</p>
      </div>
      <button class="btn-secondary" :disabled="loading" @click="loadClientData">
        <RefreshCw :class="['h-4 w-4', loading ? 'animate-spin' : '']" />
        Refresh
      </button>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-danger-100 bg-danger-50 p-4 text-sm text-danger-700">{{ errorMessage }}</div>
    <div v-if="successMessage" class="rounded-lg border border-success-100 bg-success-50 p-4 text-sm text-success-700">{{ successMessage }}</div>

    <div class="card p-4">
      <label class="label">Pilih Tenant</label>
      <select v-model="selectedWorkspaceId" class="input max-w-xl" @change="loadClientData">
        <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">
          {{ workspace.name }} - {{ workspace.plan }} - {{ workspace.status }}
        </option>
      </select>
      <p v-if="selectedWorkspace" class="mt-2 text-sm text-neutral-500">ID: {{ selectedWorkspace.id }}</p>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <button :class="['card p-4 text-left', activeTab === 'products' ? 'ring-2 ring-primary-500' : '']" @click="activeTab = 'products'">
        <Package class="h-5 w-5 text-primary-600" />
        <p class="mt-2 text-sm text-neutral-500">Produk</p>
        <p class="text-2xl font-bold text-neutral-900">{{ products.length }}</p>
      </button>
      <button :class="['card p-4 text-left', activeTab === 'warehouses' ? 'ring-2 ring-primary-500' : '']" @click="activeTab = 'warehouses'">
        <Warehouse class="h-5 w-5 text-success-600" />
        <p class="mt-2 text-sm text-neutral-500">Gudang</p>
        <p class="text-2xl font-bold text-neutral-900">{{ warehouses.length }}</p>
      </button>
      <button :class="['card p-4 text-left', activeTab === 'suppliers' ? 'ring-2 ring-primary-500' : '']" @click="activeTab = 'suppliers'">
        <Truck class="h-5 w-5 text-neutral-700" />
        <p class="mt-2 text-sm text-neutral-500">Supplier</p>
        <p class="text-2xl font-bold text-neutral-900">{{ suppliers.length }}</p>
      </button>
      <button :class="['card p-4 text-left', activeTab === 'stock' ? 'ring-2 ring-primary-500' : '']" @click="activeTab = 'stock'">
        <ArrowDownToLine class="h-5 w-5 text-primary-600" />
        <p class="mt-2 text-sm text-neutral-500">Total Stok</p>
        <p class="text-2xl font-bold text-neutral-900">{{ inventorySummary?.totals.stock ?? 0 }}</p>
      </button>
      <button :class="['card p-4 text-left', activeTab === 'activities' ? 'ring-2 ring-primary-500' : '']" @click="activeTab = 'activities'">
        <ClipboardList class="h-5 w-5 text-warning-600" />
        <p class="mt-2 text-sm text-neutral-500">Aktivitas</p>
        <p class="text-2xl font-bold text-neutral-900">{{ activities.length }}</p>
      </button>
    </div>

    <section v-if="activeTab === 'products'" class="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form class="card p-4 space-y-4" @submit.prevent="saveProduct">
        <h3 class="font-semibold text-neutral-900">{{ productForm.id ? 'Edit Produk' : 'Tambah Produk' }}</h3>
        <input v-model="productForm.sku" class="input" placeholder="SKU" required />
        <input v-model="productForm.name" class="input" placeholder="Nama produk" required />
        <input v-model="productForm.category" class="input" placeholder="Kategori" />
        <textarea v-model="productForm.description" class="input min-h-[80px]" placeholder="Deskripsi"></textarea>
        <input v-model.number="productForm.min_stock" class="input" type="number" min="0" placeholder="Minimum stok" />
        <input v-model.number="productForm.price" class="input" type="number" min="0" placeholder="Harga" />
        <div class="flex gap-2">
          <button class="btn-primary" :disabled="saving"><Save class="h-4 w-4" /> Simpan</button>
          <button type="button" class="btn-secondary" @click="clearProductForm">Reset</button>
        </div>
      </form>
      <div class="card overflow-hidden">
        <table class="w-full">
          <thead><tr><th class="table-header">Produk</th><th class="table-header">Stok Min</th><th class="table-header">Harga</th><th class="table-header">Status</th><th class="table-header text-right">Aksi</th></tr></thead>
          <tbody class="divide-y divide-neutral-100">
            <tr v-for="product in products" :key="product.id" class="hover:bg-neutral-50">
              <td class="table-cell"><p class="font-medium">{{ product.name }}</p><p class="text-xs text-neutral-500">{{ product.sku }} - {{ product.category?.name }}</p></td>
              <td class="table-cell">{{ product.min_stock }}</td>
              <td class="table-cell">{{ formatCurrency(product.price) }}</td>
              <td class="table-cell"><span :class="['badge', product.disabled_at ? 'badge-danger' : 'badge-success']">{{ product.disabled_at ? 'Nonaktif' : 'Aktif' }}</span></td>
              <td class="table-cell">
                <div class="flex justify-end gap-2">
                  <button class="rounded-lg p-1.5 hover:bg-neutral-100" @click="editProduct(product)"><Pencil class="h-4 w-4" /></button>
                  <button class="rounded-lg p-1.5 hover:bg-neutral-100" @click="toggleProduct(product)">
                    <CheckCircle2 v-if="product.disabled_at" class="h-4 w-4 text-success-600" />
                    <Ban v-else class="h-4 w-4 text-warning-600" />
                  </button>
                  <button class="rounded-lg p-1.5 hover:bg-danger-50" @click="removeProduct(product)"><Trash2 class="h-4 w-4 text-danger-600" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="activeTab === 'warehouses'" class="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form class="card p-4 space-y-4" @submit.prevent="saveWarehouse">
        <h3 class="font-semibold text-neutral-900">{{ warehouseForm.id ? 'Edit Gudang' : 'Tambah Gudang' }}</h3>
        <input v-model="warehouseForm.name" class="input" placeholder="Nama gudang" required />
        <textarea v-model="warehouseForm.address" class="input min-h-[80px]" placeholder="Alamat"></textarea>
        <label class="flex items-center gap-2 text-sm text-neutral-700"><input v-model="warehouseForm.is_default" type="checkbox" /> Jadikan gudang utama</label>
        <div class="flex gap-2">
          <button class="btn-primary" :disabled="saving"><Plus class="h-4 w-4" /> Simpan</button>
          <button type="button" class="btn-secondary" @click="clearWarehouseForm">Reset</button>
        </div>
      </form>
      <div class="card divide-y divide-neutral-100">
        <div v-for="warehouse in warehouses" :key="warehouse.id" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-medium text-neutral-900">{{ warehouse.name }}</p>
            <p class="text-sm text-neutral-500">{{ warehouse.address || '-' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span :class="['badge', warehouse.disabled_at ? 'badge-danger' : 'badge-success']">{{ warehouse.disabled_at ? 'Nonaktif' : 'Aktif' }}</span>
            <button class="rounded-lg p-1.5 hover:bg-neutral-100" @click="editWarehouse(warehouse)"><Pencil class="h-4 w-4" /></button>
            <button class="rounded-lg p-1.5 hover:bg-neutral-100" @click="toggleWarehouse(warehouse)">
              <CheckCircle2 v-if="warehouse.disabled_at" class="h-4 w-4 text-success-600" />
              <Ban v-else class="h-4 w-4 text-warning-600" />
            </button>
            <button class="rounded-lg p-1.5 hover:bg-danger-50" @click="removeWarehouse(warehouse)"><Trash2 class="h-4 w-4 text-danger-600" /></button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="activeTab === 'suppliers'" class="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form class="card p-4 space-y-4" @submit.prevent="saveSupplier">
        <h3 class="font-semibold text-neutral-900">{{ supplierForm.id ? 'Edit Supplier' : 'Tambah Supplier' }}</h3>
        <input v-model="supplierForm.name" class="input" placeholder="Nama supplier" required />
        <input v-model="supplierForm.contact_person" class="input" placeholder="Kontak utama" />
        <input v-model="supplierForm.phone" class="input" placeholder="Nomor telepon" />
        <input v-model="supplierForm.email" class="input" type="email" placeholder="Email supplier" />
        <textarea v-model="supplierForm.address" class="input min-h-[80px]" placeholder="Alamat"></textarea>
        <textarea v-model="supplierForm.notes" class="input min-h-[80px]" placeholder="Catatan kerja sama"></textarea>
        <div class="flex gap-2">
          <button class="btn-primary" :disabled="saving"><Save class="h-4 w-4" /> Simpan</button>
          <button type="button" class="btn-secondary" @click="clearSupplierForm">Reset</button>
        </div>
      </form>
      <div class="card divide-y divide-neutral-100">
        <div v-if="!suppliers.length" class="p-5 text-sm text-neutral-500">Belum ada supplier untuk tenant ini.</div>
        <div v-for="supplier in suppliers" :key="supplier.id" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <p class="font-medium text-neutral-900">{{ supplier.name }}</p>
            <p class="text-sm text-neutral-500">{{ supplier.contact_person || 'Tanpa kontak' }} - {{ supplier.phone || supplier.email || 'Belum ada kanal kontak' }}</p>
            <p v-if="supplier.address" class="text-xs text-neutral-500">{{ supplier.address }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span :class="['badge', supplier.disabled_at ? 'badge-danger' : 'badge-success']">{{ supplier.disabled_at ? 'Nonaktif' : 'Aktif' }}</span>
            <button class="rounded-lg p-1.5 hover:bg-neutral-100" @click="editSupplier(supplier)"><Pencil class="h-4 w-4" /></button>
            <button class="rounded-lg p-1.5 hover:bg-neutral-100" @click="toggleSupplier(supplier)">
              <CheckCircle2 v-if="supplier.disabled_at" class="h-4 w-4 text-success-600" />
              <Ban v-else class="h-4 w-4 text-warning-600" />
            </button>
            <button class="rounded-lg p-1.5 hover:bg-danger-50" @click="removeSupplier(supplier)"><Trash2 class="h-4 w-4 text-danger-600" /></button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="activeTab === 'stock'" class="space-y-6">
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="card p-4">
          <p class="text-sm text-neutral-500">Item terpantau</p>
          <p class="text-2xl font-bold text-neutral-900">{{ inventorySummary?.totals.items ?? 0 }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-neutral-500">Unit tersedia</p>
          <p class="text-2xl font-bold text-neutral-900">{{ inventorySummary?.totals.stock ?? 0 }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-neutral-500">Stok rendah</p>
          <p class="text-2xl font-bold text-warning-700">{{ inventorySummary?.totals.low_stock ?? 0 }}</p>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form class="card p-4 space-y-4" @submit.prevent="saveStockOperation">
          <div>
            <h3 class="font-semibold text-neutral-900">Operasi Stok</h3>
            <p class="text-sm text-neutral-500">Super admin dapat menambah, mengurangi, atau memindahkan stok tenant.</p>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button type="button" :class="['rounded-lg border p-3 text-left text-sm', stockForm.type === 'in' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-600']" @click="stockForm.type = 'in'">
              <ArrowDownToLine class="mb-2 h-4 w-4" />
              Masuk
            </button>
            <button type="button" :class="['rounded-lg border p-3 text-left text-sm', stockForm.type === 'out' ? 'border-warning-500 bg-warning-50 text-warning-700' : 'border-neutral-200 text-neutral-600']" @click="stockForm.type = 'out'">
              <ArrowUpFromLine class="mb-2 h-4 w-4" />
              Keluar
            </button>
            <button type="button" :class="['rounded-lg border p-3 text-left text-sm', stockForm.type === 'transfer' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-600']" @click="stockForm.type = 'transfer'">
              <Truck class="mb-2 h-4 w-4" />
              Transfer
            </button>
          </div>
          <select v-model="stockForm.product_id" class="input" required>
            <option value="" disabled>Pilih produk</option>
            <option v-for="product in products" :key="product.id" :value="product.id" :disabled="!!product.disabled_at">
              {{ product.sku }} - {{ product.name }}{{ product.disabled_at ? ' (nonaktif)' : '' }}
            </option>
          </select>
          <select v-model="stockForm.warehouse_id" class="input" required>
            <option value="" disabled>Gudang asal/tujuan</option>
            <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id" :disabled="!!warehouse.disabled_at">
              {{ warehouse.name }}{{ warehouse.disabled_at ? ' (nonaktif)' : '' }}
            </option>
          </select>
          <select v-if="stockForm.type === 'transfer'" v-model="stockForm.to_warehouse_id" class="input" required>
            <option value="" disabled>Gudang tujuan</option>
            <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id" :disabled="!!warehouse.disabled_at || warehouse.id === stockForm.warehouse_id">
              {{ warehouse.name }}{{ warehouse.disabled_at ? ' (nonaktif)' : '' }}
            </option>
          </select>
          <input v-model.number="stockForm.quantity" class="input" type="number" min="1" placeholder="Jumlah" required />
          <textarea v-model="stockForm.notes" class="input min-h-[80px]" placeholder="Catatan stok"></textarea>
          <button class="btn-primary w-full justify-center" :disabled="saving || !stockForm.product_id || !stockForm.warehouse_id || (stockForm.type === 'transfer' && (!stockForm.to_warehouse_id || stockForm.to_warehouse_id === stockForm.warehouse_id))">
            <Save class="h-4 w-4" />
            Simpan Operasi
          </button>
        </form>

        <div class="card overflow-hidden">
          <div class="border-b border-neutral-100 p-4">
            <h3 class="font-semibold text-neutral-900">Ringkasan Inventori</h3>
            <p class="text-sm text-neutral-500">Stok terpisah per produk dan gudang tenant.</p>
          </div>
          <div v-if="!inventorySummary?.items.length" class="p-5 text-sm text-neutral-500">Belum ada stok tercatat.</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[720px]">
              <thead>
                <tr>
                  <th class="table-header">Produk</th>
                  <th class="table-header">Gudang</th>
                  <th class="table-header">Jumlah</th>
                  <th class="table-header">Min</th>
                  <th class="table-header">Status</th>
                  <th class="table-header">Update</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100">
                <tr v-for="item in inventorySummary.items" :key="item.id" class="hover:bg-neutral-50">
                  <td class="table-cell"><p class="font-medium">{{ item.product_name }}</p><p class="text-xs text-neutral-500">{{ item.product_sku }}</p></td>
                  <td class="table-cell">{{ item.warehouse_name }}</td>
                  <td class="table-cell font-semibold">{{ item.quantity }}</td>
                  <td class="table-cell">{{ item.min_stock }}</td>
                  <td class="table-cell"><span :class="['badge', item.status === 'low_stock' ? 'badge-warning' : 'badge-success']">{{ item.status === 'low_stock' ? 'Stok rendah' : 'Aman' }}</span></td>
                  <td class="table-cell">{{ formatDate(item.updated_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <section v-if="activeTab === 'activities'" class="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form class="card p-4 space-y-4" @submit.prevent="saveActivity">
        <h3 class="font-semibold text-neutral-900">{{ activityForm.id ? 'Edit Aktivitas' : 'Tambah Aktivitas' }}</h3>
        <input v-model="activityForm.title" class="input" placeholder="Judul aktivitas" required />
        <input v-model="activityForm.type" class="input" placeholder="Tipe" />
        <select v-model="activityForm.status" class="input">
          <option value="pending">Pending</option>
          <option value="in_progress">Berjalan</option>
          <option value="done">Selesai</option>
        </select>
        <input v-model="activityForm.due_at" type="datetime-local" class="input" />
        <textarea v-model="activityForm.description" class="input min-h-[80px]" placeholder="Catatan"></textarea>
        <div class="flex gap-2">
          <button class="btn-primary" :disabled="saving"><Save class="h-4 w-4" /> Simpan</button>
          <button type="button" class="btn-secondary" @click="clearActivityForm">Reset</button>
        </div>
      </form>
      <div class="card divide-y divide-neutral-100">
        <div v-for="activity in activities" :key="activity.id" class="flex items-center justify-between gap-4 p-4">
          <div class="min-w-0">
            <p class="font-medium text-neutral-900">{{ activity.title }}</p>
            <p class="text-sm text-neutral-500">{{ activity.type }} - {{ activity.status }} - {{ formatDate(activity.due_at) }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span :class="['badge', activity.disabled_at ? 'badge-danger' : 'badge-primary']">{{ activity.disabled_at ? 'Nonaktif' : 'Aktif' }}</span>
            <button class="rounded-lg p-1.5 hover:bg-neutral-100" @click="editActivity(activity)"><Pencil class="h-4 w-4" /></button>
            <button class="rounded-lg p-1.5 hover:bg-neutral-100" @click="toggleActivity(activity)">
              <CheckCircle2 v-if="activity.disabled_at" class="h-4 w-4 text-success-600" />
              <Ban v-else class="h-4 w-4 text-warning-600" />
            </button>
            <button class="rounded-lg p-1.5 hover:bg-danger-50" @click="removeActivity(activity)"><Trash2 class="h-4 w-4 text-danger-600" /></button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
