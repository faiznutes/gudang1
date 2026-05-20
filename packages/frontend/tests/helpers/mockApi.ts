import type { Page, Route } from '@playwright/test'

export const proEntitlements = {
  plan: 'pro',
  subscriptionStatus: 'active',
  trialEndsAt: null,
  subscriptionStartsAt: '2026-05-01T00:00:00.000Z',
  subscriptionEndsAt: '2026-06-01T00:00:00.000Z',
  features: {
    stockInOut: true,
    multiWarehouse: true,
    analytics: true,
    exportPDF: true,
    batchImport: true,
    reports: true,
  },
  limits: { warehouses: 10, products: 10000, users: 20 },
  usage: { warehouses: 2, products: 1, users: 2 },
}

export const tenantSession = {
  user: {
    id: 'tenant-admin',
    name: 'Tenant Admin',
    email: 'tenant@example.com',
    role: 'admin',
    created_at: '2026-05-01T00:00:00.000Z',
  },
  platform_role: 'admin',
  workspace_role: 'admin',
  workspace: {
    id: 'tenant-workspace',
    name: 'Tenant Test',
    plan: 'pro',
    status: 'active',
    created_at: '2026-05-01T00:00:00.000Z',
  },
  entitlements: proEntitlements,
  activity_session_expires_at: '2026-06-01T00:00:00.000Z',
  session_policy: { timeout_minutes: 30, lock_actions_after_expiry: true },
}

export const superAdminSession = {
  user: {
    id: 'super-admin',
    name: 'Super Admin',
    email: 'admin@example.com',
    role: 'super_admin',
    created_at: '2026-05-01T00:00:00.000Z',
  },
  platform_role: 'super_admin',
  workspace_role: 'super_admin',
  workspace: {
    id: 'platform-workspace',
    name: 'StockPilot Platform',
    plan: 'custom',
    status: 'active',
    created_at: '2026-05-01T00:00:00.000Z',
  },
  entitlements: proEntitlements,
  activity_session_expires_at: '2026-06-01T00:00:00.000Z',
  session_policy: { timeout_minutes: 30, lock_actions_after_expiry: true },
}

const category = { id: 'cat-1', name: 'Umum', description: 'Kategori default', disabled_at: null, created_at: '2026-05-01T00:00:00.000Z', updated_at: '2026-05-01T00:00:00.000Z' }
const warehouse = { id: 'wh-1', name: 'Gudang Utama', address: 'Jakarta', is_default: true, disabled_at: null, created_at: '2026-05-01T00:00:00.000Z' }
const product = {
  id: 'product-1',
  sku: 'SKU-001',
  name: 'Baju Kaos Polos',
  description: 'Produk contoh',
  category_id: category.id,
  category,
  min_stock: 5,
  price: 50000,
  disabled_at: null,
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
}

function emptyPage() {
  return { data: [], meta: { current_page: 1, per_page: 20, total: 0, total_pages: 1 } }
}

export async function seedToken(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('active_workspace_id', 'tenant-workspace')
  })
}

