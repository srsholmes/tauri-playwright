---
'@srsholmes/tauri-playwright': minor
---

Add a `mode` option to `createTauriTest()`. It sets the default mode, and with `'tauri'` or `'cdp'` the `tauriPage` fixture no longer depends on Playwright's `page`, so no headless Chromium launches per worker and Chromium doesn't need to be installed. A project that sets `use: { mode: 'browser' }` then throws. Without the option, nothing changes.
