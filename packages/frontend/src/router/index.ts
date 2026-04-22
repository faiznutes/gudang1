import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  // Public routes
  {
    path: '/',
    name: 'landing',
    component: () => import('@/views/marketing/LandingView.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/trial-signup',
    name: 'trial-signup',
    component: () => import('@/views/auth/TrialSignupView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { guest: true },
  },
  // App dashboard routes
  {
    path: '/app',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
  },
  {
    path: '/app/inventory',
    name: 'inventory',
    component: () => import('@/views/inventory/InventoryListView.vue'),
  },
  {
    path: '/app/inventory/new',
    name: 'inventory-new',
    component: () => import('@/views/inventory/ProductFormView.vue'),
  },
  {
    path: '/app/inventory/:id',
    name: 'inventory-detail',
    component: () => import('@/views/inventory/ProductDetailView.vue'),
  },
  {
    path: '/app/inventory/:id/edit',
    name: 'inventory-edit',
    component: () => import('@/views/inventory/ProductFormView.vue'),
  },
  {
    path: '/app/warehouses',
    name: 'warehouses',
    component: () => import('@/views/warehouse/WarehouseListView.vue'),
  },
  {
    path: '/app/warehouses/new',
    name: 'warehouse-new',
    component: () => import('@/views/warehouse/WarehouseFormView.vue'),
  },
  {
    path: '/app/warehouses/:id/edit',
    name: 'warehouse-edit',
    component: () => import('@/views/warehouse/WarehouseFormView.vue'),
  },
  {
    path: '/app/stock-in',
    name: 'stock-in',
    component: () => import('@/views/stock/StockInView.vue'),
  },
  {
    path: '/app/stock-out',
    name: 'stock-out',
    component: () => import('@/views/stock/StockOutView.vue'),
  },
  {
    path: '/app/stock-movement',
    name: 'stock-movement',
    component: () => import('@/views/stock/StockMovementView.vue'),
  },
  {
    path: '/app/suppliers',
    name: 'suppliers',
    component: () => import('@/views/supplier/SupplierListView.vue'),
  },
  {
    path: '/app/suppliers/new',
    name: 'supplier-new',
    component: () => import('@/views/supplier/SupplierFormView.vue'),
  },
  {
    path: '/app/suppliers/:id/edit',
    name: 'supplier-edit',
    component: () => import('@/views/supplier/SupplierFormView.vue'),
  },
  {
    path: '/app/activity',
    name: 'activity',
    component: () => import('@/views/ActivityView.vue'),
  },
  {
    path: '/app/analytics',
    name: 'analytics',
    component: () => import('@/views/AnalyticsView.vue'),
  },
  {
    path: '/app/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
  },
  {
    path: '/app/billing',
    name: 'billing',
    component: () => import('@/views/BillingView.vue'),
  },
  {
    path: '/app/tutorial',
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

  const isGuestOnly = to.meta.guest === true
  const isAppRoute = to.path.startsWith('/app')

  // Landing page selalu bisa diakses
  if (to.path === '/' || to.name === 'landing') {
    next()
    return
  }
  
  // Guest only pages (login, register, trial-signup) - redirect to dashboard if already logged in
  if (isGuestOnly && authStore.isAuthenticated) {
    next('/app')
    return
  }
  
  // App routes - require auth
  if (isAppRoute && !authStore.isAuthenticated) {
    next('/login')
    return
  }
  
  next()
})

export default router