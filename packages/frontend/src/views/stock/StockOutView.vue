<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useActivityStore } from '@/stores/activity'
import { useAuthStore } from '@/stores/auth'
import { ArrowLeft, ArrowUpFromLine, CheckCircle, AlertTriangle } from 'lucide-vue-next'

const router = useRouter()
const inventoryStore = useInventoryStore()
const activityStore = useActivityStore()
const authStore = useAuthStore()

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

const selectedProduct = computed(() => {
  return inventoryStore.getProductById(form.value.product_id)
})

const currentStock = computed(() => {
  if (!form.value.product_id || !form.value.warehouse_id) return 0
  const inv = inventoryStore.getInventoryByProductAndWarehouse(
    form.value.product_id,
    form.value.warehouse_id
  )
  return inv?.quantity || 0
})

const insufficientStock = computed(() => {
  if (!form.value.product_id || !form.value.warehouse_id) return false
  return currentStock.value < form.value.quantity
})

watch([() => form.value.product_id, () => form.value.warehouse_id], () => {
  if (form.value.quantity > currentStock.value && currentStock.value > 0) {
    form.value.quantity = currentStock.value
  }
})

function validate() {
  errors.value = {}

  if (!form.value.product_id) {
    errors.value.product_id = 'Produk wajib dipilih'
  }
  if (!form.value.warehouse_id) {
    errors.value.warehouse_id = 'Gudang wajib dipilih'
  }
  if (form.value.quantity < 1) {
    errors.value.quantity = 'Jumlah minimal 1'
  }
  if (insufficientStock.value) {
    errors.value.quantity = `Stok tidak cukup. Stok tersedia: ${currentStock.value}`
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return

  isLoading.value = true

  try {
    await new Promise(resolve => setTimeout(resolve, 500))

    const product = inventoryStore.getProductById(form.value.product_id)
    const warehouse = inventoryStore.getWarehouseById(form.value.warehouse_id)

    inventoryStore.updateInventory(
      form.value.product_id,
      form.value.warehouse_id,
      -form.value.quantity
    )

    activityStore.addActivity({
      product_id: form.value.product_id,
      product_name: product?.name || '',
      product_sku: product?.sku || '',
      warehouse_id: form.value.warehouse_id,
      warehouse_name: warehouse?.name || '',
      type: 'out',
      quantity: form.value.quantity,
      notes: form.value.notes,
      user_id: authStore.user?.id || '1',
      user_name: authStore.user?.name || 'User',
    })

    isSuccess.value = true
    setTimeout(() => {
      router.push({ name: 'inventory' })
    }, 1500)
  } catch (e) {
    errors.value.submit = 'Gagal menyimpan stock keluar'
  } finally {
    isLoading.value = false
  }
}

function resetForm() {
  form.value = { product_id: '', warehouse_id: '', quantity: 1, notes: '' }
  isSuccess.value = false
}
</script>

<template>
  <div class="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
    <!-- Back -->
    <router-link
      :to="{ name: 'inventory' }"
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
      <h2 class="text-xl font-semibold text-neutral-900 mb-2">Stock Keluar Dicatat!</h2>
      <p class="text-neutral-600">Mengalihkan ke halaman inventori...</p>
    </div>

    <template v-else>
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-neutral-900">Stock Keluar</h1>
        <p class="text-neutral-600">Catat barang yang keluar dari gudang</p>
      </div>

      <!-- Stock Warning -->
      <div v-if="selectedProduct && currentStock > 0 && currentStock <= selectedProduct.min_stock" class="card p-4 bg-warning-50 border-warning-300">
        <div class="flex items-start gap-3">
          <AlertTriangle class="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <p class="font-medium text-warning-800">Stok menipis!</p>
            <p class="text-sm text-warning-700">Stok {{ selectedProduct.name }} di gudang ini: {{ currentStock }}</p>
          </div>
        </div>
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
          </div>

          <!-- Warehouse -->
          <div>
            <label class="label">Gudang Asal</label>
            <select v-model="form.warehouse_id" :class="['input', errors.warehouse_id ? 'input-error' : '']">
              <option value="">Pilih gudang</option>
              <option v-for="w in warehouses" :key="w.id" :value="w.id">
                {{ w.name }}
              </option>
            </select>
            <p v-if="errors.warehouse_id" class="text-xs text-danger-600 mt-1">{{ errors.warehouse_id }}</p>
            <p v-if="form.product_id && form.warehouse_id && currentStock > 0" class="text-xs text-neutral-500 mt-1">
              Stok tersedia: {{ currentStock }}
            </p>
          </div>

          <!-- Quantity -->
          <div>
            <label class="label">Jumlah</label>
            <input
              v-model.number="form.quantity"
              type="number"
              min="1"
              :max="currentStock || undefined"
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
              placeholder="Contoh: Pesanan customer #123"
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
              <ArrowUpFromLine class="w-4 h-4" />
              {{ isLoading ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </template>
  </div>
</template>