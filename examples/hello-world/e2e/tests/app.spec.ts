import { test, expect } from '../fixtures';

test.describe('App', () => {
  test('renders the main heading', async ({ tauriPage }) => {
    const text = await tauriPage.textContent('[data-testid="heading"]');
    expect(text).toContain('Hello, Tauri Playwright!');
  });

  test('has all sections', async ({ tauriPage }) => {
    expect(await tauriPage.isVisible('[data-testid="counter-section"]')).toBe(true);
    expect(await tauriPage.isVisible('[data-testid="greet-section"]')).toBe(true);
    expect(await tauriPage.isVisible('[data-testid="todo-section"]')).toBe(true);
    expect(await tauriPage.isVisible('[data-testid="modal-section"]')).toBe(true);
  });
});
