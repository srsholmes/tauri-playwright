import { test, expect } from '../fixtures';

test.describe('Multi-window', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'tauri', 'Real WebviewWindow requires Tauri runtime');
  });

  test('opens a viewer window and drives it via waitForWindow', async ({ tauriPage }) => {
    await tauriPage.click('[data-testid="btn-open-viewer"]');

    const viewer = await tauriPage.waitForWindow((w) => w.label.startsWith('viewer-'));

    const heading = await viewer.textContent('[data-testid="viewer-heading"]');
    expect(heading).toContain('Viewer window');

    const body = await viewer.textContent('[data-testid="viewer-body"]');
    expect(body).toContain('Hello from the second window!');

    await viewer.click('[data-testid="btn-viewer-close"]');

    // After closing, the label should no longer appear in listWindows().
    await expect
      .poll(async () => (await tauriPage.listWindows()).some((w) => w.label === viewer.targetWindow), {
        timeout: 3000,
      })
      .toBe(false);
  });

  test('listWindows includes the main window', async ({ tauriPage }) => {
    const windows = await tauriPage.listWindows();
    expect(windows.some((w) => w.label === 'main')).toBe(true);
  });
});
