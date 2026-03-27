import { test, expect } from '../fixtures';

test.describe('Counter', () => {
  test('starts at zero', async ({ tauriPage }) => {
    const text = await tauriPage.textContent('[data-testid="counter-value"]');
    expect(text).toContain('Count: 0');
  });

  test('increments', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-increment"]');
    let text = await tauriPage.textContent('[data-testid="counter-value"]');
    expect(text).toContain('Count: 1');

    await tauriPage.click('[data-testid="btn-increment"]');
    text = await tauriPage.textContent('[data-testid="counter-value"]');
    expect(text).toContain('Count: 2');
  });

  test('decrements', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-decrement"]');
    const text = await tauriPage.textContent('[data-testid="counter-value"]');
    expect(text).toContain('Count: -1');
  });

  test('resets to zero', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-increment"]');
    await tauriPage.click('[data-testid="btn-increment"]');
    await tauriPage.click('[data-testid="btn-increment"]');
    let text = await tauriPage.textContent('[data-testid="counter-value"]');
    expect(text).toContain('Count: 3');

    await tauriPage.click('[data-testid="btn-reset"]');
    text = await tauriPage.textContent('[data-testid="counter-value"]');
    expect(text).toContain('Count: 0');
  });
});
