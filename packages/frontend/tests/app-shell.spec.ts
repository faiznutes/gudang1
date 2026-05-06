import { expect, test } from '@playwright/test'

test.describe('App shell boot', () => {
  test('landing never renders authenticated app chrome while session validation is pending', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('token', 'stale-token'))

    await page.route(/\/api\/auth\/me$/, async route => {
      await new Promise(resolve => setTimeout(resolve, 500))
      await route.fulfill({
        status: 401,
        json: { code: 'unauthenticated', message: 'Sesi berakhir' },
      })
    })
    await page.route(/\/api\/auth\/logout$/, async route => {
      await route.fulfill({ status: 204 })
    })
    await page.route(/\/api\/auth\/refresh$/, async route => {
      await route.fulfill({
        status: 401,
        json: { code: 'unauthenticated', message: 'Refresh token tidak valid' },
      })
    })

    await page.goto('/')

    const appSidebar = page.locator('aside.fixed.top-0.left-0')

    await expect(appSidebar).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /Kelola Gudang/ })).toBeVisible()
    await expect(appSidebar).toHaveCount(0)
  })
})
