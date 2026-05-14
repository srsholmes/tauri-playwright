# @srsholmes/tauri-playwright

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
