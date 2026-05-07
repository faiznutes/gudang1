import { test, expect } from '@playwright/test'
import { mockTenantApi, seedToken } from './helpers/mockApi'

test.use({ serviceWorkers: 'block' })

test.describe('Inventory', () => {
  test.beforeEach(async ({ page }) => {
    await seedToken(page)
    await mockTenantApi(page)
    await page.goto('/app')
  })

  test('create product', async ({ page }) => {
    const captures: Record<string, unknown> = {}
    await mockTenantApi(page, captures)

    await page.goto('/app/inventory/new')

    await page.getByPlaceholder('Kode SKU produk').fill('SKU-TEST-001')
    await page.getByPlaceholder('Nama produk').fill('Produk Test')
    await page.locator('select').first().selectOption('cat-1')
    await page.getByRole('spinbutton').nth(0).fill('5')
    await page.getByRole('spinbutton').nth(1).fill('50000')
    await page.getByRole('button', { name: /Simpan/ }).click()

    await expect(page).toHaveURL(/\/app\/inventory$/)
    await expect.poll(() => captures.createdProduct).toBeTruthy()
    expect(captures.createdProduct).toMatchObject({ sku: 'SKU-TEST-001', name: 'Produk Test' })
  })

  test('view product detail', async ({ page }) => {
    await page.goto('/app/inventory')

    await page.locator('tbody button').first().click()
    await page.getByRole('button', { name: 'Lihat' }).click()

    await expect(page).toHaveURL(/\/app\/inventory\/product-1$/)
    await expect(page.getByText('SKU-001')).toBeVisible()
    await expect(page.getByText('Baju Kaos Polos')).toBeVisible()
  })
})
