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

    /// Take a screenshot of the webview (returned as base64 PNG)
    Screenshot {
        /// Optional: save to this file path instead of returning base64
        #[serde(default)]
        path: Option<String>,
    },
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
