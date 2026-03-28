import { Buffer } from 'node:buffer';
import { PluginClient, type PluginResponse } from './socket-client.js';

/**
 * A Playwright-like Page API backed by the tauri-plugin-playwright socket bridge.
 * Commands are sent to the plugin, which injects JS into the real Tauri webview.
 */
export type TimeoutOption = { timeout?: number };

export class TauriPage {
  private _defaultTimeout = 5000;

  constructor(private client: PluginClient) {}

  /** Set the default timeout for all auto-waiting operations (ms). */
  setDefaultTimeout(timeout: number): void {
    this._defaultTimeout = timeout;
  }

  private _t(options?: TimeoutOption): number {
    return options?.timeout ?? this._defaultTimeout;
  }

  // ── Evaluation ──────────────────────────────────────────────────────────

  /** Execute arbitrary JavaScript in the webview and return the result. */
  async evaluate<T = unknown>(script: string): Promise<T> {
    const resp = await this.command('eval', { script });
    return resp.data as T;
  }

  // ── Interactions ────────────────────────────────────────────────────────

  /** Click an element matching the CSS selector. Auto-waits. */
  async click(selector: string, options?: TimeoutOption): Promise<void> {
    await this.command('click', { selector, timeout_ms: this._t(options) });
  }

  /** Double-click an element. Auto-waits. */
  async dblclick(selector: string, options?: TimeoutOption): Promise<void> {
    await this.command('dblclick', { selector, timeout_ms: this._t(options) });
  }

  /** Hover over an element. Auto-waits. */
  async hover(selector: string, options?: TimeoutOption): Promise<void> {
    await this.command('hover', { selector, timeout_ms: this._t(options) });
  }

  /** Clear and fill an input element with text. Auto-waits. */
  async fill(selector: string, text: string, options?: TimeoutOption): Promise<void> {
    await this.command('fill', { selector, text, timeout_ms: this._t(options) });
  }

  /** Type text character by character into an element. Auto-waits. */
  async type(selector: string, text: string, options?: TimeoutOption): Promise<void> {
    await this.command('type_text', { selector, text, timeout_ms: this._t(options) });
  }

  /** Press a key on an element (e.g., 'Enter', 'Tab', 'Escape'). Auto-waits. */
  async press(selector: string, key: string, options?: TimeoutOption): Promise<void> {
    await this.command('press', { selector, key, timeout_ms: this._t(options) });
  }

  /** Check a checkbox or radio button. Auto-waits. */
  async check(selector: string, options?: TimeoutOption): Promise<void> {
    await this.command('check', { selector, timeout_ms: this._t(options) });
  }

  /** Uncheck a checkbox. Auto-waits. */
  async uncheck(selector: string, options?: TimeoutOption): Promise<void> {
    await this.command('uncheck', { selector, timeout_ms: this._t(options) });
  }

  /** Select an option from a <select> element by value. Auto-waits. */
  async selectOption(selector: string, value: string, options?: TimeoutOption): Promise<string> {
    const resp = await this.command('select_option', { selector, value, timeout_ms: this._t(options) });
    return resp.data as string;
  }

  /** Focus an element. Auto-waits. */
  async focus(selector: string, options?: TimeoutOption): Promise<void> {
    await this.command('focus', { selector, timeout_ms: this._t(options) });
  }

  /** Blur (unfocus) an element. Auto-waits. */
  async blur(selector: string, options?: TimeoutOption): Promise<void> {
    await this.command('blur', { selector, timeout_ms: this._t(options) });
  }

  // ── Queries ─────────────────────────────────────────────────────────────

  /** Get the text content of an element. Auto-waits for element. */
  async textContent(selector: string, options?: TimeoutOption): Promise<string | null> {
    const resp = await this.command('text_content', { selector, timeout_ms: this._t(options) });
    return resp.data as string | null;
  }

  /** Get the innerHTML of an element. Auto-waits for element. */
  async innerHTML(selector: string, options?: TimeoutOption): Promise<string> {
    const resp = await this.command('inner_html', { selector, timeout_ms: this._t(options) });
    return resp.data as string;
  }

  /** Get the innerText of an element (visible text only). Auto-waits for element. */
  async innerText(selector: string, options?: TimeoutOption): Promise<string> {
    const resp = await this.command('inner_text', { selector, timeout_ms: this._t(options) });
    return resp.data as string;
  }

  /** Get textContent of all elements matching a selector. No wait (works on zero matches). */
  async allTextContents(selector: string): Promise<string[]> {
    const resp = await this.command('all_text_contents', { selector });
    return resp.data as string[];
  }

  /** Get innerText of all elements matching a selector. No wait (works on zero matches). */
  async allInnerTexts(selector: string): Promise<string[]> {
    const resp = await this.command('all_inner_texts', { selector });
    return resp.data as string[];
  }

  /** Get an attribute value from an element. Auto-waits for element. */
  async getAttribute(selector: string, name: string, options?: TimeoutOption): Promise<string | null> {
    const resp = await this.command('get_attribute', { selector, name, timeout_ms: this._t(options) });
    return resp.data as string | null;
  }

