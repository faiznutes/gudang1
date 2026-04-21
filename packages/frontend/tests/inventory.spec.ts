import { test, expect } from '@playwright/test'

test.describe('Inventory', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.getByPlaceholder('nama@email.com').fill('admin@example.com')
    await page.getByPlaceholder('••••••••').fill('password123')
    await page.getByRole('button', { name: 'Masuk' }).click()
    await page.waitForURL('http://localhost:3000/')
  })

  test('create product', async ({ page }) => {
    await page.goto('http://localhost:3000/inventory/new')

    await page.getByPlaceholder('Contoh: SKU-001').fill('SKU-TEST-001')
    await page.getByPlaceholder('Contoh: Baju Kaos Polos').fill('Produk Test')
    await page.getByLabel('Kategori').selectOption({ index: 1 })
    await page.getByLabel('Stok Minimum').fill('5')
    await page.getByLabel('Harga (Rp)').fill('50000')
    await page.getByRole('button', { name: 'Simpan' }).click()

    await expect(page).toHaveURL('http://localhost:3000/inventory')
    await expect(page.getByText('Produk Test')).toBeVisible()
  })

  test('view product detail', async ({ page }) => {
    await page.goto('http://localhost:3000/inventory')

    await page.getByRole('button').nth(1).click()
    await page.getByRole('button', { name: 'Lihat' }).click()

    await expect(page.getByText('SKU-001')).toBeVisible()
    await expect(page.getByText('Baju Kaos Polos')).toBeVisible()
  })
})