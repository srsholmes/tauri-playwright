import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { writeTraceZip } from './writer.js';

export type CaptureFrame = () => Promise<Uint8Array>;

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
        playwrightVersion: '1.58.0',
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
      const sha1 = `frame-${this.state.pageId}-${Math.floor(monotonicMs())}-${Math.random().toString(36).slice(2, 6)}.png`;
      this.state.resources.set(sha1, png);
      this.state.events.push({
        type: 'screencast-frame',
        pageId: this.state.pageId,
        sha1,
        width: dims.width,
        height: dims.height,
        timestamp: monotonicMs(),
      });
      return sha1;
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
      startTime,
      title: method,
      class: 'Page',
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