  /** Get the input value of a form element. Auto-waits for element. */
  async inputValue(selector: string, options?: TimeoutOption): Promise<string> {
    const resp = await this.command('input_value', { selector, timeout_ms: this._t(options) });
    return (resp.data as string) ?? '';
  }

  /** Get the bounding box of an element. Auto-waits for element. */
  async boundingBox(
    selector: string,
    options?: TimeoutOption,
  ): Promise<{ x: number; y: number; width: number; height: number } | null> {
    const resp = await this.command('bounding_box', { selector, timeout_ms: this._t(options) });
    return resp.data as { x: number; y: number; width: number; height: number } | null;
  }

  // ── State checks ────────────────────────────────────────────────────────

  /** Check if an element matching the selector is visible. */
  async isVisible(selector: string): Promise<boolean> {
    const resp = await this.command('is_visible', { selector });
    return resp.data as boolean;
  }

  /** Check if an element is checked (checkbox/radio). */
  async isChecked(selector: string): Promise<boolean> {
    const resp = await this.command('is_checked', { selector });
    return resp.data as boolean;
  }

  /** Check if an element is disabled. */
  async isDisabled(selector: string): Promise<boolean> {
    const resp = await this.command('is_disabled', { selector });
    return resp.data as boolean;
  }

  /** Check if an element is editable. */
  async isEditable(selector: string): Promise<boolean> {
    const resp = await this.command('is_editable', { selector });
    return resp.data as boolean;
  }

  /** Check if an element is hidden. */
  async isHidden(selector: string): Promise<boolean> {
    return !(await this.isVisible(selector));
  }

  /** Check if an element is enabled. */
  async isEnabled(selector: string): Promise<boolean> {
    return !(await this.isDisabled(selector));
  }

  // ── Waiting ─────────────────────────────────────────────────────────────

  /** Wait for an element matching the selector to become visible. */
  async waitForSelector(selector: string, timeout = 5000): Promise<void> {
    await this.command('wait_for_selector', { selector, timeout_ms: timeout });
  }

  /** Wait for a JS expression to return truthy. */
  async waitForFunction(expression: string, timeout = 5000): Promise<void> {
    await this.command('wait_for_function', { expression, timeout_ms: timeout });
  }

  // ── Counting ────────────────────────────────────────────────────────────

  /** Count elements matching a selector. */
  async count(selector: string): Promise<number> {
    const resp = await this.command('count', { selector });
    return resp.data as number;
  }

  // ── Page info ───────────────────────────────────────────────────────────

  /** Get the page title. */
  async title(): Promise<string> {
    const resp = await this.command('title', {});
    return resp.data as string;
  }

  /** Get the current URL. */
  async url(): Promise<string> {
    const resp = await this.command('url', {});
    return resp.data as string;
  }

