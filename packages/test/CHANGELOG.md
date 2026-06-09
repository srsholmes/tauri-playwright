# @srsholmes/tauri-playwright

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
