import { test as base, type Page, type TestInfo } from '@playwright/test';
import { generateIpcMockScript } from './ipc-mock.js';
import { PluginClient } from './socket-client.js';
import { TauriPage } from './tauri-page.js';
import { TauriProcessManager } from './process-manager.js';
import type { TauriTestConfig, TestMode, TauriFixtures, CapturedInvoke } from './types.js';

/**
 * Creates a Playwright test instance with Tauri-specific fixtures.
 *
 * **Browser mode** (default): `tauriPage` is a standard Playwright Page with
 * Tauri IPC mocked. Fast, no Rust needed.
 *
 * **Tauri mode**: `tauriPage` is a TauriPage backed by the plugin socket bridge.
 * Controls the real Tauri webview (WKWebView/WebView2/WebKitGTK).
 */
export function createTauriTest(config: TauriTestConfig) {
  const tauriTest = base.extend<TauriFixtures>({
    mode: ['browser', { option: true }],

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tauriPage: async ({ page, mode }, use, testInfo: TestInfo) => {
      if (mode === 'browser') {
        // Browser-only mode: mock Tauri IPC and run in Chromium
        if (config.ipcMocks) {
          await page.addInitScript(generateIpcMockScript(config.ipcMocks));
        } else {
          await page.addInitScript(generateIpcMockScript({}));
        }

        await page.goto(config.devUrl);
        await page.waitForLoadState('networkidle');
        await use(page as unknown as TauriFixtures['tauriPage']);
      } else {
        // Tauri mode: connect to the real Tauri app via the plugin socket
        let processManager: TauriProcessManager | null = null;
        let client: PluginClient | null = null;
        let tauriPage: TauriPage | null = null;

        try {
          const socketPath = config.mcpSocket ?? '/tmp/tauri-playwright.sock';

          // If a Tauri command is configured, spawn the app
          if (config.tauriCommand) {
            const parts = config.tauriCommand.split(' ');
            processManager = new TauriProcessManager({
              command: parts[0],
              args: parts.slice(1),
              cwd: config.tauriCwd,
              features: config.tauriFeatures,
              socketPath,
              startTimeout: config.startTimeout ?? 120,
            });
            await processManager.start();
          } else {
            // Assume the app is already running — wait for the socket
            const pm = new TauriProcessManager({ socketPath });
            await pm.waitForSocket(30000);
          }

          // Connect to the plugin
          client = new PluginClient(socketPath);
          await client.connect();

          // Verify connection
          const ping = await client.send({ type: 'ping' });
          if (!ping.ok) {
            throw new Error('Plugin ping failed');
          }

          tauriPage = new TauriPage(client);

          await use(tauriPage as unknown as TauriFixtures['tauriPage']);

          // After test: capture native screenshot on failure and attach to report
          if (testInfo.status !== testInfo.expectedStatus) {
            try {
              const screenshotBuffer = await tauriPage.screenshot();
              if (screenshotBuffer.length > 0) {
                await testInfo.attach('native-screenshot', {
                  body: screenshotBuffer,
                  contentType: 'image/png',
                });
              }
            } catch {
              // Native screenshot failed — non-fatal, test result stands
            }
          }
        } finally {
          client?.disconnect();
          processManager?.stop();
        }
      }
    },
  });

  return {
    test: tauriTest,
    expect: base.expect,
  };
}

/**
 * Helper to retrieve captured IPC calls from the page (browser mode only).
 */
export async function getCapturedInvokes(page: Page): Promise<CapturedInvoke[]> {
  return page.evaluate(() => window.__TAURI_GET_MOCK_CALLS__());
}

/**
 * Clear the captured IPC call log (browser mode only).
 */
export async function clearCapturedInvokes(page: Page): Promise<void> {
  await page.evaluate(() => window.__TAURI_CLEAR_MOCK_CALLS__());
}

/**
 * Emit a mock Tauri event into the page (browser mode only).
 */
export async function emitMockEvent(page: Page, event: string, payload: unknown): Promise<void> {
  await page.evaluate(
    ({ event, payload }) => window.__TAURI_EMIT_MOCK_EVENT__(event, payload),
    { event, payload }
  );
}
