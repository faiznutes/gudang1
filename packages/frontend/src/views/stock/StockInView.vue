<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useActivityStore } from '@/stores/activity'
import { useAuthStore } from '@/stores/auth'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, CheckCircle, Package, Warehouse } from 'lucide-vue-next'
import FeatureLockModal from '@/components/FeatureLockModal.vue'

const router = useRouter()
const route = useRoute()
const inventoryStore = useInventoryStore()
const activityStore = useActivityStore()
const authStore = useAuthStore()
const { canAccessStockInOut, getLockedFeatureMessage } = useFeatureAccess()

const showLockModal = ref(false)
const lockedInfo = computed(() => getLockedFeatureMessage('stockInOut'))
const initialProductId = typeof route.query.product_id === 'string' ? route.query.product_id : ''

const form = ref({
  product_id: initialProductId,
  warehouse_id: '',
  quantity: 1,
  notes: '',
})

const errors = ref<Record<string, string>>({})
const isLoading = ref(false)
const isSuccess = ref(false)

const products = computed(() => inventoryStore.products)
const warehouses = computed(() => inventoryStore.warehouses)
const selectedProduct = computed(() => inventoryStore.getProductById(form.value.product_id))
const selectedWarehouse = computed(() => inventoryStore.getWarehouseById(form.value.warehouse_id))

