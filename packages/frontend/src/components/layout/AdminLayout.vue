<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import SyncStatusIndicator from '@/components/layout/SyncStatusIndicator.vue'
import {
  LayoutDashboard,
  UserCog,
  Building2,
  CreditCard,
  Warehouse,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  X,
  MoreHorizontal,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const collapsed = ref(false)
const showMobileMenu = ref(false)
const showMoreMenu = ref(false)
const showMobileAccountMenu = ref(false)

const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 1024
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

function toggleSidebar() {
  if (isMobile.value) {
    showMobileMenu.value = !showMobileMenu.value
  } else {
    collapsed.value = !collapsed.value
  }
}

function closeMobileMenu() {
  showMobileMenu.value = false
}

function closeMobileAccountMenu() {
  showMobileAccountMenu.value = false
}

const adminNavItems = [
  { name: 'Dashboard', icon: LayoutDashboard, route: '/admin' },
  { name: 'Users', icon: UserCog, route: '/admin/users' },
  { name: 'Workspaces', icon: Building2, route: '/admin/workspaces' },
  { name: 'Client Warehouse', icon: Warehouse, route: '/admin/client-warehouse' },
  { name: 'Billing', icon: CreditCard, route: '/admin/subscriptions' },
  { name: 'Logs', icon: FileText, route: '/admin/audit-logs' },
  { name: 'Settings', icon: Settings, route: '/admin/settings' },
]

const leftItems = [
  { name: 'Dashboard', icon: LayoutDashboard, route: '/admin' },
  { name: 'Users', icon: UserCog, route: '/admin/users' },
]

const centerItem = { name: 'Gudang Klien', icon: Warehouse, route: '/admin/client-warehouse', action: 'client-warehouse' }

const rightItems = [
  { name: 'Billing', icon: CreditCard, route: '/admin/subscriptions' },
  { name: 'Lainnya', icon: MoreHorizontal, route: '', action: 'more' },
]

const moreMenuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, route: '/admin', color: 'bg-primary-100 text-primary-600' },
  { name: 'Users', icon: UserCog, route: '/admin/users', color: 'bg-blue-100 text-blue-600' },
  { name: 'Workspaces', icon: Building2, route: '/admin/workspaces', color: 'bg-green-100 text-green-600' },
  { name: 'Gudang Klien', icon: Warehouse, route: '/admin/client-warehouse', color: 'bg-primary-100 text-primary-600' },
  { name: 'Billing', icon: CreditCard, route: '/admin/subscriptions', color: 'bg-purple-100 text-purple-600' },
  { name: 'Logs', icon: FileText, route: '/admin/audit-logs', color: 'bg-orange-100 text-orange-600' },
  { name: 'Settings', icon: Settings, route: '/admin/settings', color: 'bg-neutral-100 text-neutral-600' },
]

function isActive(routePath: string) {
  if (routePath === '/admin') {
    return route.path === '/admin'
  }
  return route.path.startsWith(routePath)
}

function navigate(routePath: string) {
  router.push(routePath)
  closeMobileMenu()
  showMoreMenu.value = false
  closeMobileAccountMenu()
}

function handleNav(item: any) {
  closeMobileAccountMenu()
  if (item.action === 'more') {
    showMoreMenu.value = true
  } else if (item.route) {
    router.push(item.route)
  }
}

function handleMoreMenu(routePath: string) {
  showMoreMenu.value = false
  closeMobileAccountMenu()
  router.push(routePath)
}

