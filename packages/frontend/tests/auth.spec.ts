import { expect, test } from '@playwright/test'

test.describe('Authentication', () => {
  test('super admin can login', async ({ page }) => {
    await page.goto('http://localhost:3000/login')

    await expect(page.getByText('StockPilot')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Masuk' })).toBeVisible()

    await page.getByPlaceholder('nama@email.com').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('password123')
    await page.getByRole('button', { name: 'Masuk' }).click()

    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByText('Admin Panel')).toBeVisible()
  })

  test('register route sends visitors to WhatsApp trial request', async ({ page }) => {
    await page.goto('http://localhost:3000/register')

    await expect(page).toHaveURL(/\/trial-signup$/)
    await expect(page.getByRole('heading', { name: 'Request trial StockPilot lewat WhatsApp' })).toBeVisible()
  })

  test('super admin can logout', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.getByPlaceholder('nama@email.com').fill('admin@example.com')
    await page.getByPlaceholder('Password').fill('password123')
    await page.getByRole('button', { name: 'Masuk' }).click()

    await expect(page).toHaveURL(/\/admin$/)
    await page.getByTitle('Logout').click()

    await expect(page).toHaveURL(/\/login$/)
  })
})
