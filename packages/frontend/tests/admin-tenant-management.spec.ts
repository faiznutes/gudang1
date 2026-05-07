import { expect, test, type Page } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

const entitlements = {
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

const workspace = {
  id: 'ws-1',
  name: 'Tenant Test',
  owner_id: 'owner-1',
  owner_name: 'Owner Test',
  owner_email: 'owner@test.local',
  plan: 'growth',
  status: 'active',
  users: 2,
  products: 1,
  warehouses: 2,
  suppliers: 1,
  mrr: 300000,
  trial_ends_at: null,
  created_at: '2026-05-01T00:00:00.000Z',
}

const subscription = {
  id: 'sub-1',
  workspace_id: 'ws-1',
  workspace,
  plan: 'growth',
  status: 'active',
  amount: 300000,
  billing_cycle: 'monthly',
  current_period_start: '2026-05-01T00:00:00.000Z',
  current_period_end: '2026-06-01T00:00:00.000Z',
  next_billing: '2026-06-01T00:00:00.000Z',
  cancel_at_period_end: false,
}

function paged<T>(data: T[]) {
  return { data, meta: { current_page: 1, per_page: 10, total: data.length, total_pages: 1 } }
}

async function mockAdminApi(page: Page, captures: Record<string, unknown> = {}) {
  await page.addInitScript(() => {
    const today = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('stockpilot:pwa-popup-dismissed-date', today)
  })
  await page.route(/https?:\/\/[^/]+\/api\/.*/, async route => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const method = route.request().method()

    if (path === '/api/auth/me') {
      await route.fulfill({
        json: {
          user: { id: 'admin-1', name: 'Super Admin', email: 'admin@test.local', role: 'super_admin', created_at: '2026-05-01T00:00:00.000Z' },
          workspace: { id: 'platform', name: 'Platform', plan: 'pro', status: 'active', created_at: '2026-05-01T00:00:00.000Z' },
          entitlements,
        },
      })
      return
    }

    if (path === '/api/admin/workspaces' && method === 'GET') {
      await route.fulfill({ json: paged([workspace]) })
      return
    }

    if (path === '/api/admin/workspaces' && method === 'POST') {
      captures.createdTenant = route.request().postDataJSON()
      await route.fulfill({ json: { ...workspace, id: 'ws-new', name: (captures.createdTenant as { name: string }).name } })
      return
    }

    if (path === '/api/admin/subscriptions' && method === 'GET') {
      await route.fulfill({ json: paged([subscription]) })
      return
    }

    if (path === '/api/admin/dashboard/stats') {
      await route.fulfill({
        json: {
          total_workspaces: 1,
          active_workspaces: 1,
          trial_workspaces: 0,
          total_users: 2,
          total_revenue: 300000,
          recent_signups: 0,
          recent_users: [],
          recent_workspaces: [workspace],
          plan_distribution: [{ plan: 'growth', count: 1 }],
          system_health: [{ service: 'API', status: 'healthy', uptime: 'online' }],
        },
      })
      return
    }

    if (path === '/api/admin/workspaces/ws-1/products') {
      await route.fulfill({
        json: [
          {
            id: 'product-1',
            sku: 'SKU-001',
            name: 'Keyboard Creator',
            category_id: 'cat-1',
            category: { id: 'cat-1', name: 'Aksesori' },
            min_stock: 5,
            price: 125000,
            disabled_at: null,
            created_at: '2026-05-01T00:00:00.000Z',
            updated_at: '2026-05-01T00:00:00.000Z',
          },
        ],
      })
      return
    }

    if (path === '/api/admin/workspaces/ws-1/warehouses') {
      await route.fulfill({
        json: [
          { id: 'wh-1', name: 'Gudang Utama', address: 'Jakarta', is_default: true, disabled_at: null, created_at: '2026-05-01T00:00:00.000Z' },
          { id: 'wh-2', name: 'Gudang Cadangan', address: 'Bandung', is_default: false, disabled_at: null, created_at: '2026-05-01T00:00:00.000Z' },
        ],
      })
      return
    }

    if (path === '/api/admin/workspaces/ws-1/suppliers') {
      await route.fulfill({
        json: [
          { id: 'supplier-1', name: 'Supplier Nusantara', contact_person: 'Sari', phone: '0812345', email: 'supplier@test.local', address: 'Bekasi', notes: '', disabled_at: null, created_at: '2026-05-01T00:00:00.000Z' },
        ],
      })
      return
    }

    if (path === '/api/admin/workspaces/ws-1/scheduled-activities') {
      await route.fulfill({
        json: [
          { id: 'activity-1', workspace_id: 'ws-1', title: 'Stock opname', type: 'audit', status: 'pending', due_at: '2026-05-10T00:00:00.000Z', disabled_at: null, created_at: '2026-05-01T00:00:00.000Z', updated_at: '2026-05-01T00:00:00.000Z' },
        ],
      })
      return
    }

    if (path === '/api/admin/workspaces/ws-1/inventory-summary') {
      await route.fulfill({
        json: {
          workspace,
          totals: { items: 1, stock: 9, low_stock: 0 },
          items: [
            {
              id: 'inv-1',
              product_id: 'product-1',
              product_name: 'Keyboard Creator',
              product_sku: 'SKU-001',
              warehouse_id: 'wh-1',
              warehouse_name: 'Gudang Utama',
              quantity: 9,
              min_stock: 5,
              status: 'ok',
              updated_at: '2026-05-01T00:00:00.000Z',
            },
          ],
        },
      })
      return
    }

    if (path.endsWith('/stock-transfer') && method === 'POST') {
      captures.stockTransfer = route.request().postDataJSON()
      await route.fulfill({ json: { ok: true } })
      return
    }

    if (path.endsWith('/period') && method === 'PUT') {
      captures.periodUpdate = route.request().postDataJSON()
      await route.fulfill({ json: { ...subscription, ...captures.periodUpdate } })
      return
    }

    await route.fulfill({ json: method === 'GET' ? [] : { ok: true } })
  })
}

