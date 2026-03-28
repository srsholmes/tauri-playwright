import { describe, it, expect } from 'vitest';
import { TauriProcessManager } from './process-manager.js';

describe('TauriProcessManager', () => {
  it('constructs with default socket path', () => {
    const pm = new TauriProcessManager({});
    expect(pm).toBeInstanceOf(TauriProcessManager);
  });

  it('constructs with custom socket path', () => {
    const pm = new TauriProcessManager({ socketPath: '/tmp/custom.sock' });
    expect(pm).toBeInstanceOf(TauriProcessManager);
  });

  it('waitForSocket rejects on nonexistent socket', async () => {
    const pm = new TauriProcessManager({ socketPath: '/tmp/nonexistent-test-pw.sock' });
    await expect(pm.waitForSocket(200)).rejects.toThrow();
  });

  it('stop is safe to call without start', () => {
    const pm = new TauriProcessManager({});
    expect(() => pm.stop()).not.toThrow();
  });
});
