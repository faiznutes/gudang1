import { expect, test } from '@playwright/test'
import { mockSuperAdminApi } from './helpers/mockApi'

test.use({ serviceWorkers: 'block' })

test.describe('Authentication', () => {
  test('super admin can login', async ({ page }) => {
    await mockSuperAdminApi(page)
    await page.goto('/login')

    await expect(page.getByText('StockPilot')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Masuk' })).toBeVisible()

    await page.getByPlaceholder('nama@email.com').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('password123')
    await page.getByRole('button', { name: 'Masuk' }).click()

    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole('heading', { name: /Platform Command Center/ })).toBeVisible()
  })

  test('register route sends visitors to WhatsApp trial request', async ({ page }) => {
    await page.goto('/register')

    await expect(page).toHaveURL(/\/trial-signup$/)
    await expect(page.getByRole('heading', { name: 'Request trial StockPilot lewat WhatsApp' })).toBeVisible()
  })

  test('super admin can logout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockSuperAdminApi(page)
    await page.goto('/login')
    await page.getByPlaceholder('nama@email.com').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('password123')
    await page.getByRole('button', { name: 'Masuk' }).click()

    await expect(page).toHaveURL(/\/admin$/)
    await page.getByRole('button', { name: 'Buka menu akun admin' }).click()
    await page.getByRole('button', { name: 'Keluar' }).click()

    await expect(page).toHaveURL(/\/login$/)
  })
})
