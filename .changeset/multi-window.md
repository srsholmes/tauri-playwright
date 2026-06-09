---
'@srsholmes/tauri-playwright': minor
---

Add multi-window targeting. `TauriPage` gains an optional `defaultWindow` constructor argument plus `.window(label)`, `.listWindows()`, and `.waitForWindow(predicate, options?)`. Backward compatible with existing single-window code. Requires `tauri-plugin-playwright >= 0.3.0` for the new `list_windows` command.
