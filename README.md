# tauri-playwright

Playwright E2E testing for Tauri desktop apps. Controls the real Tauri webview (WKWebView, WebView2, WebKitGTK) via a socket bridge -- no Chromium, no mocks, real app testing.

## The Problem

Tauri apps use system webviews instead of Chromium. Playwright requires Chrome DevTools Protocol (CDP) to control browsers, but **only WebView2 (Windows) supports CDP**. Standard Playwright integration is impossible on macOS and Linux.

## The Solution

A Rust plugin (`tauri-plugin-playwright`) embeds a socket server in your Tauri app. Playwright tests send commands over the socket, and the plugin executes them as JavaScript in the real native webview. Same test runner, same assertions, real app.

```
┌─────────────────┐    socket     ┌─────────────────────────────────┐
│  Playwright      │◄────────────►│  tauri-plugin-playwright        │
│  test runner     │   JSON/line  │  (embedded in your Tauri app)   │
│                  │              │                                 │
│  @srsholmes/tauri-playwright        │  Socket server ──► JS injection │
│  (npm)           │              │  HTTP polling  ◄── JS results   │
└─────────────────┘              └─────────────────────────────────┘
```

## Quick Start

### 1. Add the Rust plugin

```toml
# src-tauri/Cargo.toml
[features]
e2e-testing = ["tauri-plugin-playwright"]

[dependencies]
tauri-plugin-playwright = { version = "0.1", optional = true }
```

```rust
// src-tauri/src/lib.rs
pub fn run() {
    let mut builder = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![/* your commands */]);

    #[cfg(feature = "e2e-testing")]
    {
        builder = builder.plugin(tauri_plugin_playwright::init());
    }

    builder.run(tauri::generate_context!()).expect("error running app");
}
```

### 2. Install the npm package

```bash
pnpm add -D @srsholmes/tauri-playwright @playwright/test
```

### 3. Create fixtures

```ts
// e2e/fixtures.ts
import { createTauriTest } from '@srsholmes/tauri-playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const { test, expect } = createTauriTest({
  devUrl: 'http://localhost:1420',
  mcpSocket: '/tmp/tauri-playwright.sock',
  tauriCwd: resolve(__dirname, '..'),
});
```

### 4. Write tests

```ts
// e2e/tests/app.spec.ts
import { test, expect } from '../fixtures';

test('renders the main heading', async ({ tauriPage }) => {
  await expect(tauriPage.locator('[data-testid="heading"]')).toContainText('Hello, Tauri!');
});

test('counter increments', async ({ tauriPage }) => {
  await tauriPage.click('[data-testid="btn-increment"]');
  await expect(tauriPage.locator('[data-testid="counter-value"]')).toContainText('1');
});

test('greets the user via Rust backend', async ({ tauriPage }) => {
  await tauriPage.fill('[data-testid="greet-input"]', 'World');
  await tauriPage.click('[data-testid="btn-greet"]');
  await expect(tauriPage.locator('[data-testid="greet-msg"]')).toContainText('Hello, World!');
});
```

### 5. Run the Tauri app with the plugin, then run tests

```bash
# Terminal 1: Start the Tauri app with e2e feature
cd your-app
cargo tauri dev --features e2e-testing

# Terminal 2: Run Playwright tests
npx playwright test --config e2e/playwright.config.ts
```

## How It Works

1. The Rust plugin starts a **socket server** (Unix socket on macOS/Linux, TCP on Windows) and an **HTTP server** inside your Tauri app
2. A **polling script** is injected into the webview that checks the HTTP server every 16ms for pending commands
3. Your Playwright test sends a command (e.g., `click`, `fill`, `evaluate`) over the socket
4. The plugin translates it to JavaScript, queues it for the webview
5. The webview executes the JS and POSTs the result back
6. The plugin returns the result to your test