test.describe('Super admin tenant management', () => {
  test('creates a tenant with owner, isolated warehouse, staff, and supplier defaults', async ({ page }) => {
    const captures: Record<string, unknown> = {}
    await mockAdminApi(page, captures)

    await page.goto('/admin/workspaces')
    await page.getByRole('button', { name: /Tambah Tenant/ }).click()

    const modal = page.locator('form').filter({ hasText: 'Tambah Tenant Baru' })
    await modal.getByPlaceholder('Nama tenant atau perusahaan').fill('Tenant Baru')
    await modal.getByRole('button', { name: 'Lanjut' }).click()
    await modal.getByPlaceholder('Nama tenant admin').fill('Owner Baru')
    await modal.getByPlaceholder('owner@email.com').fill('owner-baru@test.local')
    await modal.getByRole('button', { name: 'Tambah Staff' }).click()
    await modal.getByPlaceholder('Nama staff').fill('Staff Gudang')
    await modal.getByPlaceholder('staff@email.com').fill('staff@test.local')
    await modal.getByRole('button', { name: 'Lanjut' }).click()
    await modal.getByPlaceholder('Alamat gudang utama').fill('Jakarta Barat')
    await modal.getByRole('button', { name: 'Tambah Supplier' }).click()
    await modal.getByPlaceholder('Nama supplier').fill('Supplier Awal')
    await modal.getByPlaceholder('PIC').fill('Budi')
    await modal.getByRole('button', { name: 'Lanjut' }).click()
    await modal.getByRole('button', { name: 'Buat Tenant' }).click()

    await expect.poll(() => captures.createdTenant).toBeTruthy()
    expect(captures.createdTenant).toMatchObject({
      name: 'Tenant Baru',
      owner: { email: 'owner-baru@test.local' },
      warehouse: { address: 'Jakarta Barat' },
      staff: [{ email: 'staff@test.local' }],
      suppliers: [{ name: 'Supplier Awal' }],
    })
  })

  test('opens client warehouse tools and submits a stock transfer', async ({ page }) => {
    const captures: Record<string, unknown> = {}
    await mockAdminApi(page, captures)

    await page.goto('/admin/client-warehouse')
    await expect(page.getByRole('heading', { name: 'Gudang Klien' })).toBeVisible()
    await page.getByRole('button', { name: /Supplier/ }).click()
    await expect(page.getByText('Supplier Nusantara')).toBeVisible()
    await page.getByRole('button', { name: /Total Stok/ }).click()
    await expect(page.getByRole('heading', { name: 'Operasi Stok' })).toBeVisible()
    await page.getByRole('button', { name: 'Transfer' }).click()
    await page.getByRole('button', { name: 'Simpan Operasi' }).click()

    await expect.poll(() => captures.stockTransfer).toBeTruthy()
    expect(captures.stockTransfer).toMatchObject({
      product_id: 'product-1',
      warehouse_id: 'wh-1',
      to_warehouse_id: 'wh-2',
      quantity: 1,
    })
  })

  test('updates a subscription period with quick actions', async ({ page }) => {
    const captures: Record<string, unknown> = {}
    await mockAdminApi(page, captures)

    await page.goto('/admin/subscriptions')
    await page.getByTitle('Ubah masa aktif').click()
    await expect(page.getByRole('heading', { name: 'Ubah Masa Aktif' })).toBeVisible()
    await page.getByRole('button', { name: '+7 Hari' }).click()
    await page.getByRole('button', { name: 'Simpan Masa Aktif' }).click()

    await expect.poll(() => captures.periodUpdate).toBeTruthy()
    expect(captures.periodUpdate).toMatchObject({
      status: 'active',
    })
    expect(new Date((captures.periodUpdate as { current_period_end: string }).current_period_end).getTime()).toBeGreaterThan(new Date(subscription.current_period_end).getTime())
  })
})
