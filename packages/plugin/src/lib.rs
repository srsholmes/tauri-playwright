use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

mod commands;
mod native_capture;
mod server;

use server::PendingResults;

fn js_init_script() -> String {
    // The init script injects a <script> tag into the DOM.
    // The injected script uses RELATIVE URLs (/pw-poll, /pw) which go
    // through the Vite dev server proxy (same origin, no CORS/mixed-content).
    let mut js = String::new();
    js.push_str("(function() {\n");
    js.push_str("  function inject() {\n");
    js.push_str("    if (document.getElementById('__pw_script__')) return;\n");
    js.push_str("    var s = document.createElement('script');\n");
    js.push_str("    s.id = '__pw_script__';\n");
    js.push_str("    s.textContent = '");
    // Poll script using relative URLs — no port needed
    let poll_script = concat!(
        "(function() {",
        "  if (window.__PW_ACTIVE__) return;",
        "  window.__PW_ACTIVE__ = true;",
        "  async function poll() {",
        "    while (window.__PW_ACTIVE__) {",
        "      try {",
        "        var resp = await fetch(\"/pw-poll\");",
        "        if (resp.status === 200) {",
        "          var cmd = await resp.json();",
        "          if (cmd && cmd.id && cmd.script) {",
        "            try {",
        "              var fn = new Function(\"return (async function() { return (\" + cmd.script + \"); })()\");",
        "              var result = await fn();",
        "              var body = JSON.stringify({ id: cmd.id, result: JSON.stringify({ ok: true, v: result }) });",
        "              await fetch(\"/pw\", { method: \"POST\", headers: { \"Content-Type\": \"application/json\" }, body: body });",
        "            } catch(e) {",
        "              var body = JSON.stringify({ id: cmd.id, result: JSON.stringify({ ok: false, e: (e && e.message) || String(e) }) });",
        "              await fetch(\"/pw\", { method: \"POST\", headers: { \"Content-Type\": \"application/json\" }, body: body }).catch(function(){});",
        "            }",
        "          }",
        "        }",
        "      } catch(e) {}",
        "      await new Promise(function(r) { setTimeout(r, 16); });",
        "    }",
        "  }",
        "  poll();",
        "  console.log(\"[tauri-plugin-playwright] bridge active\");",
        "})();"
    );
    // Escape for JS string literal (single quotes wrapping)
    let escaped = poll_script
        .replace('\\', "\\\\")
        .replace('\'', "\\'");
    js.push_str(&escaped);
    js.push_str("';\n");
    js.push_str("    document.head.appendChild(s);\n");
    js.push_str("  }\n");
    js.push_str("  if (document.head) { inject(); }\n");
    js.push_str("  else { document.addEventListener('DOMContentLoaded', inject); }\n");
    js.push_str("  new MutationObserver(function() { if (document.head && !document.getElementById('__pw_script__')) inject(); }).observe(document, { childList: true, subtree: true });\n");
    js.push_str("})();\n");
    js
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    init_with_config(PluginConfig::default())
}

pub fn init_with_config<R: Runtime>(config: PluginConfig) -> TauriPlugin<R> {
    let pending: PendingResults = Arc::new(Mutex::new(HashMap::new()));
    let pending_for_setup = Arc::clone(&pending);

    Builder::new("playwright")
        .js_init_script(js_init_script())
        .setup(move |app, _api| {
            server::start(
                app.clone(),
                Arc::clone(&pending_for_setup),
                config.socket_path.clone(),
                config.tcp_port,
            );
            Ok(())
        })
        .build()
}

#[derive(Debug, Clone)]
pub struct PluginConfig {
    pub socket_path: Option<String>,
    pub tcp_port: Option<u16>,
}

impl Default for PluginConfig {
    fn default() -> Self {
        Self {
            socket_path: Some("/tmp/tauri-playwright.sock".to_string()),
            tcp_port: None,
        }
    }
}

impl PluginConfig {
    pub fn new() -> Self { Self::default() }
    pub fn socket_path(mut self, path: impl Into<String>) -> Self { self.socket_path = Some(path.into()); self }
    pub fn tcp_port(mut self, port: u16) -> Self { self.tcp_port = Some(port); self }
}
