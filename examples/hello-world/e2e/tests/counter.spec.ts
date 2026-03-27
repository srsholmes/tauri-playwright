import { test, expect } from '../fixtures';

test.describe('Counter', () => {
  test('starts at zero', async ({ tauriPage }) => {
    await expect(tauriPage.locator('[data-testid="counter-value"]')).toContainText('Count: 0');
  });

  test('increments', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-increment"]');
    await expect(tauriPage.locator('[data-testid="counter-value"]')).toContainText('Count: 1');

    await tauriPage.click('[data-testid="btn-increment"]');
    await expect(tauriPage.locator('[data-testid="counter-value"]')).toContainText('Count: 2');
  });

  test('decrements', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-decrement"]');
    await expect(tauriPage.locator('[data-testid="counter-value"]')).toContainText('Count: -1');
  });

  test('resets to zero', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-increment"]');
    await tauriPage.click('[data-testid="btn-increment"]');
    await tauriPage.click('[data-testid="btn-increment"]');
    await expect(tauriPage.locator('[data-testid="counter-value"]')).toContainText('Count: 3');

    await tauriPage.click('[data-testid="btn-reset"]');
    await expect(tauriPage.locator('[data-testid="counter-value"]')).toContainText('Count: 0');
  });
});
