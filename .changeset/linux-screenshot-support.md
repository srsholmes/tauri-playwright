---
'@srsholmes/tauri-playwright': minor
---

Add Linux screenshot support. The `tauri-plugin-playwright` crate now captures native screenshots on Linux via `webkit2gtk`'s `WebView::snapshot()` (in-process, no compositor/X11 dependency — works under Wayland/WSLg), with correct HiDPI handling. The macOS CoreGraphics path is unchanged, and video recording remains macOS-only (`StartRecording` is rejected on other platforms). A `Plugin Build (Linux)` CI job compiles the new `cfg(linux)` code.
