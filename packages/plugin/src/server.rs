use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::{oneshot, Mutex};
use tauri::{AppHandle, Runtime};

use crate::commands::{Command, Response};

static COUNTER: AtomicU64 = AtomicU64::new(0);

pub type PendingResults = Arc<Mutex<HashMap<String, oneshot::Sender<String>>>>;
pub const CALLBACK_PORT: u16 = 6275;

/// Queue of JS commands waiting to be picked up by the polling webview.
type CommandQueue = Arc<Mutex<VecDeque<QueuedCommand>>>;

struct QueuedCommand {
    id: String,
    script: String,
}

pub fn start<R: Runtime>(
    app: AppHandle<R>,
    pending: PendingResults,
    socket_path: Option<String>,
    tcp_port: Option<u16>,
) {
    let app = Arc::new(app);
    let queue: CommandQueue = Arc::new(Mutex::new(VecDeque::new()));

    // Start HTTP server (handles both polling and result callbacks)
    let pending_http = Arc::clone(&pending);
    let queue_http = Arc::clone(&queue);
    tauri::async_runtime::spawn(async move {
        if let Err(e) = run_http_server(pending_http, queue_http).await {
            eprintln!("tauri-plugin-playwright: http server error: {}", e);
        }
    });

    #[cfg(unix)]
    if let Some(path) = socket_path {
        let app = Arc::clone(&app);
        let pending = Arc::clone(&pending);
        let queue = Arc::clone(&queue);
        tauri::async_runtime::spawn(async move {
            if let Err(e) = run_unix_server(app, pending, queue, &path).await {
                eprintln!("tauri-plugin-playwright: unix server error: {}", e);
            }
        });
        return;
    }

    let port = tcp_port.unwrap_or(6274);
    let pending = Arc::clone(&pending);
    let queue = Arc::clone(&queue);
    tauri::async_runtime::spawn(async move {
        if let Err(e) = run_tcp_server(app, pending, queue, port).await {
            eprintln!("tauri-plugin-playwright: tcp server error: {}", e);
        }
    });
}

/// HTTP server that handles:
/// - GET /pw-poll — returns next queued JS command (or 204 if empty)
/// - POST /pw — receives JS execution results
async fn run_http_server(
    pending: PendingResults,
    queue: CommandQueue,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", CALLBACK_PORT)).await?;
    eprintln!("tauri-plugin-playwright: http server on http://127.0.0.1:{}", CALLBACK_PORT);

    loop {
        let (mut stream, _) = listener.accept().await?;
        let pending = Arc::clone(&pending);
        let queue = Arc::clone(&queue);

        tauri::async_runtime::spawn(async move {
            let mut buf = vec![0u8; 65536];
            let n = match tokio::io::AsyncReadExt::read(&mut stream, &mut buf).await {
                Ok(n) if n > 0 => n,
                _ => return,
            };
            let request = String::from_utf8_lossy(&buf[..n]).to_string();

            // Parse method and path from first line
            let first_line = request.lines().next().unwrap_or("");

            if first_line.starts_with("GET /pw-poll") {
                // Return next queued command
                let mut q = queue.lock().await;
                if let Some(cmd) = q.pop_front() {
                    let json = serde_json::json!({ "id": cmd.id, "script": cmd.script });
                    let body = serde_json::to_string(&json).unwrap();
                    let resp = format!(
                        "HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}",
                        body.len(), body
                    );
                    let _ = AsyncWriteExt::write_all(&mut stream, resp.as_bytes()).await;
                } else {
                    let resp = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 0\r\n\r\n";
                    let _ = AsyncWriteExt::write_all(&mut stream, resp.as_bytes()).await;
                }
            } else if first_line.starts_with("POST /pw") {
                // Receive result from JS
                if let Some(body_start) = request.find("\r\n\r\n") {
                    let body = &request[body_start + 4..];
                    if let Ok(v) = serde_json::from_str::<serde_json::Value>(body) {
                        let id = v.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                        let result = v.get("result").and_then(|v| v.as_str()).unwrap_or("").to_string();
                        if !id.is_empty() {
                            let mut map = pending.lock().await;
                            if let Some(tx) = map.remove(&id) {
                                let _ = tx.send(result);
                            }
                        }
                    }
                }
                let resp = "HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 2\r\n\r\nok";
                let _ = AsyncWriteExt::write_all(&mut stream, resp.as_bytes()).await;
            } else if first_line.starts_with("OPTIONS") {
                // CORS preflight
                let resp = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nContent-Length: 0\r\n\r\n";
                let _ = AsyncWriteExt::write_all(&mut stream, resp.as_bytes()).await;
            } else {
                let resp = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
                let _ = AsyncWriteExt::write_all(&mut stream, resp.as_bytes()).await;
            }
        });
    }
}

