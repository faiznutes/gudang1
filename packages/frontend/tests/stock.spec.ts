import { test, expect } from '@playwright/test'

test.describe('Stock Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.getByPlaceholder('nama@email.com').fill('admin@example.com')
    await page.getByPlaceholder('••••••••').fill('password123')
    await page.getByRole('button', { name: 'Masuk' }).click()
    await page.waitForURL('http://localhost:3000/app')
  })

  test('stock in flow', async ({ page }) => {
    await page.goto('http://localhost:3000/app/stock-in')

    await page.getByLabel('Produk').selectOption({ index: 1 })
    await page.getByLabel('Gudang Tujuan').selectOption({ index: 1 })
    await page.getByLabel('Jumlah').fill('10')
    await page.getByPlaceholder('Contoh: Pembelian dari supplier ABC').fill('Test stock in')
    await page.getByRole('button', { name: 'Simpan' }).click()

    await expect(page.getByText('Stock Masuk Dicatat!')).toBeVisible()
  })

  test('stock out flow', async ({ page }) => {
    await page.goto('http://localhost:3000/app/stock-out')

    await page.getByLabel('Produk').selectOption({ index: 1 })
    await page.getByLabel('Gudang Asal').selectOption({ index: 1 })

    const stockAvailable = await page.locator('text=Stok tersedia:').textContent()
    const availableQty = stockAvailable ? parseInt(stockAvailable.match(/\d+/)?.[0] || '0') : 0

    if (availableQty > 0) {
      await page.getByLabel('Jumlah').fill('1')
      await page.getByPlaceholder('Contoh: Pesanan customer #123').fill('Test stock out')
      await page.getByRole('button', { name: 'Simpan' }).click()

      await expect(page.getByText('Stock Keluar Dicatat!')).toBeVisible()
    }
  })

  test('insufficient stock guard', async ({ page }) => {
    await page.goto('http://localhost:3000/app/stock-out')

    await page.getByLabel('Produk').selectOption({ index: 1 })
    await page.getByLabel('Gudang Asal').selectOption({ index: 1 })

    const stockAvailable = await page.locator('text=Stok tersedia:').textContent()
    const availableQty = stockAvailable ? parseInt(stockAvailable.match(/\d+/)?.[0] || '0') : 0

    if (availableQty > 0) {
      const overflowQty = availableQty + 100
      await page.getByLabel('Jumlah').fill(overflowQty.toString())
      await page.getByRole('button', { name: 'Simpan' }).click()

      await expect(page.getByText('Stok tidak cukup')).toBeVisible()
    }
  })
})