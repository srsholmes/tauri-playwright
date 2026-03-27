import { test, expect } from '../fixtures';
import { getCapturedInvokes, clearCapturedInvokes } from '@tauri-playwright/test';

test.describe('Greet (Tauri IPC)', () => {
  test('shows greeting when clicking Greet button', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="greet-input"]', 'World');
    await tauriPage.click('[data-testid="btn-greet"]');

    await expect(tauriPage.locator('[data-testid="greet-result"]')).toContainText(
      "Hello, World! You've been greeted from Rust!"
    );
  });

  test('greeting updates when name changes', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="greet-input"]', 'Alice');
    await tauriPage.click('[data-testid="btn-greet"]');
    await expect(tauriPage.locator('[data-testid="greet-result"]')).toContainText('Hello, Alice!');

    await tauriPage.fill('[data-testid="greet-input"]', 'Bob');
    await tauriPage.click('[data-testid="btn-greet"]');
    await expect(tauriPage.locator('[data-testid="greet-result"]')).toContainText('Hello, Bob!');
  });

  test('captures IPC invoke calls', async ({ tauriPage }) => {
    await clearCapturedInvokes(tauriPage);

    await tauriPage.fill('[data-testid="greet-input"]', 'Test');
    await tauriPage.click('[data-testid="btn-greet"]');

    const calls = await getCapturedInvokes(tauriPage);
    expect(calls).toContainEqual(
      expect.objectContaining({ cmd: 'greet', args: { name: 'Test' } })
    );
  });

  test('greets on Enter key', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="greet-input"]', 'KeyTest');
    await tauriPage.press('[data-testid="greet-input"]', 'Enter');

    await expect(tauriPage.locator('[data-testid="greet-result"]')).toContainText('Hello, KeyTest!');
  });
});
