<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { ArrowLeft, Save } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const inventoryStore = useInventoryStore()

const isEdit = computed(() => !!route.params.id)
const warehouseId = computed(() => route.params.id as string)

const form = ref({
  name: '',
  address: '',
  is_default: false,
})

const errors = ref<Record<string, string>>({})
const isLoading = ref(false)

onMounted(async () => {
  if (inventoryStore.warehouses.length === 0) {
    await inventoryStore.loadAll().catch(() => {})
  }
  if (isEdit.value) {
    const warehouse = inventoryStore.getWarehouseById(warehouseId.value)
    if (warehouse) {
      form.value = {
        name: warehouse.name,
        address: warehouse.address || '',
        is_default: warehouse.is_default,
      }
    }
  }
})

function validate() {
  errors.value = {}

  if (!form.value.name.trim()) {
    errors.value.name = 'Nama gudang wajib diisi'
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return

  isLoading.value = true

  try {
    if (isEdit.value) {
      await inventoryStore.updateWarehouse(warehouseId.value, form.value)
    } else {
      await inventoryStore.addWarehouse(form.value)
    }

    router.push({ name: 'warehouses' })
  } catch (e) {
    errors.value.submit = e instanceof Error ? e.message : 'Gagal menyimpan gudang'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
    <!-- Back -->
    <router-link
      to="/app/warehouses"
      class="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
    >
      <ArrowLeft class="w-4 h-4" />
      Kembali ke Gudang
    </router-link>

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-neutral-900">
        {{ isEdit ? 'Edit Gudang' : 'Tambah Gudang' }}
      </h1>
      <p class="text-neutral-600">{{ isEdit ? 'Perbarui informasi gudang' : 'Tambahkan gudang baru' }}</p>
    </div>

    <!-- Form -->
    <div class="card p-6">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Name -->
        <div>
          <label class="label">Nama Gudang</label>
          <input
            v-model="form.name"
            :class="['input', errors.name ? 'input-error' : '']"
            placeholder="Contoh: Gudang Utama"
          />
          <p v-if="errors.name" class="text-xs text-danger-600 mt-1">{{ errors.name }}</p>
        </div>

        <!-- Address -->
        <div>
          <label class="label">Alamat (Opsional)</label>
          <textarea
            v-model="form.address"
            class="input min-h-[100px]"
            placeholder="Contoh: Jl. Merdeka No. 10, Jakarta"
          />
        </div>

        <!-- Default -->
        <div class="flex items-center gap-3">
          <input
            v-model="form.is_default"
            type="checkbox"
            id="is_default"
            class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
          />
          <label for="is_default" class="text-sm text-neutral-700">
            Jadikan gudang utama
          </label>
        </div>

        <!-- Error -->
        <div v-if="errors.submit" class="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p class="text-sm text-danger-700">{{ errors.submit }}</p>
        </div>

        <!-- Submit -->
        <div class="flex justify-end gap-3">
          <router-link to="/app/warehouses" class="btn-secondary">
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
