import { createTauriTest } from '@srsholmes/tauri-playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Define mock data in Node.js — ipcContext injects it into the browser
// so the handler functions can reference it by name.
const GREET_SUFFIX = "You've been greeted from Rust!";

export const { test, expect } = createTauriTest({
  // Browser-only mode config
  devUrl: 'http://localhost:1420',
  ipcContext: { GREET_SUFFIX },
  ipcMocks: {
    greet: (args) =>
      `Hello, ${(args as { name?: string })?.name ?? 'stranger'}! ${GREET_SUFFIX}`,
  },

  // Tauri mode config — the plugin socket
  mcpSocket: '/tmp/tauri-playwright.sock',
  tauriCwd: resolve(__dirname, '..'),
});
