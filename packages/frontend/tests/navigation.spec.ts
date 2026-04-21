import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.getByPlaceholder('nama@email.com').fill('admin@example.com')
    await page.getByPlaceholder('••••••••').fill('password123')
    await page.getByRole('button', { name: 'Masuk' }).click()
    await page.waitForURL('http://localhost:3000/')
  })

  test('desktop sidebar navigation', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Inventori' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Gudang' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mutasi' })).toBeVisible()

    await page.getByRole('button', { name: 'Inventori' }).click()
    await expect(page).toHaveURL('http://localhost:3000/inventory')
    await expect(page.getByText('Kelola produk dan stok')).toBeVisible()

    await page.getByRole('button', { name: 'Gudang' }).click()
    await expect(page).toHaveURL('http://localhost:3000/warehouses')
  })

  test('sidebar collapse', async ({ page }) => {
    const collapseButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') })
    if (await collapseButton.isVisible()) {
      await collapseButton.click()
    }

    const sidebar = page.locator('aside')
    await expect(sidebar).toHaveClass(/w-20/)

    const expandButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') })
    if (await expandButton.isVisible()) {
      await expandButton.click()
    }

    await expect(sidebar).toHaveClass(/w-64/)
  })

  test('mobile bottom nav presence', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await expect(page.getByRole('button', { name: 'Home' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Inventori' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tambah' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aktivitas' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pengaturan' })).toBeVisible()
  })

  test('no burger menu on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    const burgerButton = page.locator('button').filter({ has: page.locator('svg.lucide-menu') })
    await expect(burgerButton).not.toBeVisible()
  })
})