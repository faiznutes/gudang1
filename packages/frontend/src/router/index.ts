import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
  },
  {
    path: '/inventory',
    name: 'inventory',
    component: () => import('@/views/inventory/InventoryListView.vue'),
  },
  {
    path: '/inventory/new',
    name: 'inventory-new',
    component: () => import('@/views/inventory/ProductFormView.vue'),
  },
  {
    path: '/inventory/:id',
    name: 'inventory-detail',
    component: () => import('@/views/inventory/ProductDetailView.vue'),
  },
  {
    path: '/inventory/:id/edit',
    name: 'inventory-edit',
    component: () => import('@/views/inventory/ProductFormView.vue'),
  },
  {
    path: '/warehouses',
    name: 'warehouses',
    component: () => import('@/views/warehouse/WarehouseListView.vue'),
  },
  {
    path: '/warehouses/new',
    name: 'warehouse-new',
    component: () => import('@/views/warehouse/WarehouseFormView.vue'),
  },
  {
    path: '/warehouses/:id/edit',
    name: 'warehouse-edit',
    component: () => import('@/views/warehouse/WarehouseFormView.vue'),
  },
  {
    path: '/stock-in',
    name: 'stock-in',
    component: () => import('@/views/stock/StockInView.vue'),
  },
  {
    path: '/stock-out',
    name: 'stock-out',
    component: () => import('@/views/stock/StockOutView.vue'),
  },
  {
    path: '/stock-movement',
    name: 'stock-movement',
    component: () => import('@/views/stock/StockMovementView.vue'),
  },
  {
    path: '/suppliers',
    name: 'suppliers',
    component: () => import('@/views/supplier/SupplierListView.vue'),
  },
  {
    path: '/suppliers/new',
    name: 'supplier-new',
    component: () => import('@/views/supplier/SupplierFormView.vue'),
  },
  {
    path: '/suppliers/:id/edit',
    name: 'supplier-edit',
    component: () => import('@/views/supplier/SupplierFormView.vue'),
  },
  {
    path: '/activity',
    name: 'activity',
    component: () => import('@/views/ActivityView.vue'),
  },
  {
    path: '/analytics',
    name: 'analytics',
    component: () => import('@/views/AnalyticsView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
  },
  {
    path: '/billing',
    name: 'billing',
    component: () => import('@/views/BillingView.vue'),
  },
  {
    path: '/tutorial',
    name: 'tutorial',
    component: () => import('@/views/TutorialView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  authStore.initAuth()

  if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: 'dashboard' })
  } else if (!to.meta.guest && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else {
    next()
  }
})

export default router