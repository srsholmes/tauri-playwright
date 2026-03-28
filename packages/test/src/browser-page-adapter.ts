import { Buffer } from 'node:buffer';
import type { Page } from '@playwright/test';

/**
 * Wraps a Playwright Page to provide the same API surface as TauriPage.
 * This allows the same tests to run in both browser-only and Tauri modes.
 */
export class BrowserPageAdapter {
  constructor(private page: Page) {}

  /** Set the default timeout for all auto-waiting operations (ms). */
  setDefaultTimeout(timeout: number): void {
    this.page.setDefaultTimeout(timeout);
  }

  // ── Expose the underlying Playwright Page for direct access ─────────
  get playwrightPage(): Page {
    return this.page;
  }

  // ── Evaluation ──────────────────────────────────────────────────────
  async evaluate<T = unknown>(script: string): Promise<T> {
    return this.page.evaluate(script) as Promise<T>;
  }

  // ── Interactions ────────────────────────────────────────────────────
  async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  async dblclick(selector: string): Promise<void> {
    await this.page.dblclick(selector);
  }

  async hover(selector: string): Promise<void> {
    await this.page.hover(selector);
  }

  async fill(selector: string, text: string): Promise<void> {
    await this.page.fill(selector, text);
  }

  async type(selector: string, text: string): Promise<void> {
    await this.page.locator(selector).pressSequentially(text);
  }

  async press(selector: string, key: string): Promise<void> {
    await this.page.press(selector, key);
  }

  async check(selector: string): Promise<void> {
    await this.page.check(selector);
  }

  async uncheck(selector: string): Promise<void> {
    await this.page.uncheck(selector);
  }

  async selectOption(selector: string, value: string): Promise<string> {
    const result = await this.page.selectOption(selector, value);
    return Array.isArray(result) ? result[0] : result;
  }

  async focus(selector: string): Promise<void> {
    await this.page.focus(selector);
  }

  async blur(selector: string): Promise<void> {
    await this.page.locator(selector).blur();
  }

  // ── Queries ─────────────────────────────────────────────────────────
  async textContent(selector: string): Promise<string | null> {
    return this.page.textContent(selector);
  }

  async innerHTML(selector: string): Promise<string> {
    return this.page.innerHTML(selector);
  }

  async innerText(selector: string): Promise<string> {
    return this.page.innerText(selector);
  }

  async allTextContents(selector: string): Promise<string[]> {
    return this.page.locator(selector).allTextContents();
  }

  async allInnerTexts(selector: string): Promise<string[]> {
    return this.page.locator(selector).allInnerTexts();
  }

  async getAttribute(selector: string, name: string): Promise<string | null> {
    return this.page.getAttribute(selector, name);
  }

  async inputValue(selector: string): Promise<string> {
    return this.page.inputValue(selector);
  }

  async boundingBox(
    selector: string,
  ): Promise<{ x: number; y: number; width: number; height: number } | null> {
    return this.page.locator(selector).boundingBox();
  }

  // ── State checks ────────────────────────────────────────────────────
  async isVisible(selector: string): Promise<boolean> {
    return this.page.isVisible(selector);
  }

  async isChecked(selector: string): Promise<boolean> {
    return this.page.isChecked(selector);
  }

  async isDisabled(selector: string): Promise<boolean> {
    return this.page.isDisabled(selector);
  }

  async isEditable(selector: string): Promise<boolean> {
    return this.page.isEditable(selector);
  }

  async isHidden(selector: string): Promise<boolean> {
    return this.page.isHidden(selector);
  }

  async isEnabled(selector: string): Promise<boolean> {
    return this.page.isEnabled(selector);
  }

