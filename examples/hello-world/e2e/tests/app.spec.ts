import { test, expect } from '../fixtures';

test.describe('App', () => {
  test('renders the main heading', async ({ tauriPage }) => {
    await expect(tauriPage.locator('[data-testid="heading"]')).toContainText('Hello, Tauri Playwright!');
  });

  test('has all sections', async ({ tauriPage }) => {
    await expect(tauriPage.locator('[data-testid="counter-section"]')).toBeVisible();
    await expect(tauriPage.locator('[data-testid="greet-section"]')).toBeVisible();
    await expect(tauriPage.locator('[data-testid="todo-section"]')).toBeVisible();
    await expect(tauriPage.locator('[data-testid="modal-section"]')).toBeVisible();
  });
});
