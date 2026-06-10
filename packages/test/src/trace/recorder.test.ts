import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { TraceRecorder } from './recorder.js';

// Minimal valid PNG (1x1 transparent). Used so the dimension parser exercises
// the real IHDR path rather than returning the 0x0 fallback.
const TINY_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // signature
  0x00, 0x00, 0x00, 0x0d, // IHDR length
  0x49, 0x48, 0x44, 0x52, // "IHDR"
  0x00, 0x00, 0x00, 0x01, // width = 1
  0x00, 0x00, 0x00, 0x01, // height = 1
  0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, etc
  0x1f, 0x15, 0xc4, 0x89, // CRC (not validated)
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82, // IEND
]);

describe('TraceRecorder', () => {
  it('writes a zip with test.trace and a resource per captured frame', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'tauri-trace-test-'));
    try {
      const rec = new TraceRecorder();
      const start = rec.start(dir);
      expect(start.ok).toBe(true);
      expect(rec.isActive).toBe(true);

      const capture = async () => TINY_PNG;
      const before = await rec.captureFrame(capture);
      expect(before).toMatch(/^frame-/);

      rec.recordAction({
        method: 'click',
        params: { selector: '#btn' },
        response: { ok: true, data: null },
        startTime: 0,
        endTime: 1,
        beforeSha: before,
        afterSha: null,
      });

      const stop = await rec.stop();
      expect(stop.ok).toBe(true);
      expect(rec.isActive).toBe(false);

      const zip = readFileSync(path.join(dir, 'trace.zip'));
      const entries = unzipSync(zip);

      expect(Object.keys(entries)).toContain('test.trace');
      expect(Object.keys(entries)).toContain('test.network');

      const traceText = strFromU8(entries['test.trace']);
      const lines = traceText.trim().split('\n').map((l) => JSON.parse(l));

      // First event is context-options with browserName=tauri
      expect(lines[0]).toMatchObject({
        type: 'context-options',
        browserName: 'tauri',
        channel: 'tauri-playwright',
        version: 8,
      });

      // Frame + before + after events present
      const types = lines.map((e: { type: string }) => e.type);
      expect(types).toContain('screencast-frame');
      expect(types).toContain('before');
      expect(types).toContain('after');

      const beforeEvent = lines.find((e: { type: string; method?: string }) => e.type === 'before');
      expect(beforeEvent).toMatchObject({
        method: 'click',
        class: 'Page',
        params: { selector: '#btn' },
      });
      // v8 trace schema requires stepId on every action so the test list
      // panel can group sub-steps; modernizer falls back to callId otherwise.
      expect(beforeEvent).toHaveProperty('stepId');
      expect((beforeEvent as { stepId: string }).stepId).toBe(
        (beforeEvent as { callId: string }).callId,
      );

      // Version must come from the installed @playwright/test, not the
      // hardcoded fallback. Assert it looks like a real semver.
      expect(lines[0]).toMatchObject({ type: 'context-options' });
      expect((lines[0] as { playwrightVersion: string }).playwrightVersion).toMatch(
        /^\d+\.\d+\.\d+/,
      );

      // Resource entry exists for the captured frame
      expect(before).not.toBeNull();
      const resKey = `resources/${before}`;
      expect(Object.keys(entries)).toContain(resKey);
      expect(entries[resKey].length).toBe(TINY_PNG.length);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('start fails if already active', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'tauri-trace-test-'));
    try {
      const rec = new TraceRecorder();
      rec.start(dir);
      const second = rec.start(dir);
      expect(second.ok).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('stop fails if not active', async () => {
    const rec = new TraceRecorder();
    const stop = await rec.stop();
    expect(stop.ok).toBe(false);
  });

  it('captureFrame returns null when not active', async () => {
    const rec = new TraceRecorder();
    const sha = await rec.captureFrame(async () => TINY_PNG);
    expect(sha).toBeNull();
  });

  it('classifies context-shaped commands as BrowserContext, not Page', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'tauri-trace-test-'));
    try {
      const rec = new TraceRecorder();
      rec.start(dir);
      rec.recordAction({
        method: 'listWindows',
        params: {},
        response: { ok: true, data: [] },
        startTime: 0,
        endTime: 1,
        beforeSha: null,
        afterSha: null,
      });
      const stop = await rec.stop();
      expect(stop.ok).toBe(true);

      const zip = readFileSync(path.join(dir, 'trace.zip'));
      const entries = unzipSync(zip);
      const lines = strFromU8(entries['test.trace'])
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l));
      const before = lines.find((e: { type: string }) => e.type === 'before');
      expect(before).toMatchObject({ method: 'listWindows', class: 'BrowserContext' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
