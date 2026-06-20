---
'@srsholmes/tauri-playwright': patch
---

Fix macOS native screenshots to capture the requested window by label. `tauri-plugin-playwright`'s macOS `screenshot()` now resolves `window_label` to its CoreGraphics window ID (`CGWindowID`) via `NSWindow.windowNumber` and captures that exact window regardless of z-order, so a window ordered behind others (e.g. a settings or viewer window during E2E) is captured instead of the process's frontmost window. Falls back to the pid's frontmost on-screen window when the label can't be resolved (missing window, no NSWindow handle, or a non-positive window number), so callers passing a stale or empty label keep working. The Linux path already honored `window_label` and is unchanged.
