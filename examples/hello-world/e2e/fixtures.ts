import { createTauriTest } from '@srsholmes/tauri-playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const { test, expect } = createTauriTest({
  // Browser-only mode config
  devUrl: 'http://localhost:1420',
  ipcMocks: {
    greet: (args) =>
      `Hello, ${(args as { name?: string })?.name ?? 'stranger'}! You've been greeted from Rust!`,
  },

  // Tauri mode config — the plugin socket
  mcpSocket: '/tmp/tauri-playwright.sock',
  tauriCwd: resolve(__dirname, '..'),
});
