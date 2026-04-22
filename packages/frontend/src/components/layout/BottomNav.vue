<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  Activity,
  Settings,
  MoreHorizontal,
  Warehouse,
  ArrowLeftRight,
  Users,
  BarChart3,
  FileText,
  CreditCard,
  HelpCircle,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const showMoreMenu = ref(false)

const leftItems = [
  { name: 'Home', icon: LayoutDashboard, route: '/app' },
  { name: 'Inventori', icon: Package, route: '/app/inventory' },
]

const centerItem = { name: 'Tambah', icon: PlusCircle, route: '/app/stock-in', action: 'add' }

const rightItems = [
  { name: 'Aktivitas', icon: Activity, route: '/app/activity' },
  { name: 'Lainnya', icon: MoreHorizontal, route: '', action: 'more' },
]

const moreMenuItems = [
  { name: 'Gudang', icon: Warehouse, route: '/app/warehouses', color: 'bg-blue-100 text-blue-600' },
  { name: 'Mutasi', icon: ArrowLeftRight, route: '/app/stock-movement', color: 'bg-purple-100 text-purple-600' },
  { name: 'Supplier', icon: Users, route: '/app/suppliers', color: 'bg-green-100 text-green-600' },
  { name: 'Analitik', icon: BarChart3, route: '/app/analytics', color: 'bg-orange-100 text-orange-600' },
  { name: 'Billing', icon: CreditCard, route: '/app/billing', color: 'bg-pink-100 text-pink-600' },
  { name: 'Tutorial', icon: FileText, route: '/app/tutorial', color: 'bg-cyan-100 text-cyan-600' },
  { name: 'Bantuan', icon: HelpCircle, route: '/app/tutorial', color: 'bg-yellow-100 text-yellow-600' },
  { name: 'Pengaturan', icon: Settings, route: '/app/settings', color: 'bg-neutral-100 text-neutral-600' },
]

function isActive(routePath: string) {
  return route.path.startsWith(routePath)
}

function handleNav(item: any) {
  if (item.action === 'more') {
    showMoreMenu.value = true
  } else if (item.action === 'add') {
    router.push(item.route)
  } else if (item.route) {
    router.push(item.route)
  }
}

function handleMoreMenu(routePath: string) {
  showMoreMenu.value = false
  router.push(routePath)
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-100 lg:hidden safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
    <ul class="flex items-center justify-between px-1 h-[68px]">
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
      
      <li class="relative -mt-10 z-30">
        <button
          @click="handleNav(centerItem)"
          class="w-16 h-16 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-400 hover:scale-110 active:scale-95 transition-all duration-200"
        >
          <PlusCircle class="w-9 h-9 text-white" />
        </button>
      </li>
      
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
              <p class="text-sm text-neutral-500 mb-6">Akses semua fitur StockPilot</p>
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
</template>

<style scoped>
.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
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