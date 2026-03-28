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

  /** Reload the page. */
  async reload(): Promise<void> {
    await this.command('reload', {});
  }

  /** Navigate back in history. */
  async goBack(): Promise<void> {
    await this.command('go_back', {});
  }

  /** Navigate forward in history. */
  async goForward(): Promise<void> {
    await this.command('go_forward', {});
  }

  /** Wait for the URL to contain or match a pattern. */
  async waitForURL(pattern: string, options?: TimeoutOption): Promise<void> {
    await this.command('wait_for_url', { pattern, timeout_ms: this._t(options) });
  }

  /** Check if an element is the active/focused element. */
  async isFocused(selector: string): Promise<boolean> {
    const resp = await this.command('is_focused', { selector });
    return resp.data as boolean;
  }

  /** Get a computed CSS style value from an element. Auto-waits. */
  async getComputedStyle(selector: string, property: string, options?: TimeoutOption): Promise<string> {
    const resp = await this.command('get_computed_style', { selector, property, timeout_ms: this._t(options) });
    return resp.data as string;
  }

  /** Dispatch a custom DOM event on an element. Auto-waits. */
  async dispatchEvent(selector: string, eventType: string, options?: TimeoutOption): Promise<void> {
    await this.command('dispatch_event', { selector, event_type: eventType, timeout_ms: this._t(options) });
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

  // ── Semantic selectors ──────────────────────────────────────────────────

  getByTestId(testId: string): TauriLocator {
    return new TauriLocator(this, `[data-testid="${testId}"]`);
  }

  getByPlaceholder(text: string, options?: { exact?: boolean }): TauriLocator {
    return new TauriLocator(this, options?.exact
      ? `[placeholder="${text}"]`
      : `[placeholder*="${text}"]`);
  }

  getByAltText(text: string, options?: { exact?: boolean }): TauriLocator {
    return new TauriLocator(this, options?.exact
      ? `[alt="${text}"]`
      : `[alt*="${text}"]`);
  }

  getByTitle(text: string, options?: { exact?: boolean }): TauriLocator {
    return new TauriLocator(this, options?.exact
      ? `[title="${text}"]`
      : `[title*="${text}"]`);
  }

  getByRole(role: string, options?: { name?: string }): TauriLocator {
    if (options?.name) {
      return new TauriLocator(this, `[role="${role}"][aria-label="${options.name}"]`);
    }
    return new TauriLocator(this, `[role="${role}"]`);
  }

  getByText(text: string, options?: { exact?: boolean }): TauriLocator {
    // CSS can't match text content, so use a data attribute approach with evaluate
    // The locator resolves via JS at execution time
    const escaped = JSON.stringify(text);
    const exact = options?.exact ?? false;
    const jsSelector = exact
      ? `[data-pw-text-exact=${escaped}]`
      : `[data-pw-text=${escaped}]`;
    // Use a special prefix to signal JS-based resolution
    return new TauriLocator(this, jsSelector, {
      jsFind: `Array.from(document.querySelectorAll('*')).find(el => {
        if (el.children.length > 0 && el.querySelector('*:not(br):not(wbr)')) {
          var direct = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('');
          if (!direct.trim()) return false;
          return ${exact} ? direct.trim() === ${escaped} : direct.includes(${escaped});
        }
        var t = el.textContent || '';
        return ${exact} ? t.trim() === ${escaped} : t.includes(${escaped});
      })`,
    });
  }

  getByLabel(text: string, options?: { exact?: boolean }): TauriLocator {
    const escaped = JSON.stringify(text);
    const exact = options?.exact ?? false;
    return new TauriLocator(this, `[data-pw-label=${escaped}]`, {
      jsFind: `(function() {
        var labels = document.querySelectorAll('label');
        for (var i = 0; i < labels.length; i++) {
          var t = labels[i].textContent || '';
          if (${exact} ? t.trim() === ${escaped} : t.includes(${escaped})) {
            var f = labels[i].getAttribute('for');
            if (f) return document.getElementById(f);
            return labels[i].querySelector('input,textarea,select');
          }
        }
        return null;
      })()`,
    });
  }

  // ── Keyboard & Mouse ────────────────────────────────────────────────────

  readonly keyboard = new TauriKeyboard(this);
  readonly mouse = new TauriMouse(this);

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
 * Supports both CSS selectors and JS-based selectors (for getByText, getByLabel).
 */
export class TauriLocator {
  private _jsFind?: string;

  constructor(
    private page: TauriPage,
    private selector: string,
    options?: { jsFind?: string },
  ) {
    this._jsFind = options?.jsFind;
  }

  /** Whether this locator uses JS-based element resolution. */
  get isJsBased(): boolean {
    return !!this._jsFind;
  }

  /**
   * Execute an action/query. For CSS selectors, delegates to TauriPage.
   * For JS-based selectors, uses evaluate with the JS find expression.
   */
  private async _eval<T>(script: string): Promise<T> {
    if (!this._jsFind) throw new Error('_eval only for JS-based locators');
    return this.page.evaluate<T>(script);
  }

  private _actionScript(actionBody: string, timeout = 5000): string {
    const find = this._jsFind!;
    return `(async function(){ var dl=Date.now()+${timeout}; while(Date.now()<dl){ var el=${find}; if(el){ var r=el.getBoundingClientRect(); var st=getComputedStyle(el); if(r.width>0&&r.height>0&&st.visibility!=='hidden'&&st.display!=='none'&&parseFloat(st.opacity)>0){ ${actionBody}; }} await new Promise(function(r){setTimeout(r,50)}); } throw new Error('timeout waiting for element'); })()`;
  }

  private _queryScript(returnExpr: string, timeout = 5000): string {
    const find = this._jsFind!;
    return `(async function(){ var dl=Date.now()+${timeout}; while(Date.now()<dl){ var el=${find}; if(el){ return ${returnExpr}; } await new Promise(function(r){setTimeout(r,50)}); } throw new Error('timeout waiting for element'); })()`;
  }

  // ── Actions ─────────────────────────────────────────────────────────

  async click(options?: TimeoutOption): Promise<void> {
    if (!this._jsFind) return this.page.click(this.selector, options);
    await this._eval(this._actionScript('el.scrollIntoView({block:"center"}); el.click(); return null'));
  }

  async dblclick(options?: TimeoutOption): Promise<void> {
    if (!this._jsFind) return this.page.dblclick(this.selector, options);
    await this._eval(this._actionScript('el.scrollIntoView({block:"center"}); el.dispatchEvent(new MouseEvent("dblclick",{bubbles:true})); return null'));
  }

  async hover(options?: TimeoutOption): Promise<void> {
    if (!this._jsFind) return this.page.hover(this.selector, options);
    await this._eval(this._actionScript('el.scrollIntoView({block:"center"}); el.dispatchEvent(new MouseEvent("mouseenter",{bubbles:true})); el.dispatchEvent(new MouseEvent("mouseover",{bubbles:true})); return null'));
  }

  async fill(text: string, options?: TimeoutOption): Promise<void> {
    if (!this._jsFind) return this.page.fill(this.selector, text, options);
    const t = JSON.stringify(text);
    await this._eval(this._actionScript(`el.focus(); var desc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value'); if(desc&&desc.set) desc.set.call(el,${t}); else el.value=${t}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return null`));
  }

  async press(key: string, options?: TimeoutOption): Promise<void> {
    if (!this._jsFind) return this.page.press(this.selector, key, options);
    const k = JSON.stringify(key);
    await this._eval(this._actionScript(`el.focus(); var o={key:${k},bubbles:true}; el.dispatchEvent(new KeyboardEvent('keydown',o)); el.dispatchEvent(new KeyboardEvent('keypress',o)); el.dispatchEvent(new KeyboardEvent('keyup',o)); return null`));
  }

  async check(options?: TimeoutOption): Promise<void> {
    if (!this._jsFind) return this.page.check(this.selector, options);
    await this._eval(this._actionScript('if(!el.checked){ el.click(); } return null'));
  }

  async uncheck(options?: TimeoutOption): Promise<void> {
    if (!this._jsFind) return this.page.uncheck(this.selector, options);
    await this._eval(this._actionScript('if(el.checked){ el.click(); } return null'));
  }

  async selectOption(value: string, options?: TimeoutOption): Promise<string> {
    if (!this._jsFind) return this.page.selectOption(this.selector, value, options);
    const v = JSON.stringify(value);
    return this._eval(this._actionScript(`el.value=${v}; el.dispatchEvent(new Event('change',{bubbles:true})); return el.value`));
  }

  async focus(options?: TimeoutOption): Promise<void> {
    if (!this._jsFind) return this.page.focus(this.selector, options);
    await this._eval(this._queryScript('(function(){ el.focus(); return null; })()'));
  }

  async blur(options?: TimeoutOption): Promise<void> {
    if (!this._jsFind) return this.page.blur(this.selector, options);
    await this._eval(this._queryScript('(function(){ el.blur(); return null; })()'));
  }

  async clear(): Promise<void> {
    return this.fill('');
  }

  /** Type text character-by-character (Playwright's replacement for deprecated type()). */
  async pressSequentially(text: string, options?: { delay?: number }): Promise<void> {
    if (!this._jsFind) {
      return this.page.type(this.selector, text);
    }
    for (const char of text) {
      await this.press(char);
      if (options?.delay) await new Promise((r) => setTimeout(r, options.delay));
    }
  }

  /** Dispatch a custom DOM event on the element. */
  async dispatchEvent(eventType: string, options?: TimeoutOption): Promise<void> {
    if (!this._jsFind) return this.page.dispatchEvent(this.selector, eventType, options);
    const e = JSON.stringify(eventType);
    await this._eval(this._actionScript(`el.dispatchEvent(new Event(${e},{bubbles:true})); return null`));
  }

  /** Run a JS function on the matched element. The function receives `el` as argument. */
  async evaluate<T = unknown>(fn: string): Promise<T> {
    if (!this._jsFind) {
      return this.page.evaluate<T>(`(function(){ var el=document.querySelector(${JSON.stringify(this.selector)}); if(!el) throw new Error('not found'); return (${fn})(el); })()`);
    }
    return this._eval(`(function(){ var el=${this._jsFind}; if(!el) throw new Error('not found'); return (${fn})(el); })()`);
  }

  /** Check if this element is the active/focused element. */
  async isFocused(): Promise<boolean> {
    if (!this._jsFind) return this.page.isFocused(this.selector);
    return this._eval(`(function(){ var el=${this._jsFind}; return el!==null&&document.activeElement===el; })()`);
  }

  async scrollIntoViewIfNeeded(): Promise<void> {
    if (!this._jsFind) {
      await this.page.evaluate(`document.querySelector(${JSON.stringify(this.selector)})?.scrollIntoView({block:'center'})`);
    } else {
      await this._eval(`(function(){ var el=${this._jsFind}; if(el) el.scrollIntoView({block:'center'}); return null; })()`);
    }
  }

  // ── Queries ─────────────────────────────────────────────────────────

  async textContent(options?: TimeoutOption): Promise<string | null> {
    if (!this._jsFind) return this.page.textContent(this.selector, options);
    return this._eval(this._queryScript('el.textContent'));
  }

  async innerHTML(options?: TimeoutOption): Promise<string> {
    if (!this._jsFind) return this.page.innerHTML(this.selector, options);
    return this._eval(this._queryScript('el.innerHTML'));
  }

  async innerText(options?: TimeoutOption): Promise<string> {
    if (!this._jsFind) return this.page.innerText(this.selector, options);
    return this._eval(this._queryScript('el.innerText'));
  }

  async getAttribute(name: string, options?: TimeoutOption): Promise<string | null> {
    if (!this._jsFind) return this.page.getAttribute(this.selector, name, options);
    return this._eval(this._queryScript(`el.getAttribute(${JSON.stringify(name)})`));
  }

  async inputValue(options?: TimeoutOption): Promise<string> {
    if (!this._jsFind) return this.page.inputValue(this.selector, options);
    return this._eval(this._queryScript("el.value||''"));
  }

  async boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null> {
    if (!this._jsFind) return this.page.boundingBox(this.selector);
    return this._eval(`(function(){ var el=${this._jsFind}; if(!el) return null; var r=el.getBoundingClientRect(); return {x:r.left,y:r.top,width:r.width,height:r.height}; })()`);
  }

  // ── State ───────────────────────────────────────────────────────────

  async isVisible(): Promise<boolean> {
    if (!this._jsFind) return this.page.isVisible(this.selector);
    return this._eval(`(function(){ var el=${this._jsFind}; if(!el) return false; var r=el.getBoundingClientRect(); var st=getComputedStyle(el); return r.width>0&&r.height>0&&st.visibility!=='hidden'&&st.display!=='none'&&parseFloat(st.opacity)>0; })()`);
  }

  async isHidden(): Promise<boolean> {
    return !(await this.isVisible());
  }

  async isChecked(): Promise<boolean> {
    if (!this._jsFind) return this.page.isChecked(this.selector);
    return this._eval(`(function(){ var el=${this._jsFind}; if(!el) return false; return !!el.checked; })()`);
  }

  async isDisabled(): Promise<boolean> {
    if (!this._jsFind) return this.page.isDisabled(this.selector);
    return this._eval(`(function(){ var el=${this._jsFind}; if(!el) return true; return el.disabled===true||el.hasAttribute('disabled'); })()`);
  }

  async isEditable(): Promise<boolean> {
    if (!this._jsFind) return this.page.isEditable(this.selector);
    return this._eval(`(function(){ var el=${this._jsFind}; if(!el) return false; if(el.disabled||el.readOnly) return false; var tag=el.tagName; return tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||el.isContentEditable; })()`);
  }

  async isEnabled(): Promise<boolean> {
    return !(await this.isDisabled());
  }

  // ── Waiting ─────────────────────────────────────────────────────────

  async waitFor(timeout = 5000): Promise<void> {
    if (!this._jsFind) return this.page.waitForSelector(this.selector, timeout);
    await this._eval(this._queryScript('true', timeout));
  }

  // ── Counting ────────────────────────────────────────────────────────

  async count(): Promise<number> {
    if (!this._jsFind) return this.page.count(this.selector);
    return this._eval(`document.querySelectorAll(${JSON.stringify(this.selector)}).length`);
  }

  // ── Refinement ──────────────────────────────────────────────────────

  nth(index: number): TauriLocator {
    return new TauriLocator(this.page, `${this.selector}:nth-match(${index})`, {
      jsFind: `document.querySelectorAll(${JSON.stringify(this.selector)})[${index}]`,
    });
  }

  first(): TauriLocator {
    return this.nth(0);
  }

  last(): TauriLocator {
    return new TauriLocator(this.page, this.selector, {
      jsFind: `(function(){ var all=document.querySelectorAll(${JSON.stringify(this.selector)}); return all[all.length-1]||null; })()`,
    });
  }

  filter(options: { hasText?: string | RegExp }): TauriLocator {
    const sel = JSON.stringify(this.selector);
    if (options.hasText) {
      const match = typeof options.hasText === 'string'
        ? `t.includes(${JSON.stringify(options.hasText)})`
        : `${options.hasText.toString()}.test(t)`;
      return new TauriLocator(this.page, this.selector, {
        jsFind: `Array.from(document.querySelectorAll(${sel})).find(function(el){ var t=el.textContent||''; return ${match}; })`,
      });
    }
    return this;
  }

  async all(): Promise<TauriLocator[]> {
    const c = await this.count();
    return Array.from({ length: c }, (_, i) => this.nth(i));
  }

  // ── Semantic selectors (scoped to this locator) ─────────────────────

  getByTestId(testId: string): TauriLocator {
    return new TauriLocator(this.page, `${this.selector} [data-testid="${testId}"]`);
  }

  getByPlaceholder(text: string, options?: { exact?: boolean }): TauriLocator {
    const attr = options?.exact ? `="${text}"` : `*="${text}"`;
    return new TauriLocator(this.page, `${this.selector} [placeholder${attr}]`);
  }

  getByText(text: string, options?: { exact?: boolean }): TauriLocator {
    return this.page.getByText(text, options);
  }

  getByRole(role: string, options?: { name?: string }): TauriLocator {
    return this.page.getByRole(role, options);
  }

  locator(selector: string): TauriLocator {
    return new TauriLocator(this.page, `${this.selector} ${selector}`);
  }
}

// ── Keyboard ────────────────────────────────────────────────────────────

export class TauriKeyboard {
  private _modifiers = new Set<string>();

  constructor(private page: TauriPage) {}

  async press(key: string): Promise<void> {
    const parts = key.split('+');
    const modifiers = parts.slice(0, -1);
    const mainKey = parts[parts.length - 1];
    for (const mod of modifiers) await this.down(mod);
    const k = JSON.stringify(mainKey);
    await this.page.evaluate(`(function(){
      var el=document.activeElement||document.body;
      var o={key:${k},bubbles:true,ctrlKey:${this._modifiers.has('Control')},shiftKey:${this._modifiers.has('Shift')},altKey:${this._modifiers.has('Alt')},metaKey:${this._modifiers.has('Meta')}};
      el.dispatchEvent(new KeyboardEvent('keydown',o));
      el.dispatchEvent(new KeyboardEvent('keypress',o));
      el.dispatchEvent(new KeyboardEvent('keyup',o));
    })()`);
    for (const mod of modifiers) await this.up(mod);
  }

  async down(key: string): Promise<void> {
    this._modifiers.add(key);
    await this.page.evaluate(`(function(){ var el=document.activeElement||document.body; el.dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(key)},bubbles:true})); })()`);
  }

  async up(key: string): Promise<void> {
    this._modifiers.delete(key);
    await this.page.evaluate(`(function(){ var el=document.activeElement||document.body; el.dispatchEvent(new KeyboardEvent('keyup',{key:${JSON.stringify(key)},bubbles:true})); })()`);
  }

  async type(text: string, options?: { delay?: number }): Promise<void> {
    for (const char of text) {
      const c = JSON.stringify(char);
      await this.page.evaluate(`(function(){
        var el=document.activeElement||document.body;
        el.dispatchEvent(new KeyboardEvent('keydown',{key:${c},bubbles:true}));
        if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'){
          var desc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
          if(desc&&desc.set) desc.set.call(el,el.value+${c}); else el.value+=${c};
          el.dispatchEvent(new Event('input',{bubbles:true}));
        }
        el.dispatchEvent(new KeyboardEvent('keyup',{key:${c},bubbles:true}));
      })()`);
      if (options?.delay) await new Promise((r) => setTimeout(r, options.delay));
    }
  }

  async insertText(text: string): Promise<void> {
    await this.page.evaluate(`document.execCommand('insertText', false, ${JSON.stringify(text)})`);
  }
}

// ── Mouse ───────────────────────────────────────────────────────────────

export class TauriMouse {
  constructor(private page: TauriPage) {}

  async click(x: number, y: number, options?: { button?: 'left' | 'right' | 'middle' }): Promise<void> {
    const btn = options?.button === 'right' ? 2 : options?.button === 'middle' ? 1 : 0;
    await this.page.evaluate(`(function(){
      var el=document.elementFromPoint(${x},${y}); if(!el) return;
      var o={bubbles:true,clientX:${x},clientY:${y},button:${btn}};
      el.dispatchEvent(new MouseEvent('mousedown',o));
      el.dispatchEvent(new MouseEvent('mouseup',o));
      el.dispatchEvent(new MouseEvent('click',o));
    })()`);
  }

  async dblclick(x: number, y: number): Promise<void> {
    await this.page.evaluate(`(function(){
      var el=document.elementFromPoint(${x},${y}); if(!el) return;
      var o={bubbles:true,clientX:${x},clientY:${y}};
      el.dispatchEvent(new MouseEvent('dblclick',o));
    })()`);
  }

  async move(x: number, y: number): Promise<void> {
    await this.page.evaluate(`(function(){
      var el=document.elementFromPoint(${x},${y})||document.body;
      el.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:${x},clientY:${y}}));
    })()`);
  }

  async down(options?: { button?: 'left' | 'right' | 'middle' }): Promise<void> {
    const btn = options?.button === 'right' ? 2 : options?.button === 'middle' ? 1 : 0;
    await this.page.evaluate(`document.activeElement?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:${btn}}))`);
  }

  async up(options?: { button?: 'left' | 'right' | 'middle' }): Promise<void> {
    const btn = options?.button === 'right' ? 2 : options?.button === 'middle' ? 1 : 0;
    await this.page.evaluate(`document.activeElement?.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:${btn}}))`);
  }

  async wheel(deltaX: number, deltaY: number): Promise<void> {
    await this.page.evaluate(`document.activeElement?.dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaX:${deltaX},deltaY:${deltaY}}))`);
  }
}
