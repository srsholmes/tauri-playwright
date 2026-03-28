import { test, expect } from '../fixtures';

test.describe('Auto-waiting', () => {
  test('click waits for delayed element', async ({ tauriPage }) => {
    // Trigger the delayed element (appears after 1s)
    await tauriPage.click('[data-testid="btn-show-delayed"]');

    // This would fail without auto-waiting because the element doesn't exist yet.
    // With auto-waiting, it polls until the element appears and is visible.
    const text = await tauriPage.textContent('[data-testid="delayed-element"]');
    expect(text).toContain('I appeared after a delay');
  });

  test('textContent waits for delayed element', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-show-delayed"]');

    // textContent auto-waits for the element to exist
    const text = await tauriPage.textContent('[data-testid="delayed-element"]');
    expect(text).toBe('I appeared after a delay!');
  });

  test('innerHTML waits for delayed element', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-show-delayed"]');

    const html = await tauriPage.innerHTML('[data-testid="delayed-element"]');
    expect(html).toBe('I appeared after a delay!');
  });

  test('timeout error on nonexistent element', async ({ tauriPage }) => {
    // Short timeout should fail fast
    await expect(
      tauriPage.textContent('[data-testid="does-not-exist"]', { timeout: 200 })
    ).rejects.toThrow(/timeout/i);
  });

  test('isVisible returns instantly without waiting', async ({ tauriPage }) => {
    // isVisible should return false immediately, not wait
    const start = Date.now();
    const visible = await tauriPage.isVisible('[data-testid="delayed-element"]');
    const elapsed = Date.now() - start;

    expect(visible).toBe(false);
    expect(elapsed).toBeLessThan(1000); // Should be near-instant, not 5s timeout
  });

  test('isHidden returns true for nonexistent element instantly', async ({ tauriPage }) => {
    const start = Date.now();
    const hidden = await tauriPage.isHidden('[data-testid="does-not-exist"]');
    const elapsed = Date.now() - start;

    expect(hidden).toBe(true);
    expect(elapsed).toBeLessThan(1000);
  });

  test('count works on zero matches without waiting', async ({ tauriPage }) => {
    const start = Date.now();
    const count = await tauriPage.count('[data-testid="does-not-exist"]');
    const elapsed = Date.now() - start;

    expect(count).toBe(0);
    expect(elapsed).toBeLessThan(1000);
  });

  test('fill waits for element to appear', async ({ tauriPage }) => {
    // The greet input exists immediately — this verifies fill still works with auto-wait
    await tauriPage.fill('[data-testid="greet-input"]', 'Auto-wait test');
    const val = await tauriPage.inputValue('[data-testid="greet-input"]');
    expect(val).toBe('Auto-wait test');
  });
});
