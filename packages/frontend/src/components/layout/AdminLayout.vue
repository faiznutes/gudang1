<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import SyncStatusIndicator from '@/components/layout/SyncStatusIndicator.vue'
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileText,
  LayoutDashboard,
  Layers3,
  LifeBuoy,
  LogOut,
  MoreHorizontal,
  PackagePlus,
  Settings,
  ShieldCheck,
  UserCog,
  X,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const collapsed = ref(false)
const showMoreMenu = ref(false)
const showMobileAccountMenu = ref(false)
const showDesktopAccountMenu = ref(false)
const isMobile = ref(false)

const adminNavItems = [
  {
    name: 'Command Center',
    shortName: 'Center',
    description: 'Ringkasan platform',
    icon: LayoutDashboard,
    route: '/admin',
    tone: 'from-sky-500 to-cyan-400',
  },
  {
    name: 'User & Role',
    shortName: 'Akses',
    description: 'Super admin, admin klien, staff',
    icon: UserCog,
    route: '/admin/users',
    tone: 'from-violet-500 to-fuchsia-400',
  },
  {
    name: 'Tenant',
    shortName: 'Tenant',
    description: 'Client workspace dan status',
    icon: Building2,
    route: '/admin/workspaces',
    tone: 'from-emerald-500 to-teal-400',
  },
  {
    name: 'Data Klien',
    shortName: 'Data',
    description: 'Produk, stok, supplier tenant',
    icon: Layers3,
    route: '/admin/client-warehouse',
    tone: 'from-amber-500 to-orange-400',
  },
  {
    name: 'Paket & Billing',
    shortName: 'Paket',
    description: 'Plan, renewal, subscription',
    icon: CreditCard,
    route: '/admin/subscriptions',
    tone: 'from-rose-500 to-pink-400',
  },
  {
    name: 'Approval Billing',
    shortName: 'Approve',
    description: 'Request paket, add-on, kustom',
    icon: ClipboardCheck,
    route: '/admin/approvals',
    tone: 'from-amber-500 to-yellow-400',
  },
  {
    name: 'Produk SaaS',
    shortName: 'SaaS',
    description: 'Paket, fitur, dan add-on',
    icon: PackagePlus,
    route: '/admin/packages',
    tone: 'from-cyan-500 to-blue-400',
  },
  {
    name: 'Audit',
    shortName: 'Audit',
    description: 'Riwayat aktivitas platform',
    icon: FileText,
    route: '/admin/audit-logs',
    tone: 'from-indigo-500 to-blue-400',
  },
  {
    name: 'Konfigurasi',
    shortName: 'Config',
    description: 'Policy, session, alert',
    icon: Settings,
    route: '/admin/settings',
    tone: 'from-neutral-700 to-neutral-500',
  },
]

const leftItems = [adminNavItems[0], adminNavItems[2]]
const centerItem = adminNavItems[3]
const rightItems = [
  adminNavItems[4],
  { name: 'Lainnya', shortName: 'Menu', description: 'Menu lengkap', icon: MoreHorizontal, route: '', tone: 'from-neutral-700 to-neutral-500', action: 'more' },
]
const moreMenuItems = [adminNavItems[1], adminNavItems[5], adminNavItems[6], adminNavItems[7], adminNavItems[8], adminNavItems[3], adminNavItems[4], adminNavItems[2]]

const currentNavItem = computed(() => {
  return adminNavItems.find(item => isActive(item.route)) ?? adminNavItems[0]
})

const currentTitle = computed(() => currentNavItem.value.name)
const currentSubtitle = computed(() => currentNavItem.value.description)
const accountInitial = computed(() => authStore.user?.name?.charAt(0)?.toUpperCase() || 'A')

