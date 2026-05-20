import { defineConfig, devices } from '@playwright/test'

const usePreview = process.env.PLAYWRIGHT_USE_PREVIEW === '1'
const port = Number(process.env.PLAYWRIGHT_PORT ?? (usePreview ? 4173 : 3000))
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/admin-debug.spec.ts', '**/admin-mobile.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'chromium-tablet',
      use: {
        viewport: { width: 1024, height: 1366 },
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: usePreview
      ? `pnpm preview -- --host 0.0.0.0 --port ${port}`
      : `pnpm dev --host 0.0.0.0 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI && !usePreview,
  },
})
