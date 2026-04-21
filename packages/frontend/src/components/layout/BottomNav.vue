<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import {
  Home,
  Package,
  Plus,
  Activity,
  Settings,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const navItems = [
  { name: 'Home', icon: Home, route: 'dashboard' },
  { name: 'Inventori', icon: Package, route: 'inventory' },
  { name: 'Tambah', icon: Plus, route: 'stock-in', action: 'add' },
  { name: 'Aktivitas', icon: Activity, route: 'activity' },
  { name: 'Pengaturan', icon: Settings, route: 'settings' },
]

function isActive(routeName: string) {
  return route.name === routeName
}

function handleNav(routeName: string, action?: string) {
  if (action === 'add') {
    router.push({ name: 'stock-in' })
  } else {
    router.push({ name: routeName })
  }
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 lg:hidden">
    <ul class="flex items-center justify-around h-16">
      <li v-for="item in navItems" :key="item.route + (item.action || '')">
        <button
          @click="handleNav(item.route, item.action)"
          :class="[
            'flex flex-col items-center justify-center gap-1 w-16 h-14 transition-colors',
            isActive(item.route) && !item.action
              ? 'text-primary-600'
              : item.action
                ? 'text-primary-600'
                : 'text-neutral-400'
          ]"
        >
          <div
            v-if="item.action"
            class="w-12 h-12 -mt-6 bg-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-300"
          >
            <component :is="item.icon" class="w-6 h-6 text-white" />
          </div>
          <component
            v-else
            :is="item.icon"
            :class="[
              'w-5 h-5',
              isActive(item.route) ? 'text-primary-600' : 'text-neutral-400'
            ]"
          />
          <span
            :class="[
              'text-xs font-medium',
              isActive(item.route) && !item.action ? 'text-primary-600' : 'text-neutral-400'
            ]"
          >
            {{ item.name }}
          </span>
        </button>
      </li>
    </ul>
  </nav>
</template>