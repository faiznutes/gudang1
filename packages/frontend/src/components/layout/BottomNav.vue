<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  PackagePlus,
  Activity,
  Settings,
  MoreHorizontal,
  Warehouse,
  ArrowLeftRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  BarChart3,
  FileText,
  Tags,
  X,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const showMoreMenu = ref(false)
const showQuickActionMenu = ref(false)
const featureAccess = useFeatureAccess()

const leftItems = [
  { name: 'Home', icon: LayoutDashboard, route: '/app' },
  { name: 'Produk', icon: Package, route: '/app/inventory' },
]

const centerItem = { name: 'Tambah', icon: PlusCircle, route: '', action: 'quick-add' }

const rightItems = [
  { name: 'Gudang', icon: Warehouse, route: '/app/warehouses' },
  { name: 'Lainnya', icon: MoreHorizontal, route: '', action: 'more' },
]

const moreMenuItems = computed(() => [
  { name: 'Kategori', icon: Tags, route: '/app/categories', color: 'bg-violet-100 text-violet-600' },
  ...(featureAccess.canAccessStockInOut() ? [
    { name: 'Riwayat stok', icon: ArrowLeftRight, route: '/app/stock-movement', color: 'bg-primary-100 text-primary-600' },
  ] : []),
  { name: 'Supplier', icon: Users, route: '/app/suppliers', color: 'bg-green-100 text-green-600' },
  { name: 'Riwayat', icon: Activity, route: '/app/activity', color: 'bg-sky-100 text-sky-600' },
  ...(featureAccess.canAccessAnalytics() ? [{ name: 'Laporan', icon: BarChart3, route: '/app/analytics', color: 'bg-orange-100 text-orange-600' }] : []),
  { name: 'Bantuan', icon: FileText, route: '/app/tutorial', color: 'bg-cyan-100 text-cyan-600' },
  { name: 'Pengaturan', icon: Settings, route: '/app/settings', color: 'bg-neutral-100 text-neutral-600' },
])

const quickActionItems = computed(() => [
  { name: 'Tambah produk', description: 'Buat item baru', icon: PackagePlus, route: '/app/inventory/new', color: 'bg-primary-100 text-primary-600' },
  ...(featureAccess.canAccessStockInOut() ? [
    { name: 'Stok masuk', description: 'Barang datang ke gudang', icon: ArrowDownToLine, route: '/app/stock-in', color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Stok keluar', description: 'Barang keluar dari gudang', icon: ArrowUpFromLine, route: '/app/stock-out', color: 'bg-rose-100 text-rose-600' },
  ] : []),
])

function isActive(routePath: string) {
  return routePath === '/app' ? route.path === '/app' : route.path.startsWith(routePath)
}

function handleNav(item: any) {
  if (item.action === 'more') {
    showQuickActionMenu.value = false
    showMoreMenu.value = true
  } else if (item.action === 'quick-add') {
    showMoreMenu.value = false
    showQuickActionMenu.value = true
  } else if (item.route) {
    router.push(item.route)
  }
}

function handleMoreMenu(routePath: string) {
  showMoreMenu.value = false
  router.push(routePath)
}

function handleQuickAction(routePath: string) {
  showQuickActionMenu.value = false
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
          aria-label="Buka tambah cepat"
          class="w-16 h-16 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-400 hover:scale-110 active:scale-95 transition-all duration-200"
        >
          <component :is="centerItem.icon" class="w-9 h-9 text-white" />
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
              <h3 class="text-lg font-bold text-neutral-900 mb-1">Menu kerja</h3>
              <p class="text-sm text-neutral-500 mb-6">Pilih pekerjaan yang ingin dibuka.</p>
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

  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showQuickActionMenu"
        class="fixed inset-0 z-50 lg:hidden"
        @click="showQuickActionMenu = false"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        <Transition name="slide-up" appear>
          <div class="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl overflow-hidden" @click.stop>
            <div class="p-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-lg font-bold text-neutral-900">Tambah cepat</h3>
                  <p class="text-sm text-neutral-500">Pilih pekerjaan harian yang mau dibuat.</p>
                </div>
                <button
                  class="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100"
                  aria-label="Tutup tambah cepat"
                  @click="showQuickActionMenu = false"
                >
                  <X class="h-5 w-5" />
                </button>
              </div>

              <div class="mt-5 grid gap-3">
                <button
                  v-for="item in quickActionItems"
                  :key="item.route"
                  class="flex items-center gap-3 rounded-2xl border border-neutral-100 p-4 text-left transition hover:bg-neutral-50 active:scale-[0.98]"
                  @click="handleQuickAction(item.route)"
                >
                  <div :class="['flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl', item.color]">
                    <component :is="item.icon" class="h-6 w-6" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold text-neutral-900">{{ item.name }}</p>
                    <p class="text-sm text-neutral-500">{{ item.description }}</p>
                  </div>
                </button>
              </div>
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