function handleLogout() {
  authStore.logout()
  showMoreMenu.value = false
  closeMobileAccountMenu()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Mobile Header - No burger menu when bottom nav is shown -->
    <header v-if="isMobile" class="fixed top-0 left-0 right-0 h-14 bg-purple-900 text-white z-30 flex items-center justify-between px-4">
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-8 h-8 bg-purple-700 rounded-xl flex items-center justify-center flex-shrink-0">
          <Settings class="w-4 h-4 text-white" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-bold leading-tight truncate">Admin Panel</p>
          <p class="text-[11px] text-purple-200 leading-tight truncate">Super Admin</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <SyncStatusIndicator variant="dark" compact class="flex-shrink-0" />

        <div class="relative">
          <button
            @click="showMobileAccountMenu = !showMobileAccountMenu"
            class="flex items-center gap-1 rounded-xl bg-purple-800/80 px-2 py-1.5 active:scale-95 transition-all"
            aria-label="Buka menu akun admin"
          >
            <span class="w-8 h-8 rounded-full bg-white text-purple-800 flex items-center justify-center text-sm font-bold">
              {{ authStore.user?.name?.charAt(0) || 'A' }}
            </span>
            <ChevronDown class="w-4 h-4 text-purple-200" />
          </button>

          <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <div
              v-if="showMobileAccountMenu"
              class="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white text-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden"
            >
              <div class="px-4 py-3 border-b border-neutral-100">
                <p class="text-sm font-semibold truncate">{{ authStore.user?.name || 'Admin' }}</p>
                <p class="text-xs text-neutral-500 truncate">{{ authStore.user?.email || 'admin' }}</p>
              </div>
              <button
                @click="navigate('/admin/settings')"
                class="w-full flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 text-left"
              >
                <Settings class="w-4 h-4" />
                Pengaturan
              </button>
              <button
                @click="handleLogout"
                class="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-danger-600 hover:bg-danger-50 text-left border-t border-neutral-100"
              >
                <LogOut class="w-4 h-4" />
                Keluar
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <!-- Desktop Sidebar -->
    <aside
      v-if="!isMobile"
      :class="[
        'fixed top-0 left-0 z-40 h-screen bg-purple-900 text-white transition-all duration-200 flex flex-col',
        collapsed ? 'w-20' : 'w-64'
      ]"
    >
      <!-- Logo -->
      <div class="h-14 flex items-center justify-between px-4 border-b border-purple-800">
        <div class="flex items-center gap-3 overflow-hidden">
          <div class="w-9 h-9 bg-purple-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <Settings class="w-5 h-5 text-white" />
          </div>
          <span v-if="!collapsed" class="font-bold text-lg whitespace-nowrap">
            Admin Panel
          </span>
        </div>
        <button
          v-if="!collapsed"
          @click="toggleSidebar"
          class="p-1.5 rounded-lg hover:bg-purple-800 text-purple-300 transition-colors"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
      </div>

      <!-- Expand button when collapsed -->
      <button
        v-if="collapsed"
        @click="toggleSidebar"
        class="absolute -right-3 top-16 w-6 h-6 bg-purple-800 border border-purple-700 rounded-full flex items-center justify-center shadow-sm hover:bg-purple-700 transition-colors"
      >
        <ChevronRight class="w-4 h-4" />
      </button>

      <!-- Main Navigation -->
      <nav class="flex-1 py-4 px-3 overflow-y-auto">
        <ul class="space-y-1">
          <li v-for="item in adminNavItems" :key="item.route">
            <button
              @click="navigate(item.route)"
              :class="[
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(item.route)
                  ? 'bg-purple-800 text-white'
                  : 'text-purple-300 hover:bg-purple-800 hover:text-white'
              ]"
            >
              <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
              <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
            </button>
          </li>
        </ul>
      </nav>

      <!-- Bottom Section -->
      <div class="border-t border-purple-800 py-4 px-3 space-y-2">
        <div v-if="!collapsed" class="pt-2 border-t border-purple-800">
          <div class="flex items-center gap-3 px-3">
            <div class="w-8 h-8 bg-purple-700 rounded-full flex items-center justify-center">
              <span class="text-sm font-medium">
                {{ authStore.user?.name?.charAt(0) || 'A' }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">
                {{ authStore.user?.name || 'Admin' }}
              </p>
              <p class="text-xs text-purple-400 truncate">
                Super Admin
              </p>
            </div>
            <button
              @click="handleLogout"
              class="p-1.5 rounded-lg hover:bg-purple-800 text-purple-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Mobile Menu Overlay -->
    <div
      v-if="isMobile && showMobileMenu"
      class="fixed inset-0 z-50 bg-black/50"
      @click="closeMobileMenu"
    >
      <div class="absolute left-0 top-0 bottom-0 w-64 bg-purple-900 text-white" @click.stop>
        <div class="h-14 flex items-center justify-between px-4 border-b border-purple-800">
          <span class="font-bold">Admin Panel</span>
          <button @click="closeMobileMenu" class="p-2 hover:bg-purple-800 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>
        <nav class="py-4 px-3">
          <ul class="space-y-1">
            <li v-for="item in adminNavItems" :key="item.route">
              <button
                @click="navigate(item.route)"
                :class="[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.route)
                    ? 'bg-purple-800 text-white'
                    : 'text-purple-300 hover:bg-purple-800 hover:text-white'
                ]"
              >
                <component :is="item.icon" class="w-5 h-5" />
                {{ item.name }}
              </button>
            </li>
          </ul>
        </nav>
        <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-purple-800 text-xs text-purple-300">
          Akses platform SaaS
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div
      :class="[
        'transition-all duration-200',
        isMobile ? 'pt-14' : (collapsed ? 'ml-20' : 'ml-64')
      ]"
    >
      <main :class="isMobile ? 'pb-20' : ''">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- Mobile Bottom Navigation - Same as Client App -->
    <nav v-if="isMobile" class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-100 lg:hidden safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <ul class="flex items-center justify-between px-1 h-[68px]">
        <!-- Left Items -->
        <li v-for="item in leftItems" :key="item.route">
          <button
            @click="handleNav(item)"
            class="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-16 group"
          >
            <div
              :class="[
                'p-1.5 rounded-xl transition-all duration-200 group-hover:scale-110',
                isActive(item.route)
                  ? 'bg-primary-100 text-primary-600'
                  : 'text-neutral-400 group-hover:bg-neutral-100'
              ]"
            >
              <component :is="item.icon" class="w-5 h-5" />
            </div>
            <span
              :class="[
                'text-[11px] font-medium',
                isActive(item.route) ? 'text-primary-600' : 'text-neutral-500'
              ]"
            >
              {{ item.name }}
            </span>
          </button>
        </li>
        
        <!-- Center - Workspaces Quick Access -->
        <li class="relative -mt-10 z-30">
          <button
            @click="handleNav(centerItem)"
            class="w-16 h-16 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-400 hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <component :is="centerItem.icon" class="w-9 h-9 text-white" />
          </button>
        </li>
        
        <!-- Right Items -->
        <li v-for="item in rightItems" :key="item.route + item.name">
          <button
            @click="handleNav(item)"
            class="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-16 group"
          >
            <div
              :class="[
                'p-1.5 rounded-xl transition-all duration-200 group-hover:scale-110',
                item.name === 'Lainnya'
                  ? 'text-neutral-600 group-hover:bg-neutral-100'
                  : isActive(item.route)
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-neutral-400 group-hover:bg-neutral-100'
              ]"
            >
              <component :is="item.icon" class="w-5 h-5" />
            </div>
            <span
              :class="[
                'text-[11px] font-medium',
                item.name === 'Lainnya'
                  ? 'text-neutral-600'
                  : isActive(item.route)
                    ? 'text-primary-600'
                    : 'text-neutral-500'
              ]"
            >
              {{ item.name }}
            </span>
          </button>
        </li>
      </ul>
    </nav>
    
    <!-- More Menu Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showMoreMenu"
          class="fixed inset-0 z-50 lg:hidden"
          @click="showMoreMenu = false"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <Transition name="slide-up" appear>
            <div class="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl overflow-hidden" @click.stop>
              <div class="p-4">
                <div class="flex justify-center mb-6">
                  <div class="w-10 h-1 bg-neutral-300 rounded-full"></div>
                </div>
                <h3 class="text-lg font-bold text-neutral-900 mb-1">Menu Lengkap</h3>
                <p class="text-sm text-neutral-500 mb-6">Akses semua fitur Admin</p>
                <div class="grid grid-cols-4 gap-3">
                  <button
                    v-for="item in moreMenuItems"
                    :key="item.route"
                    @click="handleMoreMenu(item.route)"
                    class="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-neutral-50 active:scale-95 transition-all"
                  >
                    <div :class="['w-12 h-12 rounded-xl flex items-center justify-center', item.color]">
                      <component :is="item.icon" class="w-6 h-6" />
                    </div>
                    <span class="text-xs font-medium text-neutral-700">{{ item.name }}</span>
                  </button>
                </div>
                <button
                  @click="showMoreMenu = false"
                  class="w-full mt-6 py-3 text-neutral-600 font-medium hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  Tutup
                </button>
              </div>
              <div class="h-8 bg-neutral-50"></div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active {
  transition: all 0.3s ease-out;
}

.slide-up-leave-active {
  transition: all 0.2s ease-in;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
