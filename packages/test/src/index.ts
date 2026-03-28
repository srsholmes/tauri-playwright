// Core fixture
export { createTauriTest } from './fixture.js';
export { tauriExpect } from './expect.js';

// Test helpers (browser mode)
export { getCapturedInvokes, clearCapturedInvokes, emitMockEvent } from './fixture.js';

// IPC mock (advanced usage)
export { generateIpcMockScript } from './ipc-mock.js';

// Tauri mode classes
export { TauriPage, TauriLocator, TauriKeyboard, TauriMouse } from './tauri-page.js';
export type { TimeoutOption } from './tauri-page.js';
export { BrowserPageAdapter } from './browser-page-adapter.js';
export type { LocatorLike } from './expect.js';
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
