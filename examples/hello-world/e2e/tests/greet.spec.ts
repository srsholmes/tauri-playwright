import { test, expect } from '../fixtures';

test.describe('Greet (Tauri IPC)', () => {
  test('shows greeting when clicking Greet button', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="greet-input"]', 'World');
    await tauriPage.click('[data-testid="btn-greet"]');
    await tauriPage.waitForSelector('[data-testid="greet-result"]');

    const text = await tauriPage.textContent('[data-testid="greet-result"]');
    expect(text).toContain("Hello, World! You've been greeted from Rust!");
  });

  test('greeting updates when name changes', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="greet-input"]', 'Alice');
    await tauriPage.click('[data-testid="btn-greet"]');
    await tauriPage.waitForSelector('[data-testid="greet-result"]');
    let text = await tauriPage.textContent('[data-testid="greet-result"]');
    expect(text).toContain('Hello, Alice!');

    await tauriPage.fill('[data-testid="greet-input"]', 'Bob');
    await tauriPage.click('[data-testid="btn-greet"]');
    await tauriPage.waitForFunction(
      "document.querySelector('[data-testid=\"greet-result\"]')?.textContent?.includes('Bob')",
    );
    text = await tauriPage.textContent('[data-testid="greet-result"]');
    expect(text).toContain('Hello, Bob!');
  });

  test('greets on Enter key', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="greet-input"]', 'KeyTest');
    await tauriPage.press('[data-testid="greet-input"]', 'Enter');
    await tauriPage.waitForSelector('[data-testid="greet-result"]');

    const text = await tauriPage.textContent('[data-testid="greet-result"]');
    expect(text).toContain('Hello, KeyTest!');
  });
});
