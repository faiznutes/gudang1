<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'
import { User, Building, Bell, Shield, Save, Package } from 'lucide-vue-next'

const authStore = useAuthStore()
const inventoryStore = useInventoryStore()

const activeTab = ref('profile')

const tabs = [
  { id: 'profile', name: 'Profil', icon: User },
  { id: 'workspace', name: 'Workspace', icon: Building },
  { id: 'notifications', name: 'Notifikasi', icon: Bell },
  { id: 'security', name: 'Keamanan', icon: Shield },
]

const profileForm = ref({
  name: authStore.user?.name || '',
  email: authStore.user?.email || '',
})

const workspaceForm = ref({
  name: authStore.workspace?.name || '',
})

const notificationSettings = ref({
  lowStockAlert: true,
  stockInOut: true,
  weeklyReport: false,
  emailNotifications: true,
})

const isSaving = ref(false)
const saveSuccess = ref(false)

async function handleSave() {
  isSaving.value = true
  await new Promise(resolve => setTimeout(resolve, 500))
  isSaving.value = false
  saveSuccess.value = true
  setTimeout(() => saveSuccess.value = false, 2000)
}
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-neutral-900">Pengaturan</h1>
      <p class="text-neutral-600">Kelola akun dan preferensi</p>
    </div>

    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Tabs -->
      <div class="lg:w-64 flex-shrink-0">
        <nav class="card p-2">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-primary-50 text-primary-700'
                : 'text-neutral-600 hover:bg-neutral-50'
            ]"
          >
            <component :is="tab.icon" class="w-5 h-5" />
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <!-- Content -->
      <div class="flex-1">
        <!-- Profile -->
        <div v-if="activeTab === 'profile'" class="card p-6">
          <h2 class="text-lg font-semibold text-neutral-900 mb-6">Informasi Profil</h2>
          
          <form @submit.prevent="handleSave" class="space-y-6">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <span class="text-2xl font-semibold text-primary-700">
                  {{ profileForm.name?.charAt(0) || 'U' }}
                </span>
              </div>
              <div>
                <p class="font-medium text-neutral-900">{{ profileForm.name }}</p>
                <p class="text-sm text-neutral-500">{{ profileForm.email }}</p>
              </div>
            </div>

            <div>
              <label class="label">Nama Lengkap</label>
              <input v-model="profileForm.name" class="input max-w-md" />
            </div>

            <div>
              <label class="label">Email</label>
              <input v-model="profileForm.email" type="email" class="input max-w-md" />
            </div>

            <div class="flex items-center gap-3">
              <button type="submit" :disabled="isSaving" class="btn-primary">
                <Save class="w-4 h-4" />
                {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
              </button>
              <span v-if="saveSuccess" class="text-sm text-success-600">Tersimpan!</span>
            </div>
          </form>
        </div>

        <!-- Workspace -->
        <div v-if="activeTab === 'workspace'" class="card p-6">
          <h2 class="text-lg font-semibold text-neutral-900 mb-6">Pengaturan Workspace</h2>
          
          <form @submit.prevent="handleSave" class="space-y-6">
            <div>
              <label class="label">Nama Workspace</label>
              <input v-model="workspaceForm.name" class="input max-w-md" />
            </div>

            <div class="p-4 bg-neutral-50 rounded-lg">
              <div class="flex items-center gap-3 mb-3">
                <Package class="w-5 h-5 text-neutral-500" />
                <span class="font-medium text-neutral-900">Statistik</span>
              </div>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-neutral-500">Produk</p>
                  <p class="font-semibold text-neutral-900">{{ inventoryStore.totalProducts }}</p>
                </div>
                <div>
                  <p class="text-neutral-500">Gudang</p>
                  <p class="font-semibold text-neutral-900">{{ inventoryStore.totalWarehouses }}</p>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <button type="submit" :disabled="isSaving" class="btn-primary">
                <Save class="w-4 h-4" />
                {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
              </button>
              <span v-if="saveSuccess" class="text-sm text-success-600">Tersimpan!</span>
            </div>
          </form>
        </div>

        <!-- Notifications -->
        <div v-if="activeTab === 'notifications'" class="card p-6">
          <h2 class="text-lg font-semibold text-neutral-900 mb-6">Pengaturan Notifikasi</h2>
          
          <form @submit.prevent="handleSave" class="space-y-6">
            <div class="space-y-4">
              <label class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-neutral-900">Alert Stok Menipis</p>
                  <p class="text-sm text-neutral-500">Notifikasi ketika stok di bawah minimum</p>
                </div>
                <input
                  v-model="notificationSettings.lowStockAlert"
                  type="checkbox"
                  class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>

              <label class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-neutral-900">Stock Masuk/Keluar</p>
                  <p class="text-sm text-neutral-500">Notifikasi untuk setiap aktivitas stock</p>
                </div>
                <input
                  v-model="notificationSettings.stockInOut"
                  type="checkbox"
                  class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>

              <label class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-neutral-900">Laporan Mingguan</p>
                  <p class="text-sm text-neutral-500">Kirim ringkasan setiap minggu</p>
                </div>
                <input
                  v-model="notificationSettings.weeklyReport"
                  type="checkbox"
                  class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>

              <label class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-neutral-900">Notifikasi Email</p>
                  <p class="text-sm text-neutral-500">Terima notifikasi via email</p>
                </div>
                <input
                  v-model="notificationSettings.emailNotifications"
                  type="checkbox"
                  class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
            </div>

            <div class="flex items-center gap-3">
              <button type="submit" :disabled="isSaving" class="btn-primary">
                <Save class="w-4 h-4" />
                {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
              </button>
              <span v-if="saveSuccess" class="text-sm text-success-600">Tersimpan!</span>
            </div>
          </form>
        </div>

        <!-- Security -->
        <div v-if="activeTab === 'security'" class="card p-6">
          <h2 class="text-lg font-semibold text-neutral-900 mb-6">Keamanan</h2>
          
          <div class="space-y-6">
            <div>
              <h3 class="font-medium text-neutral-900 mb-2">Ubah Password</h3>
              <p class="text-sm text-neutral-500 mb-4">Perbarui password secara berkala untuk keamanan</p>
              <button class="btn-secondary">Ubah Password</button>
            </div>

            <div class="pt-6 border-t border-neutral-100">
              <h3 class="font-medium text-neutral-900 mb-2">Logout dari Semua Perangkat</h3>
              <p class="text-sm text-neutral-500 mb-4">Akeluarkan sesi dari semua perangkat</p>
              <button class="btn-danger">Logout Semua</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>