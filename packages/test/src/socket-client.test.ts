import { describe, it, expect } from 'vitest';
import { PluginClient } from './socket-client.js';

describe('PluginClient', () => {
  it('requires socket path or TCP port', async () => {
    const client = new PluginClient();
    await expect(client.connect()).rejects.toThrow('No socket path or TCP port specified');
  });

  it('send throws when not connected', async () => {
    const client = new PluginClient('/tmp/nonexistent.sock');
    await expect(client.send({ type: 'ping' })).rejects.toThrow('Not connected');
  });

  it('disconnect is safe to call when not connected', () => {
    const client = new PluginClient('/tmp/test.sock');
    expect(() => client.disconnect()).not.toThrow();
  });
});
