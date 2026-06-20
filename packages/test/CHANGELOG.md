# @srsholmes/tauri-playwright

## 0.4.1

### Patch Changes

- 0f1fc4a: Fix macOS native screenshots to capture the requested window by label. `tauri-plugin-playwright`'s macOS `screenshot()` now resolves `window_label` to its CoreGraphics window ID (`CGWindowID`) via `NSWindow.windowNumber` and captures that exact window regardless of z-order, so a window ordered behind others (e.g. a settings or viewer window during E2E) is captured instead of the process's frontmost window. Falls back to the pid's frontmost on-screen window when the label can't be resolved (missing window, no NSWindow handle, or a non-positive window number), so callers passing a stale or empty label keep working. The Linux path already honored `window_label` and is unchanged.

## 0.4.0

### Minor Changes

- 268c917: Add Linux screenshot support. The `tauri-plugin-playwright` crate now captures native screenshots on Linux via `webkit2gtk`'s `WebView::snapshot()` (in-process, no compositor/X11 dependency — works under Wayland/WSLg), with correct HiDPI handling. The macOS CoreGraphics path is unchanged, and video recording remains macOS-only (`StartRecording` is rejected on other platforms). A `Plugin Build (Linux)` CI job compiles the new `cfg(linux)` code.

## 0.3.0

### Minor Changes

- 6071e31: Add multi-window targeting. `TauriPage` gains an optional `defaultWindow` constructor argument plus `.window(label)`, `.listWindows()`, and `.waitForWindow(predicate, options?)`. Backward compatible with existing single-window code. Requires `tauri-plugin-playwright >= 0.3.0` for the new `list_windows` command.

## 0.3.0

### Minor Changes

- Add multi-window targeting. `TauriPage` gains an optional `defaultWindow`
  constructor argument and three new methods:
  - `page.window(label)` — fork a new `TauriPage` scoped to a specific webview
    window (shares the same socket).
  - `page.listWindows()` — returns `WindowInfo[]` for every open webview.
  - `page.waitForWindow(predicate, options?)` — polls `listWindows()` every
    100 ms and resolves to a scoped `TauriPage` once a window matches. Throws
    on timeout (default 5000 ms).

  Backward compatible: existing single-window code keeps working unchanged.
  Requires `tauri-plugin-playwright >= 0.3.0` (older plugins will report
  `invalid command` for the `list_windows` variant).

## 0.2.2

### Patch Changes

- 3209cf2: Harden plugin internals from PR #1 review suggestions: use serde_json for script ID injection, validate pw_result success path with serde_json::Value, and add retry/backoff for window readiness during app startup.
