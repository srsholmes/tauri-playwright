# tauri-playwright

Playwright E2E testing for Tauri desktop apps. Test your Tauri app's UI with Playwright's test runner, assertions, and tooling -- no Rust compilation needed for browser-only mode.

## The Problem

Tauri apps use system webviews (WKWebView on macOS, WebView2 on Windows, WebKitGTK on Linux) instead of Chromium. Playwright requires Chrome DevTools Protocol (CDP) to control browsers, but **only WebView2 (Windows) supports CDP**. This makes standard Playwright integration impossible on macOS and Linux.

## The Solution

`@tauri-playwright/test` provides two testing modes from the same test files:

- **Browser-only mode** (available now): Runs your Tauri app's frontend in Chromium with Tauri IPC mocked. Fast, no Rust toolchain needed. Perfect for CI and rapid iteration.

- **Full Tauri mode** (coming soon): Runs the real Tauri app with a plugin bridge (`tauri-plugin-playwright`) that controls the native webview via socket commands. True E2E including the Rust backend.

## Quick Start

### 1. Install

```bash
pnpm add -D @tauri-playwright/test @playwright/test
npx playwright install chromium
```

### 2. Create fixtures

```ts
// e2e/fixtures.ts
import { createTauriTest } from '@tauri-playwright/test';

export const { test, expect } = createTauriTest({
  devUrl: 'http://localhost:1420',
  ipcMocks: {
    // Mock your Tauri invoke commands
    greet: (args) => `Hello, ${args?.name}!`,
    get_items: () => [{ id: 1, name: 'Item 1' }],
  },
});
```

### 3. Write tests

```ts
// e2e/tests/app.spec.ts
import { test, expect } from '../fixtures';

test('greets the user', async ({ tauriPage }) => {
  await tauriPage.fill('[data-testid="name-input"]', 'World');
  await tauriPage.click('[data-testid="btn-greet"]');
  await expect(tauriPage.locator('[data-testid="greeting"]')).toContainText('Hello, World!');
});
```

### 4. Configure Playwright

```ts
// e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  projects: [{ name: 'browser-only', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev', // Start your Vite dev server
    port: 1420,
    reuseExistingServer: !process.env.CI,
    cwd: '..',
  },
});
```

### 5. Run

```bash
npx playwright test --config e2e/playwright.config.ts
```

## How It Works

When `withGlobalTauri: true` is set in your `tauri.conf.json`, the app accesses Tauri APIs through `window.__TAURI_INTERNALS__`. In browser-only mode, `@tauri-playwright/test` injects a mock of this global before the page loads, intercepting all `invoke()` calls and routing them to your mock handlers.

Your mock handlers receive the actual command args, so they can return dynamic responses:

```ts
ipcMocks: {
  // Static response
  get_config: () => ({ theme: 'dark', lang: 'en' }),

  // Dynamic response based on args
  search: (args) => items.filter(i => i.name.includes(args?.query)),
}
```

## Test Helpers

```ts
import { getCapturedInvokes, clearCapturedInvokes, emitMockEvent } from '@tauri-playwright/test';

// Assert which Tauri commands were called
const calls = await getCapturedInvokes(tauriPage);
expect(calls).toContainEqual(
  expect.objectContaining({ cmd: 'greet', args: { name: 'World' } })
);

// Clear the call log between assertions
await clearCapturedInvokes(tauriPage);

// Emit mock Tauri events (e.g., progress updates)
await emitMockEvent(tauriPage, 'download-progress', { percent: 50 });
```

## Requirements

- Your Tauri app must have `"withGlobalTauri": true` in `tauri.conf.json`
- Node.js 18+
- A Vite (or similar) dev server for the frontend

## Architecture

```
@tauri-playwright/test (npm package)
  - createTauriTest() — Playwright fixture factory
  - IPC mock layer — Intercepts window.__TAURI_INTERNALS__
  - Test helpers — getCapturedInvokes, emitMockEvent

tauri-plugin-playwright (Rust crate, coming soon)
  - Socket server embedded in debug builds
  - Accepts JSON commands from Playwright
  - Executes via webview JS injection
  - Enables true E2E on macOS/Linux/Windows
```

## Roadmap

- [x] Browser-only mode with IPC mocking
- [x] Dynamic mock handlers (receive invoke args)
- [x] IPC call capture and assertion helpers
- [x] Mock event emission
- [ ] Full Tauri mode via `tauri-plugin-playwright`
- [ ] Windows CDP mode (`chromium.connectOverCDP()`)
- [ ] Visual regression testing across webview engines
- [ ] CI/CD helpers (GitHub Actions)

## License

MIT
