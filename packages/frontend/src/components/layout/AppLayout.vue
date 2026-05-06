<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useResponsiveNav } from '@/composables/useResponsiveNav'
import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'
import { useSupplierStore } from '@/stores/supplier'
import { useActivityStore } from '@/stores/activity'
import DesktopSidebar from '@/components/layout/DesktopSidebar.vue'
import BottomNav from '@/components/layout/BottomNav.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import TrialBanner from '@/components/TrialBanner.vue'

const { showSidebar, showBottomNav, isDesktop } = useResponsiveNav()
const route = useRoute()
const authStore = useAuthStore()
const inventoryStore = useInventoryStore()
const supplierStore = useSupplierStore()
const activityStore = useActivityStore()

const sidebarCollapsed = ref(false)

const isAppRoute = computed(() => route.path.startsWith('/app'))
const shouldShowLayout = computed(() => isAppRoute.value && authStore.isAuthenticated)
const shouldRenderPlainRoute = computed(() => !isAppRoute.value)

watch(
  () => route.name,
  () => {
    if (!isDesktop.value) {
      sidebarCollapsed.value = false
    }
  }
)

onMounted(async () => {
  if (!authStore.isAuthenticated || route.path.startsWith('/admin')) return
  await Promise.allSettled([
    inventoryStore.loadAll(),
    supplierStore.loadSuppliers(),
    activityStore.loadActivities(),
  ])
})

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <div v-if="shouldShowLayout" class="min-h-screen bg-neutral-50">
    <!-- Desktop Sidebar -->
    <DesktopSidebar
      v-if="showSidebar"
      :collapsed="sidebarCollapsed"
      @toggle="toggleSidebar"
    />

    <!-- Main Content Area -->
    <div
      :class="[
        'flex flex-col min-h-screen transition-all duration-200',
        showSidebar ? (sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64') : ''
      ]"
    >
      <TrialBanner />
      <AppHeader />

      <main class="flex-1 pb-20 lg:pb-8">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- Mobile/Tablet Bottom Nav -->
    <BottomNav v-if="showBottomNav" />
  </div>

  <!-- Auth pages without layout -->
  <router-view v-else-if="shouldRenderPlainRoute" />

  <div v-else class="min-h-screen bg-neutral-50" aria-busy="true" aria-live="polite" />
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
