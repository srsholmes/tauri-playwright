import { createTauriTest } from '@srsholmes/tauri-playwright';

// Define mock data in Node.js — ipcContext injects it into the browser
// so the handler functions can reference it by name.
const GREET_SUFFIX = "You've been greeted from Rust!";

export const { test, expect } = createTauriTest({
  devUrl: 'http://localhost:1421',
  ipcContext: { GREET_SUFFIX },
  ipcMocks: {
    greet: (args) =>
      `Hello, ${(args as { name?: string })?.name ?? 'stranger'}! ${GREET_SUFFIX}`,
  },
});
