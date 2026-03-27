import { test, expect } from '../fixtures';
import { Buffer } from 'node:buffer';

test.describe('Advanced Features', () => {

  test('file upload — setInputFiles', async ({ tauriPage }) => {
    // Create a fake file
    const content = Buffer.from('Hello, this is a test file!');
    const fileCount = await (tauriPage as any).setInputFiles(
      '[data-testid="file-input"]',
      [{ name: 'test.txt', mimeType: 'text/plain', buffer: content }],
    );
    expect(fileCount).toBe(1);

    // Wait for React to update
    await tauriPage.waitForSelector('[data-testid="upload-result"]');
    const result = await tauriPage.textContent('[data-testid="upload-result"]');
    expect(result).toContain('test.txt');
    expect(result).toContain('bytes');
  });

  test('dialog handling — alert, confirm, prompt', async ({ tauriPage }) => {
    // Install dialog handler
    await (tauriPage as any).installDialogHandler({
      defaultConfirm: true,
      defaultPromptText: 'Claude',
    });

    // Trigger alert
    await tauriPage.click('[data-testid="btn-alert"]');
    await tauriPage.waitForSelector('[data-testid="dialog-result"]');

    let dialogs = await (tauriPage as any).getDialogs();
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    expect(dialogs[0].type).toBe('alert');
    expect(dialogs[0].message).toContain('Hello from alert');

    let result = await tauriPage.textContent('[data-testid="dialog-result"]');
    expect(result).toContain('alert fired');

    // Trigger confirm (auto-returns true)
    await (tauriPage as any).clearDialogs();
    await tauriPage.click('[data-testid="btn-confirm"]');
    await tauriPage.waitForFunction(
      "document.querySelector('[data-testid=\"dialog-result\"]')?.textContent?.includes('confirm')"
    );

    dialogs = await (tauriPage as any).getDialogs();
    expect(dialogs.some((d: any) => d.type === 'confirm')).toBe(true);

    result = await tauriPage.textContent('[data-testid="dialog-result"]');
    expect(result).toContain('confirm: true');

    // Trigger prompt (auto-returns 'Claude')
    await (tauriPage as any).clearDialogs();
    await tauriPage.click('[data-testid="btn-prompt"]');
    await tauriPage.waitForFunction(
      "document.querySelector('[data-testid=\"dialog-result\"]')?.textContent?.includes('prompt')"
    );

    dialogs = await (tauriPage as any).getDialogs();
    expect(dialogs.some((d: any) => d.type === 'prompt')).toBe(true);

    result = await tauriPage.textContent('[data-testid="dialog-result"]');
    expect(result).toContain('prompt: Claude');
  });

  test('network mocking — route and intercept fetch', async ({ tauriPage }) => {
    // Install a mock route
    await (tauriPage as any).route('/api/data', {
      status: 200,
      body: JSON.stringify({ items: ['mocked-item-1', 'mocked-item-2'] }),
      contentType: 'application/json',
    });

    // Make a fetch call from the webview and verify it's intercepted
    const result = await tauriPage.evaluate<{ items: string[] }>(
      "fetch('/api/data').then(r => r.json())"
    );
    expect(result.items).toEqual(['mocked-item-1', 'mocked-item-2']);

    // Check captured network requests
    const requests = await (tauriPage as any).getNetworkRequests();
    const apiCall = requests.find((r: any) => r.url.includes('/api/data'));
    expect(apiCall).toBeTruthy();
    expect(apiCall.method).toBe('GET');

    // Mock a different status
    await (tauriPage as any).route('/api/error', {
      status: 500,
      body: JSON.stringify({ error: 'Server Error' }),
    });
    const errorResult = await tauriPage.evaluate<number>(
      "fetch('/api/error').then(r => r.status)"
    );
    expect(errorResult).toBe(500);

    // Remove route
    await (tauriPage as any).unroute('/api/data');

    // Clean up
    await (tauriPage as any).clearRoutes();
    await (tauriPage as any).clearNetworkRequests();
  });

  test('drag and drop', async ({ tauriPage }) => {
    // Verify drop target starts empty
    const before = await tauriPage.textContent('[data-testid="drop-target"]');
    expect(before).toContain('Drop here');

    // Perform drag and drop
    await (tauriPage as any).dragAndDrop(
      '[data-testid="drag-source"]',
      '[data-testid="drop-target"]',
    );

    // Check result
    await tauriPage.waitForFunction(
      "document.querySelector('[data-testid=\"drag-result\"]')?.textContent?.includes('Dropped')"
    );
    const after = await tauriPage.textContent('[data-testid="drag-result"]');
    expect(after).toContain('Dropped');
  });
});
