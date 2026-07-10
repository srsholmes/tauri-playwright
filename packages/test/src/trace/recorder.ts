import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { writeTraceZip } from './writer.js';

export type CaptureFrame = () => Promise<Uint8Array>;

// Pulled lazily from the installed @playwright/test so the trace header
// reports the version the viewer was bundled with, instead of a hardcoded
// string that goes stale on every PW bump.
let cachedPlaywrightVersion: string | undefined;
function detectPlaywrightVersion(): string {
  if (cachedPlaywrightVersion) return cachedPlaywrightVersion;
  try {
    const req = createRequire(import.meta.url);
    const pkgPath = req.resolve('@playwright/test/package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    cachedPlaywrightVersion = pkg.version ?? '1.58.0';
  } catch {
    cachedPlaywrightVersion = '1.58.0';
  }
  return cachedPlaywrightVersion;
}

// Most Tauri plugin commands map 1:1 to Playwright Page methods, but a few
// are context-shaped. The viewer renders this as "<class>.<method>" so the
// distinction shows up in the action list.
function classForMethod(method: string): string {
  switch (method) {
    case 'listWindows':
    case 'waitForWindow':
      return 'BrowserContext';
    default:
      return 'Page';
  }
}

interface TraceState {
  dir: string;
  events: unknown[];
  contextId: string;
  pageId: string;
  callCounter: number;
  resources: Map<string, Uint8Array>;
  startMonotonic: number;
  startWallTime: number;
}

// Playwright's trace viewer correlates screencast frames to actions using
// monotonic-ms timestamps (performance.now), while the context-options event
// also records a wall-clock anchor. Everything inside the trace must live on
// the same monotonic scale.
function monotonicMs(): number {
  return performance.now();
}

/**
 * Records a Playwright-compatible trace.zip capturing before/after PNG frames
 * around each action command. The recorder itself doesn't know how to take a
 * screenshot — callers supply a `captureFrame` closure (typically a closure
 * over `PluginClient.send({ type: 'native_screenshot' })`).
 *
 * Compatibility notes for `npx playwright show-trace`:
 *   - Action list, timing, and per-action screenshots: supported (via
 *     `screencast-frame` events matched by timestamp).
 *   - The "DOM" / "Snapshots" tab will be empty: we don't emit
 *     `frame-snapshot` or `resource-snapshot` events, since a Tauri webview
 *     doesn't expose a stable serialised DOM the way a Chromium context does.
 *   - The "Network" tab will be empty for the same reason: Tauri IPC isn't
 *     HTTP, so there's nothing meaningful to populate it with.
 */
export class TraceRecorder {
  private state: TraceState | null = null;

  get isActive(): boolean {
    return !!this.state;
  }

  start(dir: string): { ok: true; dir: string } | { ok: false; error: string } {
    if (this.state) return { ok: false, error: 'tracing already in progress' };
    try {
      mkdirSync(dir, { recursive: true });
      const contextId = `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const pageId = `page-${Math.random().toString(36).slice(2, 8)}`;
      const wallTime = Date.now();
      const monotonic = monotonicMs();
      this.state = {
        dir,
        events: [],
        contextId,
        pageId,
        callCounter: 0,
        resources: new Map(),
        startMonotonic: monotonic,
        startWallTime: wallTime,
      };
      this.state.events.push({
        version: 8,
        type: 'context-options',
        origin: 'library',
        browserName: 'tauri',
        channel: 'tauri-playwright',
        playwrightVersion: detectPlaywrightVersion(),
        options: {},
        platform: process.platform,
        wallTime,
        monotonicTime: monotonic,
        sdkLanguage: 'javascript',
        testIdAttributeName: 'data-testid',
        contextId,
      });
      return { ok: true, dir };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async captureFrame(capture: CaptureFrame): Promise<string | null> {
    if (!this.state) return null;
    try {
      const png = await capture();
      const dims = readPngDimensions(png);
      // Note: the trace schema calls this field `sha1`, but we don't actually
      // hash — we generate a unique resource name per frame. Identical frames
      // therefore don't dedup (storage cost is the trade for not paying the
      // hash on every action).
      const resourceName = `frame-${this.state.pageId}-${Math.floor(monotonicMs())}-${Math.random().toString(36).slice(2, 6)}.png`;
      this.state.resources.set(resourceName, png);
      this.state.events.push({
        type: 'screencast-frame',
        pageId: this.state.pageId,
        sha1: resourceName,
        width: dims.width,
        height: dims.height,
        timestamp: monotonicMs(),
      });
      return resourceName;
    } catch {
      return null;
    }
  }

  recordAction(input: {
    method: string;
    params: Record<string, unknown>;
    response: { ok: boolean; data?: unknown; error?: string };
    startTime: number;
    endTime: number;
    beforeSha: string | null;
    afterSha: string | null;
  }): void {
    if (!this.state) return;
    const { method, params, response, startTime, endTime } = input;
    const callId = `pw@${this.state.callCounter++}`;
    this.state.events.push({
      type: 'before',
      callId,
      // Playwright >= v8 emits a `stepId` on every action so the test
      // list panel can group sub-steps. The v7→v8 modernizer falls back
      // to `callId` if missing, but emitting it explicitly avoids weird
      // panel rendering and matches what `playwright-core` does.
      stepId: callId,
      startTime,
      title: method,
      class: classForMethod(method),
      method,
      params,
      pageId: this.state.pageId,
    });
    this.state.events.push({
      type: 'after',
      callId,
      endTime,
      error: response.ok ? undefined : { message: response.error, name: 'Error' },
      result: response.ok ? response.data : undefined,
    });
  }

  now(): number {
    return monotonicMs();
  }

  async stop(): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
    if (!this.state) return { ok: false, error: 'no tracing in progress' };
    const s = this.state;
    this.state = null;
    try {
      const zipPath = path.join(s.dir, 'trace.zip');
      await writeTraceZip(zipPath, s.events, s.resources);
      return { ok: true, path: zipPath };
    } catch (err: unknown) {
      const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
      return { ok: false, error: msg };
    }
  }
}

// PNG spec: first 8 bytes are the signature, then IHDR chunk at offset 8.
// Width (big-endian u32) lives at bytes 16..20, height at 20..24.
function readPngDimensions(bytes: Uint8Array): { width: number; height: number } {
  try {
    if (bytes.length < 24) return { width: 0, height: 0 };
    // Signature check: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] !== 0x89 ||
      bytes[1] !== 0x50 ||
      bytes[2] !== 0x4e ||
      bytes[3] !== 0x47
    ) {
      return { width: 0, height: 0 };
    }
    const width =
      (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
    const height =
      (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
    return { width: width >>> 0, height: height >>> 0 };
  } catch {
    return { width: 0, height: 0 };
  }
}
