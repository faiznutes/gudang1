import { expect, test } from '@playwright/test'

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

async function mockSession(page: import('@playwright/test').Page, role: 'super_admin' | 'admin') {
  await page.addInitScript(() => localStorage.setItem('token', 'test-token'))
  await page.route(/https?:\/\/[^/]+\/api\/auth\/me$/, async route => {
    await route.fulfill({
      json: {
        user: { id: 'user-1', name: role === 'super_admin' ? 'Admin User' : 'Tenant Admin', email: 'admin@example.com', role, created_at: '2026-05-01T00:00:00.000Z' },
        workspace: { id: 'workspace-1', name: 'Tenant Test', plan: 'pro', status: 'active', created_at: '2026-05-01T00:00:00.000Z' },
        entitlements,
      },
    })
  })
  await page.route(/https?:\/\/[^/]+\/api\/admin\/dashboard\/stats$/, async route => {
    await route.fulfill({
      json: {
        total_workspaces: 2,
        active_workspaces: 1,
        trial_workspaces: 1,
        total_users: 3,
        total_revenue: 299000,
        recent_signups: 1,
        recent_users: [],
        recent_workspaces: [],
        plan_distribution: [{ plan: 'pro', count: 1 }],
        system_health: [{ service: 'API', status: 'healthy', uptime: 'online' }],
      },
    })
  })
  await page.route(/https?:\/\/[^/]+\/api\/.*/, async route => {
    const url = route.request().url()
    if (url.includes('/api/auth/me') || url.includes('/api/admin/dashboard/stats')) {
      await route.fallback()
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

  test('tenant admin is redirected away from the platform admin dashboard', async ({ page }) => {
    await mockSession(page, 'admin')
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/app$/)
  })
})