function validate() {
  errors.value = {}

  if (!canAccessStockInOut()) {
    showLockModal.value = true
    return false
  }

  if (!form.value.product_id) {
    errors.value.product_id = 'Produk wajib dipilih'
  }
  if (!form.value.warehouse_id) {
    errors.value.warehouse_id = 'Gudang wajib dipilih'
  }
  if (form.value.quantity < 1) {
    errors.value.quantity = 'Jumlah minimal 1'
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return

  isLoading.value = true

  try {
    const product = inventoryStore.getProductById(form.value.product_id)
    const warehouse = inventoryStore.getWarehouseById(form.value.warehouse_id)

    await inventoryStore.stockIn({
      product_id: form.value.product_id,
      warehouse_id: form.value.warehouse_id,
      quantity: form.value.quantity,
      notes: form.value.notes,
    })

    activityStore.addActivity({
      product_id: form.value.product_id,
      product_name: product?.name || '',
      product_sku: product?.sku || '',
      warehouse_id: form.value.warehouse_id,
      warehouse_name: warehouse?.name || '',
      type: 'in',
      quantity: form.value.quantity,
      notes: form.value.notes,
      user_id: authStore.user?.id || '1',
      user_name: authStore.user?.name || 'User',
    })
    activityStore.loadActivities().catch(() => {})

    isSuccess.value = true
    setTimeout(() => {
      router.push('/app/inventory')
    }, 1500)
  } catch (e) {
    errors.value.submit = e instanceof Error ? e.message : 'Gagal menyimpan stok masuk'
  } finally {
    isLoading.value = false
  }
}

function resetForm() {
  form.value = { product_id: '', warehouse_id: '', quantity: 1, notes: '' }
  isSuccess.value = false
}

function closeLockModal() {
  showLockModal.value = false
}

function goToBilling() {
  router.push({ name: 'billing', query: { section: 'packages', locked: 'stockInOut', cycle: 'monthly' } })
  showLockModal.value = false
}
</script>

<template>
  <div class="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
    <!-- Back -->
    <router-link
      :to="'/app/inventory'"
      class="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
    >
      <ArrowLeft class="w-4 h-4" />
      Kembali ke Produk
    </router-link>

    <!-- Success State -->
    <div v-if="isSuccess" class="card p-8 text-center">
      <div class="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle class="w-10 h-10 text-success-600" />
      </div>
      <h2 class="text-xl font-semibold text-neutral-900 mb-2">Stok Masuk Dicatat!</h2>
      <p class="text-neutral-600">Mengalihkan ke halaman produk...</p>
    </div>

    <template v-else>
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-neutral-900">Stok Masuk</h1>
        <p class="text-neutral-600">Catat barang yang masuk ke gudang</p>
      </div>

      <div class="grid grid-cols-3 gap-2 rounded-xl border border-neutral-100 bg-white p-2">
        <router-link to="/app/stock-in" class="btn-primary justify-center">
          <ArrowDownToLine class="h-4 w-4" />
          Masuk
        </router-link>
        <router-link to="/app/stock-out" class="btn-secondary justify-center">
          <ArrowUpFromLine class="h-4 w-4" />
          Keluar
        </router-link>
        <router-link to="/app/stock-movement" class="btn-secondary justify-center">
          Riwayat
        </router-link>
      </div>

      <!-- Form -->
      <div class="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div class="card p-6">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Product -->
          <div>
            <label class="label">Produk</label>
            <select v-model="form.product_id" :class="['input', errors.product_id ? 'input-error' : '']">
              <option value="">Pilih produk</option>
              <option v-for="p in products" :key="p.id" :value="p.id">
                {{ p.name }} ({{ p.sku }})
              </option>
            </select>
            <p v-if="errors.product_id" class="text-xs text-danger-600 mt-1">{{ errors.product_id }}</p>
                        <p v-if="!canAccessStockInOut()" class="text-xs text-primary-600 mt-1">
              Fitur ini belum aktif. <button type="button" @click="showLockModal = true" class="underline">Ajukan akses</button>
            </p>
          </div>

          <!-- Warehouse -->
          <div>
            <label class="label">Gudang Tujuan</label>
            <select v-model="form.warehouse_id" :class="['input', errors.warehouse_id ? 'input-error' : '']">
              <option value="">Pilih gudang</option>
              <option v-for="w in warehouses" :key="w.id" :value="w.id">
                {{ w.name }}
              </option>
            </select>
            <p v-if="errors.warehouse_id" class="text-xs text-danger-600 mt-1">{{ errors.warehouse_id }}</p>
          </div>

          <!-- Quantity -->
          <div>
            <label class="label">Jumlah</label>
            <input
              v-model.number="form.quantity"
              type="number"
              min="1"
              :class="['input', errors.quantity ? 'input-error' : '']"
            />
            <p v-if="errors.quantity" class="text-xs text-danger-600 mt-1">{{ errors.quantity }}</p>
          </div>

          <!-- Notes -->
          <div>
            <label class="label">Catatan (Opsional)</label>
            <textarea
              v-model="form.notes"
              class="input min-h-[80px]"
              placeholder="Catatan stok masuk"
            />
          </div>

          <!-- Error -->
          <div v-if="errors.submit" class="p-3 bg-danger-50 border border-danger-200 rounded-lg">
            <p class="text-sm text-danger-700">{{ errors.submit }}</p>
          </div>

          <!-- Submit -->
          <div class="flex justify-end gap-3">
            <button type="button" @click="resetForm" class="btn-secondary">
              Reset
            </button>
            <button type="submit" :disabled="isLoading" class="btn-primary">
              <ArrowDownToLine class="w-4 h-4" />
              {{ isLoading ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
      <aside class="space-y-4">
        <div class="rounded-xl border border-neutral-100 bg-white p-4">
          <h2 class="font-semibold text-neutral-900">Ringkasan</h2>
          <div class="mt-4 space-y-3">
            <div class="flex items-start gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <Package class="h-4 w-4" />
              </div>
              <div class="min-w-0">
                <p class="text-xs font-semibold text-neutral-500">Produk</p>
                <p class="truncate text-sm font-medium text-neutral-900">{{ selectedProduct?.name || 'Belum dipilih' }}</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Warehouse class="h-4 w-4" />
              </div>
              <div class="min-w-0">
                <p class="text-xs font-semibold text-neutral-500">Gudang tujuan</p>
                <p class="truncate text-sm font-medium text-neutral-900">{{ selectedWarehouse?.name || 'Belum dipilih' }}</p>
              </div>
            </div>
          </div>
          <p class="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
            Stok masuk akan menambah jumlah barang di gudang tujuan.
          </p>
        </div>
      </aside>
      </div>
    </template>

    <!-- Feature Lock Modal -->
    <FeatureLockModal
      :show="showLockModal"
      :title="lockedInfo.title"
      :message="lockedInfo.message"
      :current-plan="lockedInfo.currentPlan"
      :required-plan="lockedInfo.requiredPlan"
      @close="closeLockModal"
      @upgrade="goToBilling"
    />
  </div>
</template>
