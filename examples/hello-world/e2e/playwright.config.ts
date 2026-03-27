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
        // Traces and screenshots are useless in Tauri mode — they capture the
        // blank Playwright browser page, not the real Tauri webview.
        // Native screenshots are captured via CoreGraphics and attached to
        // the HTML report by the fixture on test failure.
        trace: 'off',
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
