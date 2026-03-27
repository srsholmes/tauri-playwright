// Core fixture
export { createTauriTest } from './fixture.js';

// Test helpers (browser mode)
export { getCapturedInvokes, clearCapturedInvokes, emitMockEvent } from './fixture.js';

// IPC mock (advanced usage)
export { generateIpcMockScript } from './ipc-mock.js';

// Tauri mode classes
export { TauriPage, TauriLocator } from './tauri-page.js';
export { PluginClient } from './socket-client.js';
export { TauriProcessManager } from './process-manager.js';

// Types
export type {
  TauriTestConfig,
  TestMode,
  TauriFixtures,
  CapturedInvoke,
} from './types.js';
export type { PluginResponse } from './socket-client.js';
export type { ProcessConfig } from './process-manager.js';
