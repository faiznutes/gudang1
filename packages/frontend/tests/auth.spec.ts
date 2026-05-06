import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login and register flows', async ({ page }) => {
    await page.goto('http://localhost:3000/login')

    await expect(page.getByText('StockPilot')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Masuk' })).toBeVisible()

    await page.getByPlaceholder('nama@email.com').fill('admin@example.com')
    await page.getByPlaceholder('••••••••').fill('password123')
    await page.getByRole('button', { name: 'Masuk' }).click()

    await expect(page).toHaveURL('http://localhost:3000/app')
    await expect(page.getByText('Halo, Admin')).toBeVisible()
  })

  test('register new user', async ({ page }) => {
    await page.goto('http://localhost:3000/register')

    await page.getByPlaceholder('Budi Santoso').fill('Test User')
    await page.getByPlaceholder('nama@email.com').fill('test@example.com')
    await page.getByPlaceholder('••••••••').first().fill('password123')
    await page.getByPlaceholder('••••••••').last().fill('password123')
    await page.getByRole('button', { name: 'Daftar' }).click()

    await expect(page).toHaveURL('http://localhost:3000/app')
  })

  test('logout flow', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.getByPlaceholder('nama@email.com').fill('admin@example.com')
    await page.getByPlaceholder('••••••••').fill('password123')
    await page.getByRole('button', { name: 'Masuk' }).click()

    await page.locator('button').filter({ hasText: /^Admin/ }).click()
    await page.getByRole('button', { name: 'Keluar' }).click()

    await expect(page).toHaveURL('http://localhost:3000/login')
  })
})