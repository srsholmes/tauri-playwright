use serde::{Deserialize, Serialize};

/// A command sent from the Playwright test runner to the plugin.
/// Protocol: newline-delimited JSON over Unix socket or TCP.
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Command {
    /// Health check — verify the connection is alive
    Ping,

    /// Execute arbitrary JavaScript and return the result
    Eval { script: String },

    // ── Actions (auto-wait for visible + enabled) ─────────────────────

    Click {
        selector: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    Dblclick {
        selector: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    Hover {
        selector: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    Fill {
        selector: String,
        text: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    TypeText {
        selector: String,
        text: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    Press {
        selector: String,
        key: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    Check {
        selector: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    Uncheck {
        selector: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    SelectOption {
        selector: String,
        value: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    Focus {
        selector: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    Blur {
        selector: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    DragAndDrop {
        source: String,
        target: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    SetInputFiles {
        selector: String,
        files: Vec<FilePayload>,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    // ── Queries (auto-wait for element to exist) ──────────────────────

    TextContent {
        selector: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    InnerHtml {
        selector: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    InnerText {
        selector: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    GetAttribute {
        selector: String,
        name: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    InputValue {
        selector: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    BoundingBox {
        selector: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    // ── State checks (instant, no retry) ──────────────────────────────

    IsVisible { selector: String },
    IsChecked { selector: String },
    IsDisabled { selector: String },
    IsEditable { selector: String },

    // ── Bulk queries (no retry, work on zero matches) ─────────────────

    AllTextContents { selector: String },
    AllInnerTexts { selector: String },
    Count { selector: String },

    // ── Waiting ───────────────────────────────────────────────────────

    WaitForSelector {
        selector: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    WaitForFunction {
        expression: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    /// Dispatch a custom DOM event on an element
    DispatchEvent {
        selector: String,
        event_type: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    /// Get computed CSS style value
    GetComputedStyle {
        selector: String,
        property: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    /// Check if an element is focused
    IsFocused { selector: String },

    // ── Page info (no selector) ───────────────────────────────────────

    Title,
    Url,
    Content,
    Goto { url: String },
    Reload,
    GoBack,
    GoForward,

    /// Wait for the URL to match a pattern
    WaitForUrl {
        pattern: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    // ── Dialogs ───────────────────────────────────────────────────────

    InstallDialogHandler {
        #[serde(default)]
        default_confirm: bool,
        #[serde(default)]
        default_prompt_text: Option<String>,
    },
    GetDialogs,
    ClearDialogs,

    // ── Network mocking ───────────────────────────────────────────────

    AddNetworkRoute {
        pattern: String,
        status: u16,
        body: String,
        #[serde(default)]
        content_type: Option<String>,
    },
    RemoveNetworkRoute { pattern: String },
    ClearNetworkRoutes,
    GetNetworkRequests,
    ClearNetworkRequests,

    // ── Capture ───────────────────────────────────────────────────────

    Screenshot {
        #[serde(default)]
        path: Option<String>,
    },
    NativeScreenshot {
        #[serde(default)]
        path: Option<String>,
    },
    StartRecording {
        path: String,
        #[serde(default = "default_fps")]
        fps: u32,
    },
    StopRecording,
}

fn default_timeout() -> u64 {
    5000
}

fn default_fps() -> u32 {
    10
}

/// A file to set on a file input element.
#[derive(Debug, Deserialize)]
pub struct FilePayload {
    pub name: String,
    pub mime_type: String,
    /// Base64-encoded file content.
    pub base64: String,
}

/// Response sent back to the Playwright test runner.
#[derive(Debug, Serialize)]
pub struct Response {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl Response {
    pub fn ok(data: impl Into<Option<serde_json::Value>>) -> Self {
        Self {
            ok: true,
            data: data.into(),
            error: None,
        }
    }

    pub fn err(msg: impl Into<String>) -> Self {
        Self {
            ok: false,
            data: None,
            error: Some(msg.into()),
        }
    }
}
