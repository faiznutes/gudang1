import { expect, test } from '@playwright/test'

test.describe('PWA popup', () => {
  test('appears once per local day and stays hidden after close', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.removeItem('stockpilot:pwa-popup-dismissed-date')
      localStorage.removeItem('stockpilot:last-cache-refresh-at')
    })
    await page.reload()

    const popup = page.getByTestId('pwa-status-popup')
    await expect(popup).toBeVisible()

    await page.getByLabel('Tutup popup PWA').click()
    await expect(popup).toBeHidden()

    await page.reload()
    await expect(page.getByTestId('pwa-status-popup')).toBeHidden()
  })
})
