<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useActivityStore } from '@/stores/activity'
import { useAuthStore } from '@/stores/auth'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import { ArrowLeft, ArrowDownToLine, CheckCircle } from 'lucide-vue-next'
import FeatureLockModal from '@/components/FeatureLockModal.vue'

const router = useRouter()
const inventoryStore = useInventoryStore()
const activityStore = useActivityStore()
const authStore = useAuthStore()
const { canAccessStockInOut, getLockedFeatureMessage } = useFeatureAccess()

const showLockModal = ref(false)
const lockedInfo = computed(() => getLockedFeatureMessage('stockInOut'))

const form = ref({
  product_id: '',
  warehouse_id: '',
  quantity: 1,
  notes: '',
})

const errors = ref<Record<string, string>>({})
const isLoading = ref(false)
const isSuccess = ref(false)

const products = computed(() => inventoryStore.products)
const warehouses = computed(() => inventoryStore.warehouses)

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
    errors.value.submit = e instanceof Error ? e.message : 'Gagal menyimpan stock masuk'
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
  router.push({ name: 'billing' })
  showLockModal.value = false
}
</script>

<template>
  <div class="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
    <!-- Back -->
    <router-link
      :to="'/app/inventory'"
      class="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
    >
      <ArrowLeft class="w-4 h-4" />
      Kembali ke Inventori
    </router-link>

    <!-- Success State -->
    <div v-if="isSuccess" class="card p-8 text-center">
      <div class="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle class="w-10 h-10 text-success-600" />
      </div>
      <h2 class="text-xl font-semibold text-neutral-900 mb-2">Stock Masuk Dicatat!</h2>
      <p class="text-neutral-600">Mengalihkan ke halaman inventori...</p>
    </div>

    <template v-else>
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-neutral-900">Stock Masuk</h1>
        <p class="text-neutral-600">Catat barang yang masuk ke gudang</p>
      </div>

      <!-- Form -->
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
              🔒 Fitur terkunci untuk paket Free. <button type="button" @click="showLockModal = true" class="underline">Upgrade</button>
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
              placeholder="Contoh: Pembelian dari supplier ABC"
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
