import { test, expect } from '../fixtures';

test.describe('Bun Compatibility Smoke Tests', () => {
  test('page loads successfully', async ({ tauriPage }) => {
    const heading = await tauriPage.textContent('[data-testid="heading"]');
    expect(heading).toContain('Hello, Tauri Playwright!');
  });

  test('counter starts at zero', async ({ tauriPage }) => {
    const text = await tauriPage.textContent('[data-testid="counter-value"]');
    expect(text).toContain('Count: 0');
  });

  test('counter increments on click', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-increment"]');
    const text = await tauriPage.textContent('[data-testid="counter-value"]');
    expect(text).toContain('Count: 1');
  });

  test('counter decrements on click', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-decrement"]');
    const text = await tauriPage.textContent('[data-testid="counter-value"]');
    expect(text).toContain('Count: -1');
  });

  test('IPC mock works for greet command', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="greet-input"]', 'Bun');
    await tauriPage.click('[data-testid="greet-button"]');
    const msg = await tauriPage.textContent('[data-testid="greet-msg"]');
    expect(msg).toContain('Hello, Bun!');
    expect(msg).toContain("You've been greeted from Rust!");
  });
});