  /** Get the full page HTML. */
  async content(): Promise<string> {
    const resp = await this.command('content', {});
    return resp.data as string;
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  /** Navigate to a URL. */
  async goto(url: string): Promise<void> {
    await this.command('goto', { url });
  }

  // ── Drag and drop ───────────────────────────────────────────────────────

  /** Drag one element onto another. Auto-waits. */
  async dragAndDrop(source: string, target: string, options?: TimeoutOption): Promise<void> {
    await this.command('drag_and_drop', { source, target, timeout_ms: this._t(options) });
  }

  // ── File upload ─────────────────────────────────────────────────────────

  /** Set files on a file input element. */
  async setInputFiles(
    selector: string,
    files: Array<{ name: string; mimeType: string; buffer: Buffer }>,
    options?: TimeoutOption,
  ): Promise<number> {
    const payload = files.map((f) => ({
      name: f.name,
      mime_type: f.mimeType,
      base64: f.buffer.toString('base64'),
    }));
    const resp = await this.command('set_input_files', { selector, files: payload, timeout_ms: this._t(options) });
    return resp.data as number;
  }

  // ── Dialog handling ─────────────────────────────────────────────────────

  /** Install dialog interception (alert/confirm/prompt). */
  async installDialogHandler(options?: {
    defaultConfirm?: boolean;
    defaultPromptText?: string;
  }): Promise<void> {
    await this.command('install_dialog_handler', {
      default_confirm: options?.defaultConfirm ?? true,
      default_prompt_text: options?.defaultPromptText,
    });
  }

  /** Get captured dialogs since last check. */
  async getDialogs(): Promise<
    Array<{ type: 'alert' | 'confirm' | 'prompt'; message: string; default?: string }>
  > {
    const resp = await this.command('get_dialogs', {});
    return (resp.data ?? []) as Array<{
      type: 'alert' | 'confirm' | 'prompt';
      message: string;
      default?: string;
    }>;
  }

  /** Clear captured dialogs. */
  async clearDialogs(): Promise<void> {
    await this.command('clear_dialogs', {});
  }

  // ── Network mocking ─────────────────────────────────────────────────────

  /** Add a network route that intercepts matching fetch/XHR requests. */
  async route(
    pattern: string,
    response: { status?: number; body?: string; contentType?: string },
  ): Promise<void> {
    await this.command('add_network_route', {
      pattern,
      status: response.status ?? 200,
      body: response.body ?? '',
      content_type: response.contentType,
    });
  }

  /** Remove a network route. */
  async unroute(pattern: string): Promise<void> {
    await this.command('remove_network_route', { pattern });
  }

  /** Clear all network routes. */
  async clearRoutes(): Promise<void> {
    await this.command('clear_network_routes', {});
  }

  /** Get captured network requests. */
  async getNetworkRequests(): Promise<
    Array<{ url: string; method: string; timestamp: number }>
  > {
    const resp = await this.command('get_network_requests', {});
    return (resp.data ?? []) as Array<{ url: string; method: string; timestamp: number }>;
  }

  /** Clear captured network requests. */
  async clearNetworkRequests(): Promise<void> {
    await this.command('clear_network_requests', {});
  }

  // ── Capture ─────────────────────────────────────────────────────────────

  /** Take a native screenshot of the Tauri window. Returns PNG buffer. */
  async screenshot(options?: { path?: string }): Promise<Buffer> {
    const resp = await this.command('native_screenshot', {
      path: options?.path,
    });
    const data = resp.data as Record<string, unknown>;
    if (options?.path) {
      return Buffer.alloc(0);
    }
    return Buffer.from(data.base64 as string, 'base64');
  }

  /** Start recording the Tauri window as video (native frame capture). */
  async startRecording(options?: {
    path?: string;
    fps?: number;
  }): Promise<{ dir: string; fps: number }> {
    const dir = options?.path ?? `/tmp/tauri-playwright-recording-${Date.now()}`;
    const resp = await this.command('start_recording', {
      path: dir,
      fps: options?.fps ?? 10,
    });
    return resp.data as { dir: string; fps: number };
  }

  /** Stop recording and return the video path (if ffmpeg is available). */
  async stopRecording(): Promise<{
    dir: string;
    frame_count: number;
    fps: number;
    video: string | null;
  }> {
    const resp = await this.command('stop_recording', {});
    return resp.data as {
      dir: string;
      frame_count: number;
      fps: number;
      video: string | null;
    };
  }

  // ── Locator ─────────────────────────────────────────────────────────────

  /** Create a locator for chained operations. */
  locator(selector: string): TauriLocator {
    return new TauriLocator(this, selector);
  }

  /** Send a command to the plugin and handle errors. */
  private async command(type: string, params: Record<string, unknown>): Promise<PluginResponse> {
    const resp = await this.client.send({ type, ...params });
    if (!resp.ok) {
      throw new Error(`TauriPage command '${type}' failed: ${resp.error}`);
    }
    return resp;
  }
}

/**
 * A Playwright-like Locator for chained element interactions.
 */
export class TauriLocator {
  constructor(
    private page: TauriPage,
    private selector: string,
  ) {}

  async click(): Promise<void> {
    return this.page.click(this.selector);
  }

  async dblclick(): Promise<void> {
    return this.page.dblclick(this.selector);
  }

  async hover(): Promise<void> {
    return this.page.hover(this.selector);
  }

  async fill(text: string): Promise<void> {
    return this.page.fill(this.selector, text);
  }

  async press(key: string): Promise<void> {
    return this.page.press(this.selector, key);
  }

  async check(): Promise<void> {
    return this.page.check(this.selector);
  }

  async uncheck(): Promise<void> {
    return this.page.uncheck(this.selector);
  }

  async selectOption(value: string): Promise<string> {
    return this.page.selectOption(this.selector, value);
  }

  async focus(): Promise<void> {
    return this.page.focus(this.selector);
  }

  async blur(): Promise<void> {
    return this.page.blur(this.selector);
  }

  async textContent(): Promise<string | null> {
    return this.page.textContent(this.selector);
  }

  async innerHTML(): Promise<string> {
    return this.page.innerHTML(this.selector);
  }

  async innerText(): Promise<string> {
    return this.page.innerText(this.selector);
  }

  async getAttribute(name: string): Promise<string | null> {
    return this.page.getAttribute(this.selector, name);
  }

  async inputValue(): Promise<string> {
    return this.page.inputValue(this.selector);
  }

  async boundingBox(): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null> {
    return this.page.boundingBox(this.selector);
  }

  async isVisible(): Promise<boolean> {
    return this.page.isVisible(this.selector);
  }

  async isHidden(): Promise<boolean> {
    return this.page.isHidden(this.selector);
  }

  async isChecked(): Promise<boolean> {
    return this.page.isChecked(this.selector);
  }

  async isDisabled(): Promise<boolean> {
    return this.page.isDisabled(this.selector);
  }

  async isEditable(): Promise<boolean> {
    return this.page.isEditable(this.selector);
  }

  async isEnabled(): Promise<boolean> {
    return this.page.isEnabled(this.selector);
  }

  async waitFor(timeout = 5000): Promise<void> {
    return this.page.waitForSelector(this.selector, timeout);
  }

  async count(): Promise<number> {
    return this.page.count(this.selector);
  }
}
