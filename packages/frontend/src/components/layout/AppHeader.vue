<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { Search, Bell, ChevronDown, User, LogOut, Settings, HelpCircle } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const showUserMenu = ref(false)
const showNotifications = ref(false)

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
  showNotifications.value = false
}

async function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  showUserMenu.value = false
  if (showNotifications.value) {
    await notificationsStore.loadNotifications()
  }
}

function navigateTo(routeTarget: string) {
  showUserMenu.value = false
  showNotifications.value = false
  router.push(routeTarget)
}

function handleLogout() {
  authStore.logout()
  showUserMenu.value = false
  router.push({ name: 'login' })
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
          <div class="relative">
            <button
              class="relative p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
              aria-label="Buka notifikasi"
              @click="toggleNotifications"
            >
              <Bell class="w-5 h-5" />
              <span v-if="notificationsStore.unreadCount > 0" class="absolute top-1 right-1 min-w-4 h-4 px-1 bg-danger-500 rounded-full text-[10px] leading-4 text-white text-center">
                {{ Math.min(notificationsStore.unreadCount, 9) }}
              </span>
            </button>

            <transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div v-if="showNotifications" class="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-dropdown border border-neutral-100 py-2 z-50">
                <div class="px-4 pb-2 border-b border-neutral-100">
                  <p class="text-sm font-semibold text-neutral-900">Notifikasi</p>
                  <p class="text-xs text-neutral-500">{{ notificationsStore.unreadCount }} perlu perhatian</p>
                </div>
                <div v-if="notificationsStore.isLoading" class="p-4 text-sm text-neutral-500">Memuat notifikasi...</div>
                <div v-else-if="notificationsStore.items.length === 0" class="p-4 text-sm text-neutral-500">Belum ada notifikasi baru.</div>
                <div v-else class="max-h-80 overflow-y-auto divide-y divide-neutral-100">
                  <button
                    v-for="item in notificationsStore.items"
                    :key="item.id"
                    class="w-full px-4 py-3 text-left hover:bg-neutral-50"
                    @click="item.action_url ? navigateTo(item.action_url) : null"
                  >
                    <div class="flex items-start gap-3">
                      <span
                        :class="[
                          'mt-1 h-2 w-2 rounded-full flex-shrink-0',
                          item.severity === 'critical' ? 'bg-danger-500' : item.severity === 'warning' ? 'bg-warning-500' : 'bg-primary-500'
                        ]"
                      ></span>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-neutral-900">{{ item.title }}</p>
                        <p class="text-xs text-neutral-500">{{ item.message }}</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </transition>
          </div>

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
                  <button class="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50" @click="navigateTo('/app/settings')">
                    <User class="w-4 h-4" />
                    Profil
                  </button>
                  <button class="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50" @click="navigateTo('/app/settings')">
                    <Settings class="w-4 h-4" />
                    Pengaturan
                  </button>
                  <button class="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50" @click="navigateTo('/app/tutorial')">
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