function checkMobile() {
  isMobile.value = window.innerWidth < 1024
  if (!isMobile.value) {
    showMoreMenu.value = false
    showMobileAccountMenu.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

function toggleSidebar() {
  collapsed.value = !collapsed.value
}

function closeMenus() {
  showMoreMenu.value = false
  showMobileAccountMenu.value = false
  showDesktopAccountMenu.value = false
}

function isActive(routePath: string) {
  if (!routePath) return false
  if (routePath === '/admin') return route.path === '/admin'
  return route.path.startsWith(routePath)
}

function navigate(routePath: string) {
  if (!routePath) return
  router.push(routePath)
  closeMenus()
}

function handleNav(item: { route?: string; action?: string }) {
  showMobileAccountMenu.value = false
  if (item.action === 'more') {
    showMoreMenu.value = true
    return
  }
  if (item.route) navigate(item.route)
}

async function handleLogout() {
  await authStore.logout()
  closeMenus()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-[#f6f8fb] text-neutral-950 selection:bg-primary-200/80 selection:text-primary-950">
    <header
      v-if="isMobile"
      class="fixed inset-x-0 top-0 z-40 border-b border-neutral-200/80 bg-white/95 px-4 backdrop-blur-xl"
    >
      <div class="flex h-16 items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <div class="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-neutral-950 text-white shadow-lg shadow-neutral-950/15">
            <ShieldCheck class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-black text-neutral-950">{{ currentTitle }}</p>
            <p class="truncate text-xs font-medium text-neutral-500">{{ currentSubtitle }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <SyncStatusIndicator compact class="flex-shrink-0" />
          <div class="relative">
            <button
              class="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 shadow-sm transition active:scale-95"
              aria-label="Buka menu akun admin"
              @click="showMobileAccountMenu = !showMobileAccountMenu"
            >
              <span class="grid h-8 w-8 place-items-center rounded-full bg-primary-100 text-sm font-black text-primary-800">
                {{ accountInitial }}
              </span>
              <ChevronDown class="h-4 w-4 text-neutral-400" />
            </button>

            <Transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="showMobileAccountMenu"
                class="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/15"
              >
                <div class="border-b border-neutral-100 px-4 py-3">
                  <p class="truncate text-sm font-black text-neutral-950">{{ authStore.user?.name || 'Super Admin' }}</p>
                  <p class="truncate text-xs text-neutral-500">{{ authStore.user?.email || 'admin' }}</p>
                </div>
                <button class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50" @click="navigate('/admin')">
                  <ShieldCheck class="h-4 w-4 text-primary-700" />
                  Profil platform
                </button>
                <button class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50" @click="navigate('/admin/settings')">
                  <Settings class="h-4 w-4 text-neutral-500" />
                  Pengaturan
                </button>
                <button class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50" @click="navigate('/admin/audit-logs')">
                  <LifeBuoy class="h-4 w-4 text-neutral-500" />
                  Bantuan & audit
                </button>
                <button class="flex w-full items-center gap-3 border-t border-neutral-100 px-4 py-3 text-left text-sm font-black text-danger-600 hover:bg-danger-50" @click="handleLogout">
                  <LogOut class="h-4 w-4" />
                  Keluar
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </header>

    <aside
      v-if="!isMobile"
      :class="[
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/10 bg-neutral-950 text-white shadow-2xl shadow-neutral-950/20 transition-all duration-200',
        collapsed ? 'w-20' : 'w-72'
      ]"
    >
      <div class="flex h-20 items-center justify-between border-b border-white/10 px-4">
        <button class="flex min-w-0 items-center gap-3 text-left" @click="navigate('/admin')" aria-label="Buka command center">
          <div class="grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg bg-white text-neutral-950 shadow-lg shadow-cyan-500/10">
            <ShieldCheck class="h-6 w-6" />
          </div>
          <div v-if="!collapsed" class="min-w-0">
            <p class="truncate text-base font-black">StockPilot SaaS</p>
            <p class="truncate text-xs font-medium text-neutral-400">Super Admin Control</p>
          </div>
        </button>
        <button
          v-if="!collapsed"
          class="grid h-9 w-9 place-items-center rounded-lg text-neutral-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Perkecil sidebar"
          @click="toggleSidebar"
        >
          <ChevronLeft class="h-5 w-5" />
        </button>
      </div>

      <button
        v-if="collapsed"
        class="absolute -right-3 top-24 grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-neutral-900 text-neutral-300 shadow-lg transition hover:bg-neutral-800 hover:text-white"
        aria-label="Perbesar sidebar"
        @click="toggleSidebar"
      >
        <ChevronRight class="h-4 w-4" />
      </button>

      <div v-if="!collapsed" class="px-4 py-4">
        <div class="rounded-lg border border-white/10 bg-white/[0.06] p-3">
          <div class="flex items-center gap-2 text-xs font-black uppercase text-cyan-200">
            <Bell class="h-4 w-4" />
            Platform live
          </div>
          <p class="mt-2 text-xs leading-5 text-neutral-300">
            Akses super admin aktif untuk tenant, user, billing, audit, dan konfigurasi.
          </p>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin" aria-label="Navigasi super admin">
        <ul class="space-y-1">
          <li v-for="item in adminNavItems" :key="item.route">
            <button
              :title="collapsed ? item.name : undefined"
              :aria-label="item.name"
              :class="[
                'group flex w-full items-center rounded-lg px-3 py-3 text-left text-sm font-bold transition',
                collapsed ? 'justify-center' : 'gap-3',
                isActive(item.route)
                  ? 'bg-white text-neutral-950 shadow-lg shadow-black/10'
                  : 'text-neutral-300 hover:bg-white/10 hover:text-white'
              ]"
              @click="navigate(item.route)"
            >
              <span
                :class="[
                  'grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg transition',
                  isActive(item.route)
                    ? `bg-gradient-to-br ${item.tone} text-white`
                    : 'bg-white/5 text-neutral-300 group-hover:bg-white/10 group-hover:text-white'
                ]"
              >
                <component :is="item.icon" class="h-5 w-5" />
              </span>
              <span v-if="!collapsed" class="min-w-0">
                <span class="block truncate">{{ item.name }}</span>
                <span class="mt-0.5 block truncate text-xs font-medium text-current opacity-60">{{ item.description }}</span>
              </span>
            </button>
          </li>
        </ul>
      </nav>

      <div class="border-t border-white/10 p-3">
        <div v-if="!collapsed" class="relative">
          <button
            class="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-white/10"
            aria-label="Buka menu akun"
            @click="showDesktopAccountMenu = !showDesktopAccountMenu"
          >
            <span class="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-cyan-100 text-sm font-black text-cyan-800">
              {{ accountInitial }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-black text-white">{{ authStore.user?.name || 'Super Admin' }}</span>
              <span class="block truncate text-xs text-neutral-400">{{ authStore.user?.email || 'admin' }}</span>
            </span>
            <ChevronDown class="h-4 w-4 text-neutral-500" />
          </button>

          <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="translate-y-1 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="translate-y-0 opacity-100"
            leave-to-class="translate-y-1 opacity-0"
          >
            <div
              v-if="showDesktopAccountMenu"
              class="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 text-neutral-900 shadow-2xl shadow-black/20"
            >
              <button class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold hover:bg-neutral-50" @click="navigate('/admin')">
                <ShieldCheck class="h-4 w-4 text-primary-700" />
                Profil platform
              </button>
              <button class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold hover:bg-neutral-50" @click="navigate('/admin/settings')">
                <Settings class="h-4 w-4 text-neutral-500" />
                Pengaturan
              </button>
              <button class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold hover:bg-neutral-50" @click="navigate('/admin/audit-logs')">
                <LifeBuoy class="h-4 w-4 text-neutral-500" />
                Bantuan & audit
              </button>
              <button class="flex w-full items-center gap-3 border-t border-neutral-100 px-4 py-2.5 text-left text-sm font-black text-danger-600 hover:bg-danger-50" @click="handleLogout">
                <LogOut class="h-4 w-4" />
                Keluar
              </button>
            </div>
          </Transition>
        </div>
        <button
          v-else
          class="grid h-12 w-full place-items-center rounded-lg text-neutral-400 transition hover:bg-white/10 hover:text-white"
          title="Keluar"
          aria-label="Keluar"
          @click="handleLogout"
        >
          <LogOut class="h-5 w-5" />
        </button>
      </div>
    </aside>

    <div :class="['min-h-screen transition-all duration-200', isMobile ? 'pt-16' : (collapsed ? 'ml-20' : 'ml-72')]">
      <header v-if="!isMobile" class="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div class="flex h-20 items-center justify-between gap-4 px-8">
          <div class="min-w-0">
            <p class="text-xs font-black uppercase text-primary-700">Super Admin Dashboard</p>
            <h1 class="mt-1 truncate text-2xl font-black text-neutral-950">{{ currentTitle }}</h1>
          </div>
          <div class="flex items-center gap-3">
            <div class="hidden rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 xl:block">
              Role aktif: Super Admin
            </div>
            <SyncStatusIndicator />
            <button
              class="grid h-10 w-10 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-sm transition hover:-translate-y-0.5 hover:text-primary-700"
              aria-label="Lihat audit terbaru"
              @click="navigate('/admin/audit-logs')"
            >
              <Bell class="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main :class="isMobile ? 'pb-24' : ''">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <nav
      v-if="isMobile"
      class="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/80 bg-white/95 shadow-[0_-14px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden safe-area-pb"
      aria-label="Navigasi bawah super admin"
    >
      <ul class="grid h-[72px] grid-cols-5 items-center px-1">
        <li v-for="item in leftItems" :key="item.route">
          <button class="group flex w-full flex-col items-center justify-center gap-1 px-1 py-2" @click="handleNav(item)">
            <span :class="['grid h-9 w-9 place-items-center rounded-lg transition group-active:scale-95', isActive(item.route) ? 'bg-neutral-950 text-white' : 'text-neutral-500 group-hover:bg-neutral-100']">
              <component :is="item.icon" class="h-5 w-5" />
            </span>
            <span :class="['text-[11px] font-black', isActive(item.route) ? 'text-neutral-950' : 'text-neutral-500']">{{ item.shortName }}</span>
          </button>
        </li>

        <li class="-mt-8">
          <button class="group flex w-full flex-col items-center justify-center gap-1" @click="handleNav(centerItem)">
            <span :class="['grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-xl transition group-active:scale-95', centerItem.tone, isActive(centerItem.route) ? 'ring-4 ring-primary-100' : '']">
              <component :is="centerItem.icon" class="h-8 w-8" />
            </span>
            <span class="text-[11px] font-black text-neutral-800">{{ centerItem.shortName }}</span>
          </button>
        </li>

        <li v-for="item in rightItems" :key="item.name">
          <button class="group flex w-full flex-col items-center justify-center gap-1 px-1 py-2" @click="handleNav(item)">
            <span :class="['grid h-9 w-9 place-items-center rounded-lg transition group-active:scale-95', item.route && isActive(item.route) ? 'bg-neutral-950 text-white' : 'text-neutral-500 group-hover:bg-neutral-100']">
              <component :is="item.icon" class="h-5 w-5" />
            </span>
            <span :class="['text-[11px] font-black', item.route && isActive(item.route) ? 'text-neutral-950' : 'text-neutral-500']">{{ item.shortName }}</span>
          </button>
        </li>
      </ul>
    </nav>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showMoreMenu" class="fixed inset-0 z-50 lg:hidden" @click="showMoreMenu = false">
          <div class="absolute inset-0 bg-neutral-950/55 backdrop-blur-sm"></div>
          <Transition name="slide-up" appear>
            <div class="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-2xl bg-white shadow-2xl" @click.stop>
              <div class="p-4">
                <div class="mx-auto mb-5 h-1 w-11 rounded-full bg-neutral-300"></div>
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h3 class="text-lg font-black text-neutral-950">Menu Super Admin</h3>
                    <p class="mt-1 text-sm text-neutral-500">Akses cepat untuk kontrol platform SaaS.</p>
                  </div>
                  <button class="grid h-9 w-9 place-items-center rounded-lg bg-neutral-100 text-neutral-600" aria-label="Tutup menu" @click="showMoreMenu = false">
                    <X class="h-5 w-5" />
                  </button>
                </div>
                <div class="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  <button
                    v-for="item in moreMenuItems"
                    :key="item.route"
                    class="group rounded-lg border border-neutral-100 bg-[#fbfdff] p-3 text-left transition active:scale-95"
                    @click="navigate(item.route)"
                  >
                    <span :class="['grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br text-white', item.tone]">
                      <component :is="item.icon" class="h-5 w-5" />
                    </span>
                    <span class="mt-3 block text-xs font-black text-neutral-900">{{ item.name }}</span>
                    <span class="mt-1 block text-[11px] leading-4 text-neutral-500">{{ item.description }}</span>
                  </button>
                </div>
              </div>
              <div class="h-6 bg-neutral-50"></div>
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
  transition: all 0.22s ease-out;
}

.slide-up-leave-active {
  transition: all 0.18s ease-in;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
