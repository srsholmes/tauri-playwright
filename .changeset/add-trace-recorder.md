---
"@srsholmes/tauri-playwright": minor
---

Add Playwright-compatible trace recorder. In `tauri` mode, `createTauriTest()` now automatically records a `trace.zip` for every test, containing before/after PNG screencast frames and NDJSON action events. The zip is attached to the Playwright HTML report and opens in `npx playwright show-trace <path>`.

Adds two new exports: `TraceRecorder` and `TracingPluginClient` for callers that want to manage tracing manually.

Existing MP4 recording via `startRecording` / `stopRecording` is unchanged — the trace is an additional artifact, not a replacement.
