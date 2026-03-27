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

    /// Click an element by CSS selector
    Click {
        selector: String,
    },

    /// Fill an input element with text (clears first)
    Fill {
        selector: String,
        text: String,
    },

    /// Type text character by character (does not clear)
    TypeText {
        selector: String,
        text: String,
    },

    /// Press a key on an element
    Press {
        selector: String,
        key: String,
    },

    /// Get text content of an element
    TextContent {
        selector: String,
    },

    /// Get an attribute value from an element
    GetAttribute {
        selector: String,
        name: String,
    },

    /// Get the input value of a form element
    InputValue {
        selector: String,
    },

    /// Check if an element is visible
    IsVisible {
        selector: String,
    },

    /// Wait for a selector to appear in the DOM
    WaitForSelector {
        selector: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    /// Count elements matching a selector
    Count {
        selector: String,
    },

    /// Get the page title
    Title,

    /// Get the current URL
    Url,

    /// Navigate to a URL
    Goto {
        url: String,
    },

    /// Get innerHTML of an element
    InnerHtml { selector: String },

    /// Get innerText of an element (visible text only)
    InnerText { selector: String },

    /// Get textContent of all matching elements
    AllTextContents { selector: String },

    /// Get innerText of all matching elements
    AllInnerTexts { selector: String },

    /// Check if an element is checked (checkbox/radio)
    IsChecked { selector: String },

    /// Check if an element is disabled
    IsDisabled { selector: String },

    /// Check if an element is editable
    IsEditable { selector: String },

    /// Get the bounding box of an element
    BoundingBox { selector: String },

    /// Hover over an element
    Hover { selector: String },

    /// Double-click an element
    Dblclick { selector: String },

    /// Check a checkbox or radio
    Check { selector: String },

    /// Uncheck a checkbox
    Uncheck { selector: String },

    /// Select an option from a <select> element
    SelectOption { selector: String, value: String },

    /// Focus an element
    Focus { selector: String },

    /// Blur (unfocus) an element
    Blur { selector: String },

    /// Wait for a JS expression to return truthy
    WaitForFunction {
        expression: String,
        #[serde(default = "default_timeout")]
        timeout_ms: u64,
    },

    /// Get the full page HTML
    Content,

    /// Drag one element onto another
    DragAndDrop {
        source: String,
        target: String,
    },

    /// Set files on a file input element (base64-encoded file contents)
    SetInputFiles {
        selector: String,
        files: Vec<FilePayload>,
    },

    /// Install dialog handlers (alert/confirm/prompt interception)
    InstallDialogHandler {
        #[serde(default)]
        default_confirm: bool,
        #[serde(default)]
        default_prompt_text: Option<String>,
    },

    /// Get captured dialogs since last check
    GetDialogs,

    /// Clear captured dialogs
    ClearDialogs,

    /// Add a network route (intercept fetch/XHR matching a URL pattern)
    AddNetworkRoute {
        pattern: String,
        status: u16,
        body: String,
        #[serde(default)]
        content_type: Option<String>,
    },

    /// Remove a network route
    RemoveNetworkRoute {
        pattern: String,
    },

    /// Clear all network routes
    ClearNetworkRoutes,

    /// Get captured network requests
    GetNetworkRequests,

    /// Clear captured network requests
    ClearNetworkRequests,

    /// Take a screenshot of the webview (returned as base64 PNG)
    Screenshot {
        /// Optional: save to this file path instead of returning base64
        #[serde(default)]
        path: Option<String>,
    },

    /// Native screenshot via platform APIs (CoreGraphics on macOS).
    /// Captures the actual window pixels including native chrome.
    NativeScreenshot {
        /// Optional: save to this file path instead of returning base64
        #[serde(default)]
        path: Option<String>,
    },

    /// Start recording the window as a video (native frame capture).
    StartRecording {
        /// Directory to store frames (created if needed).
        path: String,
        /// Frames per second (default: 10).
        #[serde(default = "default_fps")]
        fps: u32,
    },

    /// Stop recording and optionally stitch into a video file.
    StopRecording,
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

fn default_timeout() -> u64 {
    5000
}
