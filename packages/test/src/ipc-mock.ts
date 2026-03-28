/**
 * IPC Mock Generator for Tauri apps running in browser-only mode.
 *
 * When `withGlobalTauri: true` is set in tauri.conf.json, the app accesses
 * Tauri APIs through `window.__TAURI_INTERNALS__`. This module generates
 * a script that mocks that global so the app runs in a plain browser.
 *
 * The mock intercepts:
 * - `invoke()` calls — returns data from the mock handler map
 * - `plugin:event|listen` — stores listeners for mock event emission
 * - `plugin:event|unlisten` — no-ops
 * - `convertFileSrc()` — passthrough
 * - `transformCallback()` — creates callback IDs
 */

/**
 * Generate a JavaScript string to inject via `page.addInitScript()`.
 * This sets up `window.__TAURI_INTERNALS__` with mock implementations.
 *
 * Mock handlers are serialized as functions so they receive the actual
 * invoke args at call time. This supports dynamic responses like:
 * ```ts
 * greet: (args) => `Hello, ${args?.name}!`
 * ```
 */
export function generateIpcMockScript(
  mocks: Record<string, (args?: Record<string, unknown>) => unknown>,
): string {
  // Serialize handlers as functions that run at invoke time (dynamic mocks)
  const mockEntries = Object.entries(mocks).map(([cmd, handler]) => {
    return `    ${JSON.stringify(cmd)}: ${handler.toString()}`;
  });

  return `
(function() {
  "use strict";

  var mockHandlers = {
${mockEntries.join(',\n')}
  };

  // Track all invoke calls for test assertions
  window.__TAURI_MOCK_CALLS__ = [];

  // Track event listeners for mock event emission
  window.__TAURI_MOCK_LISTENERS__ = {};

  // Internal invoke handler
  function handleInvoke(cmd, args) {
    // Intercept event plugin commands
    if (cmd === "plugin:event|listen") {
      var event = args && args.event;
      var handler = args && args.handler;
      if (event && handler) {
        if (!window.__TAURI_MOCK_LISTENERS__[event]) {
          window.__TAURI_MOCK_LISTENERS__[event] = [];
        }
        window.__TAURI_MOCK_LISTENERS__[event].push(handler);
      }
      return Promise.resolve(Math.floor(Math.random() * 1000000));
    }
    if (cmd === "plugin:event|unlisten") {
      return Promise.resolve();
    }

    // Record the call
    window.__TAURI_MOCK_CALLS__.push({
      cmd: cmd,
      args: args || {},
      timestamp: Date.now()
    });

    // Return mock response — call the handler with args for dynamic mocks
    if (cmd in mockHandlers) {
      try {
        var response = mockHandlers[cmd](args);
        return Promise.resolve(
          response !== null && typeof response === "object"
            ? JSON.parse(JSON.stringify(response))
            : response
        );
      } catch (e) {
        console.error("[tauri-playwright] Mock handler error for", cmd, e);
        return Promise.reject(e);
      }
    }

    console.warn("[tauri-playwright] Unhandled invoke:", cmd, args);
    return Promise.resolve(null);
  }

  // Set up the mock global
  window.__TAURI_INTERNALS__ = {
    invoke: handleInvoke,
    convertFileSrc: function(path) { return path; },
    transformCallback: function(callback) {
      var id = Math.random().toString(36).slice(2);
      window["_" + id] = callback;
      return id;
    },
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { label: "main" }
    }
  };

  // Helper: emit a mock Tauri event from test code
  window.__TAURI_EMIT_MOCK_EVENT__ = function(event, payload) {
    var listeners = window.__TAURI_MOCK_LISTENERS__[event] || [];
    listeners.forEach(function(handlerId) {
      var callback = window["_" + handlerId];
      if (callback) {
        callback({ event: event, payload: payload });
      }
    });
  };

  // Helper: get all captured invoke calls (for assertions)
  window.__TAURI_GET_MOCK_CALLS__ = function() {
    return window.__TAURI_MOCK_CALLS__;
  };

  // Helper: clear captured invoke calls
  window.__TAURI_CLEAR_MOCK_CALLS__ = function() {
    window.__TAURI_MOCK_CALLS__ = [];
  };
})();
`;
}

/**
 * Type declarations for the mock globals injected into the page.
 */
declare global {
  interface Window {
    __TAURI_MOCK_CALLS__: Array<{ cmd: string; args: Record<string, unknown>; timestamp: number }>;
    __TAURI_MOCK_LISTENERS__: Record<string, string[]>;
    __TAURI_EMIT_MOCK_EVENT__: (event: string, payload: unknown) => void;
    __TAURI_GET_MOCK_CALLS__: () => Array<{
      cmd: string;
      args: Record<string, unknown>;
      timestamp: number;
    }>;
    __TAURI_CLEAR_MOCK_CALLS__: () => void;
    __TAURI_INTERNALS__: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      convertFileSrc: (path: string) => string;
      transformCallback: (callback: (response: unknown) => void) => string;
      metadata: Record<string, unknown>;
    };
  }
}
