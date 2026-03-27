import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  timeout: 30000,

  projects: [
    {
      name: 'browser-only',
      use: {
        ...devices['Desktop Chrome'],
        // @ts-expect-error — custom fixture option
        mode: 'browser',
        trace: 'on',
        screenshot: 'on',
      },
    },
    {
      name: 'tauri',
      use: {
        // @ts-expect-error — custom fixture option
        mode: 'tauri',
        trace: 'on',
        // Disable Playwright's built-in screenshot — we capture native screenshots
        screenshot: 'off',
      },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    port: 1420,
    reuseExistingServer: !process.env.CI,
    cwd: '..',
  },
});
