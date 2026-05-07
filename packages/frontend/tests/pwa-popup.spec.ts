import { expect, test } from '@playwright/test'

test.describe('PWA popup', () => {
  test('only appears for install prompts', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.removeItem('stockpilot:pwa-popup-dismissed-date')
      localStorage.removeItem('stockpilot:last-cache-refresh-at')
    })
    await page.reload()

    const popup = page.getByTestId('pwa-status-popup')
    await expect(popup).toBeHidden()

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt') as Event & {
        prompt: () => Promise<void>
        userChoice: Promise<{ outcome: 'dismissed'; platform: string }>
      }
      event.prompt = () => Promise.resolve()
      event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' })
      window.dispatchEvent(event)
    })

    await expect(popup).toBeVisible()
    await expect(page.getByText('Install StockPilot')).toBeVisible()
    await expect(page.getByText('StockPilot siap dipakai offline')).toBeHidden()

    await page.getByLabel('Tutup popup PWA').click()
    await expect(popup).toBeHidden()

    await page.reload()
    await expect(page.getByTestId('pwa-status-popup')).toBeHidden()
  })
})
