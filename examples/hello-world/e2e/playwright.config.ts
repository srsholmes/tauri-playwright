import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30000,

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'browser-only',
      use: {
        ...devices['Desktop Chrome'],
        // @ts-expect-error — custom fixture option
        mode: 'browser',
      },
    },
    {
      name: 'tauri',
      use: {
        // @ts-expect-error — custom fixture option
        mode: 'tauri',
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
