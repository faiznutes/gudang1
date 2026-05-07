import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

const entitlements = {
  plan: 'pro',
  subscriptionStatus: 'active',
  trialEndsAt: null,
  features: {
    stockInOut: true,
    multiWarehouse: true,
    analytics: true,
    exportPDF: true,
    batchImport: true,
    reports: true,
  },
  limits: { warehouses: 10, products: 10000, users: 20 },
  usage: { warehouses: 2, products: 3, users: 2 },
}

function sessionPayload(role: 'super_admin' | 'admin') {
  return {
    user: {
      id: 'user-1',
      name: role === 'super_admin' ? 'Admin User' : 'Tenant Admin',
      email: 'admin@example.com',
      role,
      created_at: '2026-05-01T00:00:00.000Z',
    },
    workspace: {
      id: role === 'super_admin' ? 'platform-workspace' : 'tenant-workspace',
      name: role === 'super_admin' ? 'StockPilot Platform' : 'Tenant Test',
      plan: 'pro',
      status: 'active',
      created_at: '2026-05-01T00:00:00.000Z',
    },
    entitlements,
  }
}

function dashboardStatsPayload() {
  return {
    total_workspaces: 2,
    active_workspaces: 1,
    trial_workspaces: 1,
    total_users: 3,
    total_revenue: 500000,
    recent_signups: 1,
    recent_users: [],
    recent_workspaces: [],
    plan_distribution: [{ plan: 'pro', count: 1 }],
    system_health: [{ service: 'API', status: 'healthy', uptime: 'online' }],
  }
}

async function mockSession(page: import('@playwright/test').Page, role: 'super_admin' | 'admin', options: { authenticated?: boolean } = {}) {
  if (options.authenticated !== false) {
    await page.addInitScript(() => localStorage.setItem('token', 'test-token'))
  }
  await page.route(/https?:\/\/[^/]+\/api\/.*/, async route => {
    const url = route.request().url()
    if (url.includes('/api/auth/me')) {
      await route.fulfill({ json: sessionPayload(role) })
      return
    }
    if (url.includes('/api/auth/login')) {
      await route.fulfill({ json: { token: 'test-token', ...sessionPayload(role) } })
      return
    }
    if (url.includes('/api/admin/dashboard/stats')) {
      await route.fulfill({ json: dashboardStatsPayload() })
      return
    }
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: [] })
      return
    }
    await route.fulfill({ json: { ok: true } })
  })
}

test.describe('Super admin routes', () => {
  test('super admin can access the platform admin dashboard', async ({ page }) => {
    await mockSession(page, 'super_admin')
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()
  })

  test('super admin is sent directly to platform admin after login', async ({ page }) => {
    await mockSession(page, 'super_admin', { authenticated: false })
    await page.goto('/login')
    await page.getByPlaceholder('nama@email.com').fill('admin@example.com')
    await page.locator('input[type="password"]').fill('password123')
    await page.getByRole('button', { name: 'Masuk' }).click()
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()
  })

  test('super admin cannot be routed into tenant warehouse dashboard', async ({ page }) => {
    await mockSession(page, 'super_admin')
    await page.goto('/app')
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()
  })

  test('super admin can open the mobile account menu and logout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockSession(page, 'super_admin')
    await page.goto('/admin')

    await expect(page.getByTestId('sync-status-indicator')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Buka menu akun admin' })).toBeVisible()
    await page.getByRole('button', { name: 'Buka menu akun admin' }).click()
    await expect(page.getByRole('button', { name: 'Keluar' })).toBeVisible()

    await page.getByRole('button', { name: 'Keluar' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('tenant admin is redirected away from the platform admin dashboard', async ({ page }) => {
    await mockSession(page, 'admin')
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/app$/)
  })
})
