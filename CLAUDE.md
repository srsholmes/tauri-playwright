# CLAUDE.md

## Project Overview

Playwright E2E testing for Tauri desktop apps. Monorepo with a publishable npm package, a Rust plugin crate, and an example app.

## Commands

```bash
pnpm build                                        # Build all packages
pnpm test:unit                                     # Run vitest unit tests (127 tests)
pnpm test:e2e                                      # Run example app E2E tests
pnpm lint                                          # Run eslint
pnpm format                                        # Format with prettier
pnpm --filter @srsholmes/tauri-playwright build    # Build the npm package
pnpm --filter @srsholmes/tauri-playwright test     # Run unit tests for npm package
```

### Example App

```bash
cd examples/hello-world
pnpm dev                                 # Start Vite dev server (port 1420)
pnpm tauri:dev                           # Start full Tauri app
cargo tauri dev --features e2e-testing   # Start with playwright plugin
npx playwright test --config e2e/playwright.config.ts --project=browser-only  # Headless
npx playwright test --config e2e/playwright.config.ts --project=tauri         # Real app
```

## Architecture

```
packages/
  test/              # @srsholmes/tauri-playwright — npm package (TypeScript)
    src/
      fixture.ts     # createTauriTest() — Playwright fixture factory (3 modes)
      tauri-page.ts  # TauriPage — 55+ methods, TauriLocator, TauriKeyboard, TauriMouse
      browser-page-adapter.ts  # BrowserPageAdapter wrapping Playwright Page
      expect.ts      # 19 custom matchers (toBeVisible, toContainText, etc.)
      ipc-mock.ts    # Tauri IPC mock injection script generator
      socket-client.ts  # PluginClient — Unix/TCP socket communication
      process-manager.ts # TauriProcessManager — app lifecycle
      types.ts       # TypeScript types
      index.ts       # Public exports
  plugin/            # tauri-plugin-playwright — Rust crate
    src/
      lib.rs         # Plugin init, config, JS polling script injection
      commands.rs    # Command protocol (60+ variants with auto-wait timeout)
      server.rs      # Socket + HTTP servers, action_js/query_js helpers
      native_capture.rs  # CoreGraphics screenshot + video frame capture

examples/
  hello-world/       # Example Tauri 2 app for testing
    src/             # React frontend (counter, greet, todo, modal, file upload, dialogs, drag & drop, API fetch)
    src-tauri/       # Rust backend with greet command + playwright plugin
    e2e/             # 67 Playwright tests across 10 spec files
```

## Key Design Decisions

- **Auto-waiting**: All action/query commands poll for element with 50ms interval until timeout (default 5s). Generated as async JS retry loops in server.rs via `action_js()` and `query_js()` helpers.
- **Three modes**: browser (headless Chromium + mocked IPC), tauri (socket bridge to real webview), cdp (direct CDP to WebView2 on Windows).
- **Dynamic mock handlers**: IPC mocks are serialized as function strings and injected into the page.
- **`withGlobalTauri: true` required**: The mock intercepts `window.__TAURI_INTERNALS__`.
- **Native capture**: CoreGraphics FFI on macOS for pixel-perfect screenshots and video frame capture.

## Tech Stack

- **Package Manager**: pnpm 9.15+
- **Package Bundler**: tsup (ESM + DTS)
- **Test Framework**: Playwright + vitest
- **Linting**: eslint + typescript-eslint + prettier
- **Frontend**: React 18 + Vite + TypeScript
- **Desktop**: Tauri 2.0 (Rust)
