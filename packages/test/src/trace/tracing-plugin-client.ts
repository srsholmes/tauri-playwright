import { Buffer } from 'node:buffer';
import { PluginClient, type PluginResponse } from '../socket-client.js';
import { TraceRecorder } from './recorder.js';

// Internal command types that should not trigger a before/after frame capture.
// Mirrors electrobun-playwright's runner.ts `isInternalCommand` — anything
// that's infrastructure (tracing itself, recording, screenshot, read_artifact,
// ping) is excluded.
const INTERNAL_COMMANDS = new Set([
  'ping',
  'native_screenshot',
  'start_recording',
  'stop_recording',
  'start_tracing',
  'stop_tracing',
  'read_artifact',
]);

/**
 * PluginClient variant that, when an active TraceRecorder is attached,
 * captures a PNG frame before and after each non-internal command and
 * records the action into the trace event stream.
 *
 * Frames are obtained by sending `native_screenshot` over the same socket
 * (routed directly through the parent class, bypassing the trace wrapper
 * to avoid infinite recursion).
 *
 * Inactive-tracer path is a passthrough to the parent `send()` — zero cost
 * when tracing is off.
 */
export class TracingPluginClient extends PluginClient {
  private tracer: TraceRecorder;

  constructor(
    socketPath: string | undefined,
    tcpPort: number | undefined,
    tracer: TraceRecorder,
  ) {
    super(socketPath, tcpPort);
    this.tracer = tracer;
  }

  override async send(command: Record<string, unknown>): Promise<PluginResponse> {
    const type = typeof command.type === 'string' ? command.type : '';
    if (!this.tracer.isActive || INTERNAL_COMMANDS.has(type)) {
      return super.send(command);
    }

    const start = this.tracer.now();
    const beforeSha = await this.tracer.captureFrame(() => this.captureNativeFrame());

    let resp: PluginResponse;
    try {
      resp = await super.send(command);
    } catch (err: unknown) {
      resp = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }

    const afterSha = await this.tracer.captureFrame(() => this.captureNativeFrame());
    const params: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(command)) {
      if (k !== 'type') params[k] = v;
    }
    this.tracer.recordAction({
      method: cmdTypeToMethod(type),
      params,
      response: resp,
      startTime: start,
      endTime: this.tracer.now(),
      beforeSha,
      afterSha,
    });
    return resp;
  }

  private async captureNativeFrame(): Promise<Uint8Array> {
    const resp = await super.send({ type: 'native_screenshot' });
    if (!resp.ok) throw new Error(resp.error ?? 'native_screenshot failed');
    const data = resp.data as { base64?: string } | null;
    if (!data?.base64) throw new Error('native_screenshot returned no base64');
    return new Uint8Array(Buffer.from(data.base64, 'base64'));
  }
}

// Playwright's trace viewer expects method names in camelCase (e.g. "typeText",
// "waitForSelector"). Our wire-protocol uses snake_case.
function cmdTypeToMethod(t: string): string {
  return t.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}