  // ── Waiting ─────────────────────────────────────────────────────────
  async waitForSelector(selector: string, timeout = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout });
  }

  async waitForFunction(expression: string, timeout = 5000): Promise<void> {
    await this.page.waitForFunction(expression, undefined, { timeout });
  }

  // ── Counting ────────────────────────────────────────────────────────
  async count(selector: string): Promise<number> {
    return this.page.locator(selector).count();
  }

  // ── Page info ───────────────────────────────────────────────────────
  async title(): Promise<string> {
    return this.page.title();
  }

  async url(): Promise<string> {
    return this.page.url();
  }

  async content(): Promise<string> {
    return this.page.content();
  }

  // ── Navigation ──────────────────────────────────────────────────────
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
  }

  // ── Drag and drop ───────────────────────────────────────────────────
  async dragAndDrop(source: string, target: string): Promise<void> {
    await this.page.dragAndDrop(source, target);
  }

  // ── File upload ─────────────────────────────────────────────────────
  async setInputFiles(
    selector: string,
    files: Array<{ name: string; mimeType: string; buffer: Buffer }>,
  ): Promise<number> {
    await this.page.setInputFiles(
      selector,
      files.map((f) => ({ name: f.name, mimeType: f.mimeType, buffer: f.buffer })),
    );
    return files.length;
  }

  // ── Dialog handling ─────────────────────────────────────────────────
  private dialogHandler: ((dialog: any) => Promise<void>) | null = null;
  private capturedDialogs: Array<{ type: string; message: string; default?: string }> = [];

  async installDialogHandler(options?: {
    defaultConfirm?: boolean;
    defaultPromptText?: string;
  }): Promise<void> {
    const confirm = options?.defaultConfirm ?? true;
    const promptText = options?.defaultPromptText;

    if (this.dialogHandler) {
      this.page.removeListener('dialog', this.dialogHandler);
    }

    this.dialogHandler = async (dialog: any) => {
      this.capturedDialogs.push({
        type: dialog.type(),
        message: dialog.message(),
        default: dialog.defaultValue?.() ?? '',
      });
      if (dialog.type() === 'prompt') {
        await dialog.accept(promptText ?? '');
      } else if (dialog.type() === 'confirm') {
        if (confirm) await dialog.accept();
        else await dialog.dismiss();
      } else {
        await dialog.accept();
      }
    };
    this.page.on('dialog', this.dialogHandler);
  }

  async getDialogs(): Promise<
    Array<{ type: string; message: string; default?: string }>
  > {
    return this.capturedDialogs;
  }

  async clearDialogs(): Promise<void> {
    this.capturedDialogs = [];
  }

  // ── Network mocking ─────────────────────────────────────────────────
  private capturedRequests: Array<{ url: string; method: string; timestamp: number }> = [];
  private activeRoutes: Array<{ pattern: string; handler: any }> = [];

  async route(
    pattern: string,
    response: { status?: number; body?: string; contentType?: string },
  ): Promise<void> {
    const handler = async (route: any) => {
      this.capturedRequests.push({
        url: route.request().url(),
        method: route.request().method(),
        timestamp: Date.now(),
      });
      await route.fulfill({
        status: response.status ?? 200,
        body: response.body ?? '',
        contentType: response.contentType ?? 'application/json',
      });
    };
    this.activeRoutes.push({ pattern, handler });
    await this.page.route(`**${pattern}**`, handler);
  }

  async unroute(pattern: string): Promise<void> {
    const route = this.activeRoutes.find((r) => r.pattern === pattern);
    if (route) {
      await this.page.unroute(`**${pattern}**`, route.handler);
      this.activeRoutes = this.activeRoutes.filter((r) => r.pattern !== pattern);
    }
  }

  async clearRoutes(): Promise<void> {
    for (const route of this.activeRoutes) {
      await this.page.unroute(`**${route.pattern}**`, route.handler);
    }
    this.activeRoutes = [];
  }

  async getNetworkRequests(): Promise<
    Array<{ url: string; method: string; timestamp: number }>
  > {
    return this.capturedRequests;
  }

  async clearNetworkRequests(): Promise<void> {
    this.capturedRequests = [];
  }

  // ── Semantic selectors ───────────────────────────────────────────────
  getByTestId(testId: string) {
    return this.page.getByTestId(testId);
  }

  getByPlaceholder(text: string, options?: { exact?: boolean }) {
    return this.page.getByPlaceholder(text, options);
  }

  getByAltText(text: string, options?: { exact?: boolean }) {
    return this.page.getByAltText(text, options);
  }

  getByTitle(text: string, options?: { exact?: boolean }) {
    return this.page.getByTitle(text, options);
  }

  getByRole(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) {
    return this.page.getByRole(role, options);
  }

  getByText(text: string, options?: { exact?: boolean }) {
    return this.page.getByText(text, options);
  }

  getByLabel(text: string, options?: { exact?: boolean }) {
    return this.page.getByLabel(text, options);
  }

  // ── Keyboard & Mouse ────────────────────────────────────────────────
  get keyboard() {
    return this.page.keyboard;
  }

  get mouse() {
    return this.page.mouse;
  }

  // ── Capture ─────────────────────────────────────────────────────────
  async screenshot(options?: { path?: string }): Promise<Buffer> {
    return this.page.screenshot({ path: options?.path }) as Promise<Buffer>;
  }

  async startRecording(): Promise<{ dir: string; fps: number }> {
    // No-op in browser mode — Playwright handles video natively
    return { dir: '', fps: 0 };
  }

  async stopRecording(): Promise<{
    dir: string;
    frame_count: number;
    fps: number;
    video: string | null;
  }> {
    return { dir: '', frame_count: 0, fps: 0, video: null };
  }

  // ── Locator ─────────────────────────────────────────────────────────
  locator(selector: string) {
    return this.page.locator(selector);
  }
}
