import { Buffer } from 'node:buffer';
import { PluginClient, type PluginResponse } from './socket-client.js';

/**
 * A Playwright-like Page API backed by the tauri-plugin-playwright socket bridge.
 * Commands are sent to the plugin, which injects JS into the real Tauri webview.
 *
 * This provides the same API surface as Playwright's Page for common operations,
 * but works with WKWebView/WebView2/WebKitGTK instead of Chromium.
 */
export class TauriPage {
  constructor(private client: PluginClient) {}

  /** Execute arbitrary JavaScript in the webview and return the result. */
  async evaluate<T = unknown>(script: string): Promise<T> {
    const resp = await this.command('eval', { script });
    return resp.data as T;
  }

  /** Click an element matching the CSS selector. */
  async click(selector: string): Promise<void> {
    await this.command('click', { selector });
  }

  /** Clear and fill an input element with text. */
  async fill(selector: string, text: string): Promise<void> {
    await this.command('fill', { selector, text });
  }

  /** Type text character by character into an element. */
  async type(selector: string, text: string): Promise<void> {
    await this.command('type_text', { selector, text });
  }

  /** Press a key on an element (e.g., 'Enter', 'Tab', 'Escape'). */
  async press(selector: string, key: string): Promise<void> {
    await this.command('press', { selector, key });
  }

  /** Get the text content of an element. */
  async textContent(selector: string): Promise<string | null> {
    const resp = await this.command('text_content', { selector });
    return resp.data as string | null;
  }

  /** Get an attribute value from an element. */
  async getAttribute(selector: string, name: string): Promise<string | null> {
    const resp = await this.command('get_attribute', { selector, name });
    return resp.data as string | null;
  }

  /** Get the input value of a form element. */
  async inputValue(selector: string): Promise<string> {
    const resp = await this.command('input_value', { selector });
    return (resp.data as string) ?? '';
  }

  /** Check if an element matching the selector is visible. */
  async isVisible(selector: string): Promise<boolean> {
    const resp = await this.command('is_visible', { selector });
    return resp.data as boolean;
  }

  /** Wait for an element matching the selector to become visible. */
  async waitForSelector(selector: string, timeout = 5000): Promise<void> {
    await this.command('wait_for_selector', { selector, timeout_ms: timeout });
  }

  /** Count elements matching a selector. */
  async count(selector: string): Promise<number> {
    const resp = await this.command('count', { selector });
    return resp.data as number;
  }

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

  /** Navigate to a URL. */
  async goto(url: string): Promise<void> {
    await this.command('goto', { url });
  }

  /** Take a native screenshot of the Tauri window. Returns PNG buffer. */
  async screenshot(options?: { path?: string }): Promise<Buffer> {
    const resp = await this.command('native_screenshot', {
      path: options?.path,
    });
    const data = resp.data as Record<string, unknown>;
    if (options?.path) {
      // File was written on the Rust side; return the bytes we got back
      return Buffer.alloc(0);
    }
    return Buffer.from(data.base64 as string, 'base64');
  }

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

  async fill(text: string): Promise<void> {
    return this.page.fill(this.selector, text);
  }

  async press(key: string): Promise<void> {
    return this.page.press(this.selector, key);
  }

  async textContent(): Promise<string | null> {
    return this.page.textContent(this.selector);
  }

  async getAttribute(name: string): Promise<string | null> {
    return this.page.getAttribute(this.selector, name);
  }

  async inputValue(): Promise<string> {
    return this.page.inputValue(this.selector);
  }

  async isVisible(): Promise<boolean> {
    return this.page.isVisible(this.selector);
  }

  async waitFor(timeout = 5000): Promise<void> {
    return this.page.waitForSelector(this.selector, timeout);
  }

  async count(): Promise<number> {
    return this.page.count(this.selector);
  }
}