#[cfg(unix)]
async fn run_unix_server<R: Runtime>(
    app: Arc<AppHandle<R>>,
    pending: PendingResults,
    queue: CommandQueue,
    path: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let _ = std::fs::remove_file(path);
    let listener = tokio::net::UnixListener::bind(path)?;
    eprintln!("tauri-plugin-playwright: listening on unix:{}", path);

    loop {
        let (stream, _) = listener.accept().await?;
        let app = Arc::clone(&app);
        let pending = Arc::clone(&pending);
        let queue = Arc::clone(&queue);
        tauri::async_runtime::spawn(async move {
            let (reader, writer) = stream.into_split();
            handle_connection(app, pending, queue, reader, writer).await;
        });
    }
}

async fn run_tcp_server<R: Runtime>(
    app: Arc<AppHandle<R>>,
    pending: PendingResults,
    queue: CommandQueue,
    port: u16,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port)).await?;
    eprintln!("tauri-plugin-playwright: listening on tcp://127.0.0.1:{}", port);

    loop {
        let (stream, _) = listener.accept().await?;
        let app = Arc::clone(&app);
        let pending = Arc::clone(&pending);
        let queue = Arc::clone(&queue);
        tauri::async_runtime::spawn(async move {
            let (reader, writer) = stream.into_split();
            handle_connection(app, pending, queue, reader, writer).await;
        });
    }
}

async fn handle_connection<R: Runtime, Reader, Writer>(
    _app: Arc<AppHandle<R>>,
    pending: PendingResults,
    queue: CommandQueue,
    reader: Reader,
    mut writer: Writer,
) where
    Reader: tokio::io::AsyncRead + Unpin,
    Writer: tokio::io::AsyncWrite + Unpin,
{
    let mut lines = BufReader::new(reader).lines();

    while let Ok(Some(line)) = lines.next_line().await {
        let line = line.trim().to_string();
        if line.is_empty() { continue; }

        let response = match serde_json::from_str::<Command>(&line) {
            Ok(cmd) => execute_command(&pending, &queue, cmd).await,
            Err(e) => Response::err(format!("invalid command: {}", e)),
        };

        let mut json = serde_json::to_string(&response).unwrap_or_else(|_| {
            r#"{"ok":false,"error":"serialize error"}"#.to_string()
        });
        json.push('\n');

        if writer.write_all(json.as_bytes()).await.is_err() { break; }
        if writer.flush().await.is_err() { break; }
    }
}

fn json_str(s: &str) -> String {
    serde_json::to_string(s).unwrap()
}

