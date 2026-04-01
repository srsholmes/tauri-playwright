import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
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
  ],

  webServer: {
    command: 'bunx vite --port 1421',
    port: 1421,
    reuseExistingServer: true,
    cwd: '../hello-world',
  },
});
