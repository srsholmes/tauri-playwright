# CLAUDE.md

## Project Overview

Playwright E2E testing for Tauri desktop apps. Monorepo with a publishable npm package, a Rust plugin crate, and an example app.

## Commands

```bash
pnpm build                              # Build all packages
pnpm test:e2e                           # Run example app E2E tests
pnpm --filter @srsholmes/tauri-playwright build   # Build the npm package
pnpm --filter @srsholmes/tauri-playwright dev     # Watch mode for the npm package
```

### Example App

```bash
cd examples/hello-world
pnpm dev                                 # Start Vite dev server (port 1420)
pnpm tauri:dev                           # Start full Tauri app
pnpm test:e2e                            # Run Playwright tests (browser-only)
npx playwright test --config e2e/playwright.config.ts --ui  # Playwright UI mode
```

## Architecture

```
packages/
  test/              # @srsholmes/tauri-playwright — npm package (TypeScript)
    src/
      fixture.ts     # createTauriTest() — Playwright fixture factory
      ipc-mock.ts    # Tauri IPC mock injection script generator
      types.ts       # TypeScript types
      index.ts       # Public exports
  plugin/            # tauri-plugin-playwright — Rust crate (stub, future)
    src/
      lib.rs         # Plugin init + config
      commands.rs    # Command protocol definitions
      server.rs      # Socket server (TODO)

examples/
  hello-world/       # Example Tauri 2 app for testing
    src/             # React frontend with counter, greet, todo, modal
    src-tauri/       # Rust backend with greet command
    e2e/             # Playwright tests using @srsholmes/tauri-playwright
```

## Key Design Decisions

- **Dynamic mock handlers**: IPC mocks are serialized as function strings (via `.toString()`) and injected into the page. Handlers run at invoke-time with real args, not at script generation time.
- **`withGlobalTauri: true` required**: The mock intercepts `window.__TAURI_INTERNALS__` which Tauri creates when this config option is set.
- **Dual-mode architecture**: Same test files work in browser-only mode (mocked IPC) and future Tauri mode (real app via MCP bridge).
- **tsup for building**: Single ESM output with TypeScript declarations.

## Tech Stack

- **Package Manager**: pnpm 9.15+
- **Package Bundler**: tsup
- **Test Framework**: Playwright
- **Frontend**: React 18 + Vite + TypeScript
- **Desktop**: Tauri 2.0 (Rust)
