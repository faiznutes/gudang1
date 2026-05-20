import { expect, test } from '@playwright/test'
import { mockTenantApi } from './helpers/mockApi'

test.use({ serviceWorkers: 'block' })

test('tenant category lifecycle works end to end', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Category lifecycle smoke runs on desktop only')
  await mockTenantApi(page)
  await page.goto('/login')
  await page.getByPlaceholder('nama@email.com').fill('tenant@example.com')
  await page.getByPlaceholder('Password').fill('password123')
  await page.getByRole('button', { name: 'Masuk' }).click()
  await page.waitForURL(/\/app$/)

  await page.getByRole('button', { name: 'Kategori' }).click()
  await expect(page).toHaveURL(/\/app\/categories$/)
  await expect(page.getByText('Kategori aktif')).toBeVisible()

  await page.getByRole('button', { name: 'Tambah kategori' }).first().click()
  await page.getByLabel('Nama kategori').fill('Aksesoris')
  await page.getByLabel('Catatan').fill('Barang pelengkap')
  await page.getByRole('button', { name: 'Simpan kategori' }).click()
  await expect(page.getByText('Aksesoris')).toBeVisible()
  await expect(page.getByText('Kategori berhasil disimpan')).toBeVisible()

  const newCategoryCard = page.locator('article').filter({ hasText: 'Aksesoris' }).first()
  page.once('dialog', dialog => dialog.accept())
  await newCategoryCard.getByRole('button', { name: 'Arsipkan' }).click()
  await expect(page.getByText('Kategori berhasil diarsipkan')).toBeVisible()
  await expect(newCategoryCard.getByText('Arsip')).toBeVisible()

  await newCategoryCard.getByRole('button', { name: 'Pulihkan' }).click()
  await expect(page.getByText('Kategori berhasil diaktifkan kembali')).toBeVisible()
  await expect(newCategoryCard.getByText('Aktif')).toBeVisible()
})
