import { test, expect } from '../fixtures';

test.describe('Screenshot & Trace', () => {
  test('explicit native screenshot', async ({ tauriPage }) => {
    const buf = await tauriPage.screenshot();
    await test.info().attach('native-screenshot', {
      body: buf,
      contentType: 'image/png',
    });
    expect(buf.length).toBeGreaterThan(1000);
  });

  test('should fail - wrong heading text', async ({ tauriPage }) => {
    // Capture native screenshot before the assertion fails
    const buf = await tauriPage.screenshot();
    await test.info().attach('before-failure', {
      body: buf,
      contentType: 'image/png',
    });

    const text = await tauriPage.textContent('[data-testid="heading"]');
    expect(text).toContain('This text does not exist anywhere');
  });

  test('should fail - element not visible', async ({ tauriPage }) => {
    const visible = await tauriPage.isVisible('[data-testid="nonexistent"]');
    expect(visible).toBe(true);
  });

  test('should pass - heading is correct', async ({ tauriPage }) => {
    const text = await tauriPage.textContent('[data-testid="heading"]');
    expect(text).toContain('Hello, Tauri Playwright!');
  });
});
