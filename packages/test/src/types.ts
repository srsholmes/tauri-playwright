import type { Page } from '@playwright/test';
import type { TauriPage } from './tauri-page.js';

/**
 * Configuration for creating a Tauri Playwright test fixture.
 */
export interface TauriTestConfig {
  /**
   * Vite/dev server URL for browser-only mode.
   * @example 'http://localhost:1420'
   */
  devUrl: string;

  /**
   * Mock IPC handler map for browser-only mode.
   * Keys are Tauri command names, values are functions that receive
   * the command args and return mock data.
   */
  ipcMocks?: Record<string, (args?: Record<string, unknown>) => unknown>;

  /**
   * Command to start the Tauri app for full E2E mode.
   * If not set, assumes the app is already running.
   * @example 'npx tauri dev'
   */
  tauriCommand?: string;

  /** Working directory for the Tauri command. */
  tauriCwd?: string;

  /** Cargo features to enable (e.g. ['e2e-testing']). */
  tauriFeatures?: string[];

  /** Plugin socket path. Default: /tmp/tauri-playwright.sock */
  mcpSocket?: string;

  /** Startup timeout in seconds. Default: 120 */
  startTimeout?: number;

  /**
   * CDP endpoint for connecting to WebView2 on Windows.
   * When mode is 'cdp', Playwright connects directly via Chrome DevTools Protocol.
   * @example 'http://localhost:9222'
   */
  cdpEndpoint?: string;
}

/**
 * Test mode selector.
 * - 'browser': Runs against dev server with mocked Tauri IPC (headless, fast)
 * - 'tauri': Runs against real Tauri app via plugin socket bridge (all platforms)
 * - 'cdp': Connects to WebView2 via Chrome DevTools Protocol (Windows only, full Playwright)
 */
export type TestMode = 'browser' | 'tauri' | 'cdp';

/**
 * Extended Playwright fixtures provided by tauri-playwright.
 * In browser mode, tauriPage is a Playwright Page.
 * In tauri mode, tauriPage is a TauriPage with Playwright-like API.
 */
export interface TauriFixtures {
  tauriPage: Page | TauriPage;
  mode: TestMode;
}

/**
 * Shape of a captured IPC invoke call (browser mode only).
 */
export interface CapturedInvoke {
  cmd: string;
  args: Record<string, unknown>;
  timestamp: number;
}