export async function mockTenantApi(page: Page, captures: Record<string, unknown> = {}) {
  let products = [product]
  let categories = [category]
  let inventory = [{
    id: 'inv-1',
    product_id: product.id,
    product,
    warehouse_id: warehouse.id,
    warehouse,
    quantity: 9,
    updated_at: '2026-05-01T00:00:00.000Z',
  }]

  await page.route(/https?:\/\/[^/]+\/api\/.*/, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method()

    if (path.startsWith('/api/admin/')) {
      captures.adminRequest = request.url()
      await route.fulfill({ status: 403, json: { code: 'forbidden', message: 'Tenant tidak boleh mengakses admin API' } })
      return
    }

    if (path === '/api/auth/login') {
      await route.fulfill({ json: { token: 'test-token', ...tenantSession } })
      return
    }
    if (path === '/api/auth/me') {
      await route.fulfill({ json: tenantSession })
      return
    }
    if (path === '/api/auth/logout') {
      await route.fulfill({ status: 204 })
      return
    }
    if (path === '/api/auth/refresh') {
      await route.fulfill({ json: { token: 'test-token' } })
      return
    }
    if (path === '/api/me/entitlements') {
      await route.fulfill({ json: proEntitlements })
      return
    }
    if (path === '/api/products' && method === 'GET') {
      await route.fulfill({ json: products })
      return
    }
    if (path === '/api/products' && method === 'POST') {
      const body = request.postDataJSON()
      const matchedCategory = categories.find(item => item.id === body.category_id) ?? category
      const created = { ...product, ...body, id: 'product-created', category: matchedCategory, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      products.unshift(created)
      captures.createdProduct = body
      await route.fulfill({ json: created })
      return
    }
    if (path === '/api/products/product-1') {
      await route.fulfill({ json: product })
      return
    }
    if (path === '/api/products/low-stock') {
      await route.fulfill({ json: [] })
      return
    }
    if (path === '/api/categories' && method === 'GET') {
      const status = url.searchParams.get('status') ?? 'all'
      const filtered = status === 'active'
        ? categories.filter(item => !item.disabled_at)
        : status === 'archived'
          ? categories.filter(item => item.disabled_at)
          : categories
      await route.fulfill({ json: filtered })
      return
    }
    if (path === '/api/categories' && method === 'POST') {
      const body = request.postDataJSON()
      const existing = categories.find(item => item.name.toLowerCase() === String(body.name || '').toLowerCase())
      if (existing && !existing.disabled_at) {
        await route.fulfill({ status: 409, json: { code: 'conflict', message: 'Kategori dengan nama ini sudah ada' } })
        return
      }
      const nextCategory = existing
        ? { ...existing, description: body.description ?? existing.description, disabled_at: null, updated_at: new Date().toISOString() }
        : { id: `cat-${categories.length + 1}`, name: body.name, description: body.description, disabled_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      if (existing) {
        categories = categories.map(item => (item.id === existing.id ? nextCategory : item))
        products = products.map(item => item.category_id === existing.id ? { ...item, category: nextCategory } : item)
      } else {
        categories.unshift(nextCategory)
      }
      await route.fulfill({ json: nextCategory })
      return
    }
    if (path.startsWith('/api/categories/') && path.endsWith('/archive') && method === 'POST') {
      const id = path.split('/')[3]
      categories = categories.map(item => (item.id === id ? { ...item, disabled_at: new Date().toISOString(), updated_at: new Date().toISOString() } : item))
      const updatedCategory = categories.find(item => item.id === id)
      products = products.map(item => item.category_id === id ? { ...item, category: updatedCategory ?? item.category } : item)
      await route.fulfill({ json: updatedCategory })
      return
    }
    if (path.startsWith('/api/categories/') && path.endsWith('/restore') && method === 'POST') {
      const id = path.split('/')[3]
      categories = categories.map(item => (item.id === id ? { ...item, disabled_at: null, updated_at: new Date().toISOString() } : item))
      const updatedCategory = categories.find(item => item.id === id)
      products = products.map(item => item.category_id === id ? { ...item, category: updatedCategory ?? item.category } : item)
      await route.fulfill({ json: updatedCategory })
      return
    }
    if (path.startsWith('/api/categories/') && path.endsWith('/merge') && method === 'POST') {
      const sourceId = path.split('/')[3]
      const body = request.postDataJSON()
      const target = categories.find(item => item.id === body.target_category_id)
      categories = categories.map(item => {
        if (item.id === sourceId) {
          return { ...item, disabled_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        }
        return item
      })
      products = products.map(item => item.category_id === sourceId ? { ...item, category_id: body.target_category_id, category: target ?? item.category } : item)
      const updatedCategory = categories.find(item => item.id === sourceId)
      await route.fulfill({ json: updatedCategory })
      return
    }
    if (path === '/api/warehouses') {
      await route.fulfill({ json: [warehouse] })
      return
    }
    if (path === '/api/inventory') {
      await route.fulfill({ json: inventory })
      return
    }
    if (path === '/api/suppliers' || path === '/api/activities' || path === '/api/notifications') {
      await route.fulfill({ json: [] })
      return
    }
    if (path === '/api/stock-in' && method === 'POST') {
      const body = request.postDataJSON()
      captures.stockIn = body
      inventory = [{ ...inventory[0], quantity: inventory[0].quantity + body.quantity, updated_at: new Date().toISOString() }]
      await route.fulfill({ json: inventory[0] })
      return
    }
    if (path === '/api/stock-out' && method === 'POST') {
      const body = request.postDataJSON()
      captures.stockOut = body
      if (body.quantity > inventory[0].quantity) {
        await route.fulfill({ status: 409, json: { code: 'conflict', message: 'Stok tidak cukup untuk transaksi ini' } })
        return
      }
      inventory = [{ ...inventory[0], quantity: inventory[0].quantity - body.quantity, updated_at: new Date().toISOString() }]
      await route.fulfill({ json: inventory[0] })
      return
    }

    await fulfillFallback(route)
  })
}

export async function mockSuperAdminApi(page: Page) {
  await page.route(/https?:\/\/[^/]+\/api\/.*/, async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/login') {
      await route.fulfill({ json: { token: 'test-token', ...superAdminSession } })
      return
    }
    if (path === '/api/auth/me') {
      await route.fulfill({ json: superAdminSession })
      return
    }
    if (path === '/api/auth/logout') {
      await route.fulfill({ status: 204 })
      return
    }
    if (path === '/api/admin/dashboard/stats') {
      await route.fulfill({
        json: {
          total_workspaces: 1,
          active_workspaces: 1,
          trial_workspaces: 0,
          total_users: 1,
          total_revenue: 500000,
          recent_signups: 0,
          recent_users: [],
          recent_workspaces: [],
          plan_distribution: [{ plan: 'pro', count: 1 }],
          system_health: [{ service: 'API', status: 'healthy', uptime: 'online' }],
        },
      })
      return
    }

    await fulfillFallback(route)
  })
}

async function fulfillFallback(route: Route) {
  await route.fulfill({ json: route.request().method() === 'GET' ? [] : emptyPage() })
}