async fn execute_command(
    pending: &PendingResults,
    queue: &CommandQueue,
    cmd: Command,
) -> Response {
    match cmd {
        Command::Ping => Response::ok(serde_json::json!("pong")),
        Command::Eval { script } => eval_js(pending, queue, &script).await,
        Command::Click { selector } => {
            let s = json_str(&selector);
            eval_js(pending, queue, &format!(
                r#"(function(){{ var el=document.querySelector({s}); if(!el) throw new Error('not found: '+{s}); el.scrollIntoView({{block:'center'}}); el.click(); return null; }})()"#, s=s
            )).await
        }
        Command::Fill { selector, text } => {
            let s = json_str(&selector);
            let t = json_str(&text);
            eval_js(pending, queue, &format!(
                r#"(function(){{ var el=document.querySelector({s}); if(!el) throw new Error('not found: '+{s}); el.focus(); var desc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value'); if(desc&&desc.set) desc.set.call(el,{t}); else el.value={t}; el.dispatchEvent(new Event('input',{{bubbles:true}})); el.dispatchEvent(new Event('change',{{bubbles:true}})); return null; }})()"#, s=s, t=t
            )).await
        }
        Command::TypeText { selector, text } => {
            let s = json_str(&selector);
            let t = json_str(&text);
            eval_js(pending, queue, &format!(
                r#"(function(){{ var el=document.querySelector({s}); if(!el) throw new Error('not found: '+{s}); el.focus(); for(var i=0;i<{t}.length;i++){{ var ch={t}[i]; el.dispatchEvent(new KeyboardEvent('keydown',{{key:ch,bubbles:true}})); var desc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value'); if(desc&&desc.set) desc.set.call(el,el.value+ch); else el.value+=ch; el.dispatchEvent(new Event('input',{{bubbles:true}})); el.dispatchEvent(new KeyboardEvent('keyup',{{key:ch,bubbles:true}})); }} return null; }})()"#, s=s, t=t
            )).await
        }
        Command::Press { selector, key } => {
            let s = json_str(&selector);
            let k = json_str(&key);
            eval_js(pending, queue, &format!(
                r#"(function(){{ var el=document.querySelector({s}); if(!el) throw new Error('not found: '+{s}); el.focus(); var o={{key:{k},bubbles:true}}; el.dispatchEvent(new KeyboardEvent('keydown',o)); el.dispatchEvent(new KeyboardEvent('keypress',o)); el.dispatchEvent(new KeyboardEvent('keyup',o)); return null; }})()"#, s=s, k=k
            )).await
        }
        Command::TextContent { selector } => {
            let s = json_str(&selector);
            eval_js(pending, queue, &format!(
                r#"(function(){{ var el=document.querySelector({s}); if(!el) throw new Error('not found: '+{s}); return el.textContent; }})()"#, s=s
            )).await
        }
        Command::GetAttribute { selector, name } => {
            let s = json_str(&selector);
            let n = json_str(&name);
            eval_js(pending, queue, &format!(
                r#"(function(){{ var el=document.querySelector({s}); if(!el) throw new Error('not found: '+{s}); return el.getAttribute({n}); }})()"#, s=s, n=n
            )).await
        }
        Command::InputValue { selector } => {
            let s = json_str(&selector);
            eval_js(pending, queue, &format!(
                r#"(function(){{ var el=document.querySelector({s}); if(!el) throw new Error('not found: '+{s}); return el.value||''; }})()"#, s=s
            )).await
        }
        Command::IsVisible { selector } => {
            let s = json_str(&selector);
            eval_js(pending, queue, &format!(
                r#"(function(){{ var el=document.querySelector({s}); if(!el) return false; var r=el.getBoundingClientRect(); var st=getComputedStyle(el); return r.width>0&&r.height>0&&st.visibility!=='hidden'&&st.display!=='none'&&parseFloat(st.opacity)>0; }})()"#, s=s
            )).await
        }
        Command::WaitForSelector { selector, timeout_ms } => {
            let s = json_str(&selector);
            eval_js(pending, queue, &format!(
                r#"(async function(){{ var dl=Date.now()+{t}; while(Date.now()<dl){{ var el=document.querySelector({s}); if(el){{ var r=el.getBoundingClientRect(); var st=getComputedStyle(el); if(r.width>0&&r.height>0&&st.visibility!=='hidden'&&st.display!=='none') return true; }} await new Promise(function(r){{setTimeout(r,50)}}); }} throw new Error('timeout waiting for '+{s}); }})()"#,
                s=s, t=timeout_ms
            )).await
        }
        Command::Count { selector } => {
            let s = json_str(&selector);
            eval_js(pending, queue, &format!(r#"document.querySelectorAll({s}).length"#, s=s)).await
        }
        Command::Title => eval_js(pending, queue, "document.title").await,
        Command::Url => eval_js(pending, queue, "window.location.href").await,
        Command::Goto { url } => {
            let u = json_str(&url);
            eval_js(pending, queue, &format!(r#"(function(){{ window.location.href={u}; return null; }})()"#, u=u)).await
        }
        Command::Screenshot { path } => {
            take_screenshot(pending, queue, path).await
        }
        Command::NativeScreenshot { path } => {
            take_native_screenshot(path).await
        }
    }
}

/// Queue a JS script for execution by the polling webview, then wait for the result.
async fn eval_js(
    pending: &PendingResults,
    queue: &CommandQueue,
    script: &str,
) -> Response {
    let id = format!("pw{}", COUNTER.fetch_add(1, Ordering::SeqCst));

    let (tx, rx) = oneshot::channel::<String>();
    pending.lock().await.insert(id.clone(), tx);

    // Queue the command for the polling JS to pick up
    queue.lock().await.push_back(QueuedCommand {
        id: id.clone(),
        script: script.to_string(),
    });

    // Wait for the JS to execute and POST the result back
    match tokio::time::timeout(std::time::Duration::from_secs(30), rx).await {
        Ok(Ok(result_json)) => {
            match serde_json::from_str::<serde_json::Value>(&result_json) {
                Ok(v) => {
                    if v.get("ok").and_then(|v| v.as_bool()) == Some(true) {
                        Response::ok(v.get("v").cloned())
                    } else {
                        let msg = v.get("e").and_then(|v| v.as_str()).unwrap_or("unknown JS error").to_string();
                        Response::err(msg)
                    }
                }
                Err(e) => Response::err(format!("parse error: {}", e)),
            }
        }
        Ok(Err(_)) => Response::err("channel dropped".to_string()),
        Err(_) => {
            pending.lock().await.remove(&id);
            Response::err("timeout (30s)".to_string())
        }
    }
}

/// Take a screenshot by loading html2canvas in the webview and rendering to PNG.
async fn take_screenshot(
    pending: &PendingResults,
    queue: &CommandQueue,
    path: Option<String>,
) -> Response {
    // Capture screenshot using SVG foreignObject → Canvas → data URL.
    // This is a pure inline approach that works without external dependencies.
    // Limitation: won't capture images loaded from external URLs (tainted canvas).
    let script = r#"
(async function() {
  var w = document.documentElement.scrollWidth;
  var h = document.documentElement.scrollHeight;
  var clone = document.documentElement.cloneNode(true);

  // Inline all computed styles
  var styles = '';
  try {
    for (var i = 0; i < document.styleSheets.length; i++) {
      try {
        var rules = document.styleSheets[i].cssRules || document.styleSheets[i].rules;
        if (rules) {
          for (var j = 0; j < rules.length; j++) {
            styles += rules[j].cssText + '\n';
          }
        }
      } catch(e) { /* cross-origin stylesheet, skip */ }
    }
  } catch(e) {}

  var styleEl = document.createElement('style');
  styleEl.textContent = styles;
  clone.querySelector('head').appendChild(styleEl);

  // Remove scripts from clone
  clone.querySelectorAll('script').forEach(function(s) { s.remove(); });

  var html = new XMLSerializer().serializeToString(clone);

  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
    '<foreignObject width="100%" height="100%">' + html + '</foreignObject></svg>';

  var canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  var ctx = canvas.getContext('2d');

  var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  var url = URL.createObjectURL(blob);

  return new Promise(function(resolve, reject) {
    var img = new Image();
    img.onload = function() {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      try {
        resolve(canvas.toDataURL('image/png'));
      } catch(e) {
        reject(new Error('canvas tainted: ' + e.message));
      }
    };
    img.onerror = function() {
      URL.revokeObjectURL(url);
      reject(new Error('svg render failed'));
    };
    img.src = url;
  });
})()
"#;

    let result = eval_js(pending, queue, script).await;

    if !result.ok {
        return result;
    }

    // result.data is a data:image/png;base64,... string
    if let Some(serde_json::Value::String(data_url)) = &result.data {
        if let Some(base64_data) = data_url.strip_prefix("data:image/png;base64,") {
            // If a path was provided, save the file
            if let Some(ref file_path) = path {
                match base64_decode(base64_data) {
                    Ok(bytes) => {
                        if let Err(e) = tokio::fs::write(file_path, &bytes).await {
                            return Response::err(format!("write file: {}", e));
                        }
                        return Response::ok(serde_json::json!({
                            "path": file_path,
                            "size": bytes.len()
                        }));
                    }
                    Err(e) => return Response::err(format!("base64 decode: {}", e)),
                }
            }

            // Return base64 and size
            return Response::ok(serde_json::json!({
                "base64": base64_data,
                "size": base64_data.len()
            }));
        }
    }

    Response::err("unexpected screenshot result format".to_string())
}

/// Native screenshot via platform APIs (CoreGraphics on macOS).
async fn take_native_screenshot(path: Option<String>) -> Response {
    let result = tokio::task::spawn_blocking(|| {
        crate::native_capture::platform::screenshot()
    })
    .await;

    match result {
        Ok(Ok(png_bytes)) => {
            if let Some(ref file_path) = path {
                if let Err(e) = tokio::fs::write(file_path, &png_bytes).await {
                    return Response::err(format!("write file: {}", e));
                }
                Response::ok(serde_json::json!({
                    "path": file_path,
                    "size": png_bytes.len()
                }))
            } else {
                let base64 = crate::native_capture::base64_encode(&png_bytes);
                Response::ok(serde_json::json!({
                    "base64": base64,
                    "size": png_bytes.len()
                }))
            }
        }
        Ok(Err(e)) => Response::err(e),
        Err(e) => Response::err(format!("capture thread error: {}", e)),
    }
}

fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    const TABLE: [u8; 256] = {
        let mut t = [255u8; 256];
        let chars = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut i = 0;
        while i < 64 {
            t[chars[i] as usize] = i as u8;
            i += 1;
        }
        t
    };

    let bytes: Vec<u8> = input.bytes().filter(|&b| b != b'=' && b != b'\n' && b != b'\r').collect();
    let mut result = Vec::with_capacity(bytes.len() * 3 / 4);

    for chunk in bytes.chunks(4) {
        if chunk.len() < 2 { break; }
        let a = TABLE[chunk[0] as usize] as u32;
        let b = TABLE[chunk[1] as usize] as u32;
        let c = if chunk.len() > 2 { TABLE[chunk[2] as usize] as u32 } else { 0 };
        let d = if chunk.len() > 3 { TABLE[chunk[3] as usize] as u32 } else { 0 };

        if a == 255 || b == 255 { return Err("invalid base64".to_string()); }

        let n = (a << 18) | (b << 12) | (c << 6) | d;
        result.push((n >> 16) as u8);
        if chunk.len() > 2 && c != 255 { result.push((n >> 8) as u8); }
        if chunk.len() > 3 && d != 255 { result.push(n as u8); }
    }

    Ok(result)
}
