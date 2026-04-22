<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ArrowLeftRight,
  Users,
  Activity,
  BarChart3,
  Settings,
  HelpCircle,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-vue-next'

defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const navItems = computed(() => [
  { name: 'Dashboard', icon: LayoutDashboard, route: '/app' },
  { name: 'Inventori', icon: Package, route: '/app/inventory' },
  { name: 'Gudang', icon: Warehouse, route: '/app/warehouses' },
  { name: 'Mutasi', icon: ArrowLeftRight, route: '/app/stock-movement' },
  { name: 'Supplier', icon: Users, route: '/app/suppliers' },
  { name: 'Aktivitas', icon: Activity, route: '/app/activity' },
  { name: 'Analitik', icon: BarChart3, route: '/app/analytics' },
])

const bottomNavItems = computed(() => [
  { name: 'Pengaturan', icon: Settings, route: '/app/settings' },
  { name: 'Billing', icon: CreditCard, route: '/app/billing' },
  { name: 'Bantuan', icon: HelpCircle, route: '/app/tutorial' },
])

function isActive(routeName: string) {
  return route.path.startsWith(routeName)
}

function navigate(routePath: string) {
  router.push(routePath)
}

function handleLogout() {
  authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <aside
    :class="[
      'fixed top-0 left-0 z-40 h-screen bg-white border-r border-neutral-200 transition-all duration-200 flex flex-col',
      collapsed ? 'w-20' : 'w-64'
    ]"
  >
    <!-- Logo -->
    <div class="h-16 flex items-center justify-between px-4 border-b border-neutral-200">
      <div class="flex items-center gap-3 overflow-hidden">
        <div class="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Package class="w-6 h-6 text-white" />
        </div>
        <span v-if="!collapsed" class="font-bold text-lg text-neutral-900 whitespace-nowrap">
          StockPilot
        </span>
      </div>
      <button
        v-if="!collapsed"
        @click="emit('toggle')"
        class="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
      >
        <ChevronLeft class="w-5 h-5" />
      </button>
    </div>

    <!-- Expand button when collapsed -->
    <button
      v-if="collapsed"
      @click="emit('toggle')"
      class="absolute -right-3 top-20 w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center shadow-sm hover:bg-neutral-50 transition-colors"
    >
      <ChevronRight class="w-4 h-4 text-neutral-500" />
    </button>

    <!-- Main Navigation -->
    <nav class="flex-1 py-4 px-3 overflow-y-auto scrollbar-thin">
      <ul class="space-y-1">
        <li v-for="item in navItems" :key="item.route">
          <button
            @click="navigate(item.route)"
            :class="[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive(item.route)
                ? 'bg-primary-50 text-primary-700'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            ]"
          >
            <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
            <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
          </button>
        </li>
      </ul>
    </nav>

    <!-- Bottom Navigation -->
    <div class="border-t border-neutral-200 py-4 px-3">
      <ul class="space-y-1">
        <li v-for="item in bottomNavItems" :key="item.route">
          <button
            @click="navigate(item.route)"
            :class="[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive(item.route)
                ? 'bg-primary-50 text-primary-700'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            ]"
          >
            <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
            <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
          </button>
        </li>
      </ul>

      <!-- User Section -->
      <div v-if="!collapsed" class="mt-4 pt-4 border-t border-neutral-200">
        <div class="flex items-center gap-3 px-3">
          <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span class="text-sm font-medium text-primary-700">
              {{ authStore.user?.name?.charAt(0) || 'U' }}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-neutral-900 truncate">
              {{ authStore.user?.name || 'User' }}
            </p>
            <p class="text-xs text-neutral-500 truncate">
              {{ authStore.workspace?.name || 'Workspace' }}
            </p>
          </div>
          <button
            @click="handleLogout"
            class="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-danger-600 transition-colors"
            title="Logout"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>