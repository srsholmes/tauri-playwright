import { test as base, chromium, type Page, type TestInfo } from '@playwright/test';
import { tauriExpect } from './expect.js';
import { generateIpcMockScript } from './ipc-mock.js';
import { PluginClient } from './socket-client.js';
import { TauriPage } from './tauri-page.js';
import { BrowserPageAdapter } from './browser-page-adapter.js';
import { TauriProcessManager } from './process-manager.js';
import type { TauriTestConfig, TauriFixtures, CapturedInvoke } from './types.js';

/**
 * Creates a Playwright test instance with Tauri-specific fixtures.
 *
 * **Browser mode** (default): Headless Chromium with mocked Tauri IPC. Fast, no Rust needed.
 * **Tauri mode**: Socket bridge to the real Tauri webview. Works on all platforms.
 * **CDP mode**: Direct Chrome DevTools Protocol to WebView2. Windows only, full Playwright.
 */
export function createTauriTest(config: TauriTestConfig) {
  const tauriTest = base.extend<TauriFixtures>({
    mode: ['browser', { option: true }],

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
        const adapter = new BrowserPageAdapter(page);
        await use(adapter as TauriFixtures['tauriPage']);
      } else if (mode === 'cdp') {
        // CDP mode: connect directly to WebView2 via Chrome DevTools Protocol.
        // Windows only — WebView2 is Chromium-based and supports --remote-debugging-port.
        // Launch Tauri app with: WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9222"
        const endpoint = config.cdpEndpoint ?? 'http://localhost:9222';
        let browser;
        try {
          browser = await chromium.connectOverCDP(endpoint);
          const context = browser.contexts()[0];
          if (!context)
            throw new Error(
              'No browser context found — is the Tauri app running with CDP enabled?',
            );
          const cdpPage = context.pages()[0] ?? (await context.newPage());

          // Wait for the app to be ready
          await cdpPage.waitForLoadState('domcontentloaded');

          const adapter = new BrowserPageAdapter(cdpPage);
          await use(adapter as TauriFixtures['tauriPage']);
        } finally {
          // Don't close the browser — we connected to an existing one
          browser?.close().catch(() => {});
        }
      } else {
        // Tauri mode: connect to the real Tauri app via the plugin socket
        let processManager: TauriProcessManager | null = null;
        let client: PluginClient | null = null;
        let tauriPage: TauriPage;

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

          // Reset app state by reloading the page before each test
          if (config.devUrl) {
            await tauriPage.evaluate(`window.location.href = ${JSON.stringify(config.devUrl)}`);
            // Wait for the page to load
            await new Promise((r) => setTimeout(r, 300));
            await tauriPage.waitForFunction('document.readyState === "complete"');
          }

          // Start recording before the test runs
          let recordingDir: string | null = null;
          try {
            const rec = await tauriPage.startRecording({
              path: testInfo.outputPath('recording'),
              fps: 15,
            });
            recordingDir = rec.dir;
          } catch {
            // Recording failed to start — non-fatal
          }

          await use(tauriPage as TauriFixtures['tauriPage']);

          // After test: stop recording and capture screenshot on failure
          let videoPath: string | null = null;
          if (recordingDir) {
            try {
              const result = await tauriPage.stopRecording();
              videoPath = result.video;
            } catch {
              // Stop failed — non-fatal
            }
          }

          if (testInfo.status !== testInfo.expectedStatus) {
            // Attach native screenshot
            try {
              const screenshotBuffer = await tauriPage.screenshot();
              if (screenshotBuffer.length > 0) {
                await testInfo.attach('native-screenshot', {
                  body: screenshotBuffer,
                  contentType: 'image/png',
                });
              }
            } catch {
              // Screenshot failed — non-fatal
            }
          }

          // Attach video if available (on failure or always, depending on config)
          if (videoPath) {
            try {
              const { readFile } = await import('node:fs/promises');
              const videoBuffer = await readFile(videoPath);
              await testInfo.attach('video', {
                body: videoBuffer,
                contentType: 'video/mp4',
              });
            } catch {
              // Video attach failed — non-fatal
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
    expect: tauriExpect,
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
  await page.evaluate(({ event, payload }) => window.__TAURI_EMIT_MOCK_EVENT__(event, payload), {
    event,
    payload,
  });
}
