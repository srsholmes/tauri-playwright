---
"@srsholmes/tauri-playwright": patch
---

Harden plugin internals from PR #1 review suggestions: use serde_json for script ID injection, validate pw_result success path with serde_json::Value, and add retry/backoff for window readiness during app startup.
