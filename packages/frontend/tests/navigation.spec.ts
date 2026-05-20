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
  usage: { warehouses: 2, products: 3, users: 2 },
}

function sessionPayload() {
  return {
    user: {
      id: 'tenant-admin',
      name: 'Tenant Admin',
      email: 'admin@example.com',
      role: 'admin',
      created_at: '2026-05-01T00:00:00.000Z',
    },
    workspace: {
      id: 'tenant-workspace',
      name: 'Tenant Test',
      plan: 'pro',
      status: 'active',
      created_at: '2026-05-01T00:00:00.000Z',
    },
    entitlements,
  }
}

async function mockApi(page: Page) {
  await page.route(/https?:\/\/[^/]+\/api\/.*/, async route => {
    const url = route.request().url()
    if (url.includes('/api/auth/login')) {
      await route.fulfill({ json: { token: 'test-token', ...sessionPayload() } })
      return
    }
    if (url.includes('/api/auth/me')) {
      await route.fulfill({ json: sessionPayload() })
      return
    }
    if (url.includes('/api/entitlements')) {
      await route.fulfill({ json: entitlements })
      return
    }
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: [] })
      return
    }
    await route.fulfill({ json: { ok: true } })
  })
}

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
    await page.goto('/login')
    await page.getByPlaceholder('nama@email.com').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('password123')
    await page.getByRole('button', { name: 'Masuk' }).click()
    await page.waitForURL(/\/app$/)
  })

  test('desktop sidebar navigation', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Desktop sidebar only')
    const sidebarNav = page.locator('aside nav')
    await expect(sidebarNav.getByRole('button', { name: 'Produk', exact: true })).toBeVisible()
    await expect(sidebarNav.getByRole('button', { name: 'Kategori', exact: true })).toBeVisible()
    await expect(sidebarNav.getByRole('button', { name: 'Gudang', exact: true })).toBeVisible()
    await expect(sidebarNav.getByRole('button', { name: 'Riwayat Stok', exact: true })).toBeVisible()

    await sidebarNav.getByRole('button', { name: 'Produk', exact: true }).click()
    await expect(page).toHaveURL(/\/app\/inventory$/)
    await expect(page.getByPlaceholder('Cari produk atau SKU...')).toBeVisible()

    await sidebarNav.getByRole('button', { name: 'Kategori', exact: true }).click()
    await expect(page).toHaveURL(/\/app\/categories$/)
    await expect(page.getByText('Kategori aktif')).toBeVisible()

    await sidebarNav.getByRole('button', { name: 'Gudang', exact: true }).click()
    await expect(page).toHaveURL(/\/app\/warehouses$/)
  })

  test('sidebar collapse', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Desktop sidebar only')
    const collapseButton = page.locator('aside button').first()
    await expect(collapseButton).toBeVisible()
    await collapseButton.click()

    const sidebar = page.locator('aside')
    await expect(sidebar).toHaveClass(/w-20/)

    const expandButton = page.locator('aside button').first()
    await expect(expandButton).toBeVisible()
    await expandButton.click()

    await expect(sidebar).toHaveClass(/w-64/)
  })

  test('mobile bottom nav presence', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const bottomNav = page.locator('nav.fixed.bottom-0')

    await expect(bottomNav.getByRole('button', { name: 'Home', exact: true })).toBeVisible()
    await expect(bottomNav.getByRole('button', { name: 'Produk', exact: true })).toBeVisible()
    await expect(bottomNav.getByRole('button', { name: 'Buka tambah cepat' })).toBeVisible()
    await expect(bottomNav.getByRole('button', { name: 'Gudang', exact: true })).toBeVisible()
    await expect(bottomNav.getByRole('button', { name: 'Lainnya', exact: true })).toBeVisible()

    await bottomNav.getByRole('button', { name: 'Buka tambah cepat' }).click()
    const quickSheet = page.locator('div.fixed.inset-0.z-50').filter({ hasText: 'Tambah cepat' }).last()
    await expect(page.getByText('Tambah cepat')).toBeVisible()
    await expect(quickSheet.getByRole('button', { name: /Tambah produk/ })).toBeVisible()
    await expect(quickSheet.getByRole('button', { name: /Stok masuk/ })).toBeVisible()
    await expect(quickSheet.getByRole('button', { name: /Stok keluar/ })).toBeVisible()

    await page.getByRole('button', { name: 'Tutup tambah cepat' }).click()
    await bottomNav.getByRole('button', { name: 'Lainnya', exact: true }).click()
    const moreSheet = page.locator('div.fixed.inset-0.z-50').filter({ hasText: 'Menu kerja' }).last()
    await expect(moreSheet.getByText('Kategori')).toBeVisible()
  })

  test('no burger menu on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    const burgerButton = page.locator('button').filter({ has: page.locator('svg.lucide-menu') })
    await expect(burgerButton).not.toBeVisible()
  })
})
