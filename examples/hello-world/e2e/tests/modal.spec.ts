import { test, expect } from '../fixtures';

test.describe('Modal', () => {
  test('opens when clicking Open Modal button', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-open-modal"]');

    await expect(tauriPage.locator('[data-testid="modal"]')).toBeVisible();
    await expect(tauriPage.locator('[data-testid="modal"]')).toContainText('Modal Title');
  });

  test('closes when clicking Close button', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-open-modal"]');
    await expect(tauriPage.locator('[data-testid="modal"]')).toBeVisible();

    await tauriPage.click('[data-testid="btn-close-modal"]');
    await expect(tauriPage.locator('[data-testid="modal"]')).not.toBeVisible();
  });

  test('closes when clicking backdrop', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-open-modal"]');
    await expect(tauriPage.locator('[data-testid="modal"]')).toBeVisible();

    // Click the backdrop at the edge (not on the modal itself)
    await tauriPage.locator('[data-testid="modal-backdrop"]').click({ position: { x: 5, y: 5 } });
    await expect(tauriPage.locator('[data-testid="modal"]')).not.toBeVisible();
  });

  test('is not visible by default', async ({ tauriPage }) => {
    await expect(tauriPage.locator('[data-testid="modal"]')).not.toBeVisible();
    await expect(tauriPage.locator('[data-testid="modal-backdrop"]')).not.toBeVisible();
  });
});
