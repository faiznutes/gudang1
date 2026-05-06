<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSupplierStore } from '@/stores/supplier'
import { ArrowLeft, Save } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const supplierStore = useSupplierStore()

const isEdit = computed(() => !!route.params.id)
const supplierId = computed(() => route.params.id as string)

const form = ref({
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
})

const errors = ref<Record<string, string>>({})
const isLoading = ref(false)

onMounted(async () => {
  if (supplierStore.suppliers.length === 0) {
    await supplierStore.loadSuppliers().catch(() => {})
  }
  if (isEdit.value) {
    const supplier = supplierStore.getSupplierById(supplierId.value)
    if (supplier) {
      form.value = {
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
      }
    }
  }
})

function validate() {
  errors.value = {}

  if (!form.value.name.trim()) {
    errors.value.name = 'Nama supplier wajib diisi'
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return

  isLoading.value = true

  try {
    if (isEdit.value) {
      await supplierStore.updateSupplier(supplierId.value, form.value)
    } else {
      await supplierStore.addSupplier(form.value)
    }

    router.push({ name: 'suppliers' })
  } catch (e) {
    errors.value.submit = e instanceof Error ? e.message : 'Gagal menyimpan supplier'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
    <!-- Back -->
    <router-link
      to="/app/suppliers"
      class="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
    >
      <ArrowLeft class="w-4 h-4" />
      Kembali ke Supplier
    </router-link>

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-neutral-900">
        {{ isEdit ? 'Edit Supplier' : 'Tambah Supplier' }}
      </h1>
      <p class="text-neutral-600">{{ isEdit ? 'Perbarui informasi supplier' : 'Tambahkan supplier baru' }}</p>
    </div>

    <!-- Form -->
    <div class="card p-6">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Name -->
        <div>
          <label class="label">Nama Supplier</label>
          <input
            v-model="form.name"
            :class="['input', errors.name ? 'input-error' : '']"
            placeholder="Contoh: PT Maju Jaya"
          />
          <p v-if="errors.name" class="text-xs text-danger-600 mt-1">{{ errors.name }}</p>
        </div>

        <!-- Contact Person -->
        <div>
          <label class="label">Nama Kontak</label>
          <input
            v-model="form.contact_person"
            class="input"
            placeholder="Contoh: Budi Santoso"
          />
        </div>

        <!-- Phone -->
        <div>
          <label class="label">Telepon</label>
          <input
            v-model="form.phone"
            class="input"
            placeholder="Contoh: 0812-3456-7890"
          />
        </div>

        <!-- Email -->
        <div>
          <label class="label">Email</label>
          <input
            v-model="form.email"
            type="email"
            class="input"
            placeholder="Contoh: budi@majujaya.com"
          />
        </div>

        <!-- Address -->
        <div>
          <label class="label">Alamat</label>
          <textarea
            v-model="form.address"
            class="input min-h-[80px]"
            placeholder="Contoh: Jl. Industri Raya No. 15, Jakarta"
          />
        </div>

        <!-- Notes -->
        <div>
          <label class="label">Catatan</label>
          <textarea
            v-model="form.notes"
            class="input min-h-[80px]"
            placeholder="Catatan tambahan..."
          />
        </div>

        <!-- Error -->
        <div v-if="errors.submit" class="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p class="text-sm text-danger-700">{{ errors.submit }}</p>
        </div>

        <!-- Submit -->
        <div class="flex justify-end gap-3">
          <router-link to="/app/suppliers" class="btn-secondary">
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
