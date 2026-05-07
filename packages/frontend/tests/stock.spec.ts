import { test, expect } from '@playwright/test'
import { mockTenantApi, seedToken } from './helpers/mockApi'

test.use({ serviceWorkers: 'block' })

test.describe('Stock Flows', () => {
  test('stock in flow', async ({ page }) => {
    const captures: Record<string, unknown> = {}
    await seedToken(page)
    await mockTenantApi(page, captures)
    await page.goto('/app/stock-in')

    await page.locator('select').nth(0).selectOption('product-1')
    await page.locator('select').nth(1).selectOption('wh-1')
    await page.getByRole('spinbutton').fill('10')
    await page.getByPlaceholder('Catatan stok masuk').fill('Test stock in')
    await page.getByRole('button', { name: /Simpan/ }).click()

    await expect(page.getByText('Stock Masuk Dicatat!')).toBeVisible()
    expect(captures.stockIn).toMatchObject({ product_id: 'product-1', warehouse_id: 'wh-1', quantity: 10 })
  })

  test('stock out flow', async ({ page }) => {
    const captures: Record<string, unknown> = {}
    await seedToken(page)
    await mockTenantApi(page, captures)
    await page.goto('/app/stock-out')

    await page.locator('select').nth(0).selectOption('product-1')
    await page.locator('select').nth(1).selectOption('wh-1')
    await expect(page.getByText('Stok tersedia: 9')).toBeVisible()
    await page.getByRole('spinbutton').fill('1')
    await page.getByPlaceholder('Catatan stok keluar').fill('Test stock out')
    await page.getByRole('button', { name: /Simpan/ }).click()

    await expect(page.getByText('Stock Keluar Dicatat!')).toBeVisible()
    expect(captures.stockOut).toMatchObject({ product_id: 'product-1', warehouse_id: 'wh-1', quantity: 1 })
  })

  test('insufficient stock guard', async ({ page }) => {
    await seedToken(page)
    await mockTenantApi(page)
    await page.goto('/app/stock-out')

    await page.locator('select').nth(0).selectOption('product-1')
    await page.locator('select').nth(1).selectOption('wh-1')
    await page.getByRole('spinbutton').fill('99')
    await page.getByRole('button', { name: /Simpan/ }).click()

    await expect(page.getByText(/Stok tidak cukup/)).toBeVisible()
  })
})