This approach works with **any webview engine** -- WKWebView (macOS), WebView2 (Windows), WebKitGTK (Linux) -- because it uses standard DOM APIs, not browser-specific protocols.

## Available Commands

The `tauriPage` fixture provides a Playwright-like API:

```ts
// Navigation
await tauriPage.goto('http://localhost:1420/settings');
await tauriPage.title();
await tauriPage.url();

// Interaction
await tauriPage.click('[data-testid="submit"]');
await tauriPage.fill('[data-testid="input"]', 'hello');
await tauriPage.type('[data-testid="input"]', 'hello');   // char by char
await tauriPage.press('[data-testid="input"]', 'Enter');

// Queries
await tauriPage.textContent('[data-testid="message"]');
await tauriPage.getAttribute('[data-testid="link"]', 'href');
await tauriPage.inputValue('[data-testid="input"]');
await tauriPage.isVisible('[data-testid="modal"]');
await tauriPage.count('[data-testid="list-item"]');

// Waiting
await tauriPage.waitForSelector('[data-testid="loaded"]', 5000);

// Arbitrary JS execution in the real webview
const result = await tauriPage.evaluate('document.title');

// Locator pattern (chainable)
await tauriPage.locator('[data-testid="modal"]').click();
await tauriPage.locator('[data-testid="heading"]').textContent();
```

## Screenshots

The plugin supports capturing screenshots of the webview content:

```ts
// Screenshot is returned via the socket protocol
await tauriPage.evaluate(`
  // JS-based screenshot (SVG foreignObject -> Canvas -> PNG)
`);
```

Native window screenshots (CoreGraphics on macOS) and video recording are in progress.

## Plugin Configuration

```rust
use tauri_plugin_playwright::PluginConfig;

// Default: Unix socket at /tmp/tauri-playwright.sock
builder = builder.plugin(tauri_plugin_playwright::init());

// Custom config
builder = builder.plugin(tauri_plugin_playwright::init_with_config(
    PluginConfig::new()
        .socket_path("/tmp/my-app-pw.sock")
        .tcp_port(6274)  // also listen on TCP
));
```

## Requirements

- **Tauri 2.0** with `"withGlobalTauri": true` in `tauri.conf.json`
- **Node.js 18+**
- **Rust toolchain** for building the Tauri app
- **Screen recording permissions** on macOS (for native screenshots/video)

## Architecture

```
packages/
  test/                  # @srsholmes/tauri-playwright (npm)
    src/
      fixture.ts         # createTauriTest() — Playwright fixture factory
      tauri-page.ts      # TauriPage — Playwright-like API over socket
      socket-client.ts   # PluginClient — Unix/TCP socket communication
      process-manager.ts # TauriProcessManager — app lifecycle
      types.ts           # TypeScript interfaces
      index.ts           # Public exports

  plugin/                # tauri-plugin-playwright (Rust crate)
    src/
      lib.rs             # Plugin init, config, JS polling script injection
      commands.rs        # Command protocol (Click, Fill, Eval, Screenshot, ...)
      server.rs          # Socket + HTTP servers, command execution

examples/
  hello-world/           # Example Tauri 2 app with E2E tests
    src/                 # React frontend (counter, greet, todo, modal)
    src-tauri/           # Rust backend with greet command + plugin
    e2e/                 # Playwright tests
```

## Roadmap

- [x] Socket bridge (Unix + TCP) with JSON command protocol
- [x] JS injection polling (16ms loop, no CDP required)
- [x] Playwright-like API (`click`, `fill`, `type`, `press`, `evaluate`, ...)
- [x] Locator pattern for chained operations
- [x] Process management (spawn Tauri app, wait for socket)
- [x] Screenshot capture (JS-based via SVG/Canvas)
- [ ] Native screenshots (CoreGraphics on macOS, platform APIs)
- [ ] Video recording of test execution
- [ ] File upload / download testing
- [ ] Multi-window support
- [ ] CI/CD helpers (GitHub Actions)

## License

MIT
