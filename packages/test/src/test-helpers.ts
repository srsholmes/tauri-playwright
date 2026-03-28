import { vi } from 'vitest';
import type { PluginResponse } from './socket-client.js';

/**
 * Creates a mock PluginClient for unit testing TauriPage without a socket.
 */
export function createMockClient(defaultResponse?: Partial<PluginResponse>) {
  const calls: Array<Record<string, unknown>> = [];
  let nextResponses: PluginResponse[] = [];
  const fallback: PluginResponse = { ok: true, data: null, ...defaultResponse };

  const client = {
    send: vi.fn(async (command: Record<string, unknown>): Promise<PluginResponse> => {
      calls.push(command);
      return nextResponses.shift() ?? fallback;
    }),
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(),
  };

  return {
    client: client as any,
    calls,
    setResponse(resp: Partial<PluginResponse>) {
      nextResponses = [{ ok: true, data: null, ...resp }];
    },
    setResponses(...resps: Array<Partial<PluginResponse>>) {
      nextResponses = resps.map((r) => ({ ok: true, data: null, ...r }));
    },
    setError(error: string) {
      nextResponses = [{ ok: false, error }];
    },
    lastCall(): Record<string, unknown> | undefined {
      return calls[calls.length - 1];
    },
    reset() {
      calls.length = 0;
      nextResponses = [];
      vi.clearAllMocks();
    },
  };
}
