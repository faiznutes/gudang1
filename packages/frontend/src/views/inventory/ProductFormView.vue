<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { ArrowLeft, Save } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const inventoryStore = useInventoryStore()

const isEdit = computed(() => !!route.params.id)
const productId = computed(() => route.params.id as string)

const form = ref({
  sku: '',
  name: '',
  description: '',
  category_id: '',
  min_stock: 10,
  price: 0,
})

const errors = ref<Record<string, string>>({})
const isLoading = ref(false)

const categories = computed(() => inventoryStore.categories)

onMounted(() => {
  if (isEdit.value) {
    const product = inventoryStore.getProductById(productId.value)
    if (product) {
      form.value = {
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        category_id: product.category_id,
        min_stock: product.min_stock,
        price: product.price,
      }
    }
  }
})

function validate() {
  errors.value = {}

  if (!form.value.sku.trim()) {
    errors.value.sku = 'SKU wajib diisi'
  }
  if (!form.value.name.trim()) {
    errors.value.name = 'Nama produk wajib diisi'
  }
  if (!form.value.category_id) {
    errors.value.category_id = 'Kategori wajib dipilih'
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return

  isLoading.value = true

  try {
    await new Promise(resolve => setTimeout(resolve, 500))

    if (isEdit.value) {
      inventoryStore.updateProduct(productId.value, form.value)
    } else {
      inventoryStore.addProduct(form.value)
    }

    router.push({ name: 'inventory' })
  } catch (e) {
    errors.value.submit = 'Gagal menyimpan produk'
  } finally {
    isLoading.value = false
  }
}

function generateSku() {
  form.value.sku = 'SKU-' + Date.now().toString().slice(-6)
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

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-neutral-900">
        {{ isEdit ? 'Edit Produk' : 'Tambah Produk' }}
      </h1>
      <p class="text-neutral-600">{{ isEdit ? 'Perbarui informasi produk' : 'Tambahkan produk baru ke inventori' }}</p>
    </div>

    <!-- Form -->
    <div class="card p-6">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- SKU -->
        <div>
          <label class="label">SKU</label>
          <div class="flex gap-2">
            <input
              v-model="form.sku"
              :class="['input', errors.sku ? 'input-error' : '']"
              placeholder="Contoh: SKU-001"
            />
            <button type="button" @click="generateSku" class="btn-secondary">
              Generate
            </button>
          </div>
          <p v-if="errors.sku" class="text-xs text-danger-600 mt-1">{{ errors.sku }}</p>
        </div>

        <!-- Name -->
        <div>
          <label class="label">Nama Produk</label>
          <input
            v-model="form.name"
            :class="['input', errors.name ? 'input-error' : '']"
            placeholder="Contoh: Baju Kaos Polos"
          />
          <p v-if="errors.name" class="text-xs text-danger-600 mt-1">{{ errors.name }}</p>
        </div>

        <!-- Description -->
        <div>
          <label class="label">Deskripsi (Opsional)</label>
          <textarea
            v-model="form.description"
            class="input min-h-[100px]"
            placeholder="Deskripsi produk..."
          />
        </div>

        <!-- Category -->
        <div>
          <label class="label">Kategori</label>
          <select v-model="form.category_id" :class="['input', errors.category_id ? 'input-error' : '']">
            <option value="">Pilih kategori</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
          <p v-if="errors.category_id" class="text-xs text-danger-600 mt-1">{{ errors.category_id }}</p>
        </div>

        <!-- Min Stock & Price -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Stok Minimum</label>
            <input
              v-model.number="form.min_stock"
              type="number"
              min="0"
              class="input"
            />
          </div>
          <div>
            <label class="label">Harga (Rp)</label>
            <input
              v-model.number="form.price"
              type="number"
              min="0"
              class="input"
              placeholder="0"
            />
          </div>
        </div>

        <!-- Error -->
        <div v-if="errors.submit" class="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p class="text-sm text-danger-700">{{ errors.submit }}</p>
        </div>

        <!-- Submit -->
        <div class="flex justify-end gap-3">
          <router-link :to="{ name: 'inventory' }" class="btn-secondary">
            Batal
          </router-link>
          <button type="submit" :disabled="isLoading" class="btn-primary">
            <Save class="w-4 h-4" />
            {{ isLoading ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>