import { test, expect } from '../fixtures';

test.describe('Modal', () => {
  test('is not visible by default', async ({ tauriPage }) => {
    expect(await tauriPage.isVisible('[data-testid="modal"]')).toBe(false);
    expect(await tauriPage.isVisible('[data-testid="modal-backdrop"]')).toBe(false);
  });

  test('opens when clicking Open Modal button', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-open-modal"]');
    await tauriPage.waitForSelector('[data-testid="modal"]');

    expect(await tauriPage.isVisible('[data-testid="modal"]')).toBe(true);
    const text = await tauriPage.textContent('[data-testid="modal"]');
    expect(text).toContain('Modal Title');
  });

  test('closes when clicking Close button', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-open-modal"]');
    await tauriPage.waitForSelector('[data-testid="modal"]');
    expect(await tauriPage.isVisible('[data-testid="modal"]')).toBe(true);

    await tauriPage.click('[data-testid="btn-close-modal"]');
    await tauriPage.waitForFunction('!document.querySelector(\'[data-testid="modal"]\')');
    expect(await tauriPage.isHidden('[data-testid="modal"]')).toBe(true);
  });

  test('closes when clicking backdrop', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-open-modal"]');
    await tauriPage.waitForSelector('[data-testid="modal-backdrop"]');

    // Click the backdrop edge (not center, which would hit the modal content)
    await tauriPage.evaluate('document.querySelector(\'[data-testid="modal-backdrop"]\').click()');
    await tauriPage.waitForFunction('!document.querySelector(\'[data-testid="modal-backdrop"]\')');
    expect(await tauriPage.isHidden('[data-testid="modal-backdrop"]')).toBe(true);
  });
});
