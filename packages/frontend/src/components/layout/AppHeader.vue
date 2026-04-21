<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Search, Bell, ChevronDown, User, LogOut, Settings, HelpCircle } from 'lucide-vue-next'

const route = useRoute()
const authStore = useAuthStore()
const showUserMenu = ref(false)

const pageTitle = () => {
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    inventory: 'Inventori',
    'inventory-detail': 'Detail Produk',
    'inventory-new': 'Tambah Produk',
    'inventory-edit': 'Edit Produk',
    warehouses: 'Gudang',
    'warehouse-new': 'Tambah Gudang',
    'warehouse-edit': 'Edit Gudang',
    'stock-in': 'Stock Masuk',
    'stock-out': 'Stock Keluar',
    'stock-movement': 'Mutasi Stok',
    suppliers: 'Supplier',
    'supplier-new': 'Tambah Supplier',
    'supplier-edit': 'Edit Supplier',
    activity: 'Aktivitas',
    analytics: 'Analitik',
    settings: 'Pengaturan',
    billing: 'Billing',
    tutorial: 'Pusat Bantuan',
  }
  return titles[route.name as string] || 'StockPilot'
}

const pageSubtitle = () => {
  const subtitles: Record<string, string> = {
    dashboard: 'Ringkasan aktivitas gudang',
    inventory: 'Kelola produk dan stok',
    warehouses: 'Kelola lokasi gudang',
    suppliers: 'Kelola data supplier',
  }
  return subtitles[route.name as string] || ''
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
}

function handleLogout() {
  authStore.logout()
  showUserMenu.value = false
}
</script>

<template>
  <header class="sticky top-0 z-30 bg-white border-b border-neutral-200">
    <div class="px-4 lg:px-8 py-4">
      <div class="flex items-center justify-between gap-4">
        <!-- Title -->
        <div class="min-w-0">
          <h1 class="text-lg font-semibold text-neutral-900 truncate">
            {{ pageTitle() }}
          </h1>
          <p v-if="pageSubtitle()" class="text-sm text-neutral-500 truncate hidden sm:block">
            {{ pageSubtitle() }}
          </p>
        </div>

        <!-- Right Actions -->
        <div class="flex items-center gap-2">
          <!-- Search (Desktop) -->
          <div class="hidden md:block">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Cari..."
                class="w-64 pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <!-- Notifications -->
          <button class="relative p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors">
            <Bell class="w-5 h-5" />
            <span class="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
          </button>

          <!-- User Menu -->
          <div class="relative">
            <button
              @click="toggleUserMenu"
              class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span class="text-sm font-medium text-primary-700">
                  {{ authStore.user?.name?.charAt(0) || 'U' }}
                </span>
              </div>
              <ChevronDown class="w-4 h-4 text-neutral-400 hidden sm:block" />
            </button>

            <!-- Dropdown -->
            <transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div
                v-if="showUserMenu"
                class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-dropdown border border-neutral-100 py-1"
              >
                <div class="px-4 py-3 border-b border-neutral-100">
                  <p class="text-sm font-medium text-neutral-900">{{ authStore.user?.name }}</p>
                  <p class="text-xs text-neutral-500">{{ authStore.user?.email }}</p>
                </div>
                <div class="py-1">
                  <button class="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                    <User class="w-4 h-4" />
                    Profil
                  </button>
                  <button class="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                    <Settings class="w-4 h-4" />
                    Pengaturan
                  </button>
                  <button class="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                    <HelpCircle class="w-4 h-4" />
                    Bantuan
                  </button>
                </div>
                <div class="border-t border-neutral-100 py-1">
                  <button
                    @click="handleLogout"
                    class="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
                  >
                    <LogOut class="w-4 h-4" />
                    Keluar
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>