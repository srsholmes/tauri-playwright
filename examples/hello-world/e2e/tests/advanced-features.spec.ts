import { test, expect } from '../fixtures';
import { Buffer } from 'node:buffer';

test.describe('Advanced Features', () => {
  test('file upload — setInputFiles', async ({ tauriPage }) => {
    // Create a fake file
    const content = Buffer.from('Hello, this is a test file!');
    const fileCount = await tauriPage.setInputFiles('[data-testid="file-input"]', [
      { name: 'test.txt', mimeType: 'text/plain', buffer: content },
    ]);
    expect(fileCount).toBe(1);

    // Wait for React to update
    await tauriPage.waitForSelector('[data-testid="upload-result"]');
    const result = await tauriPage.textContent('[data-testid="upload-result"]');
    expect(result).toContain('test.txt');
    expect(result).toContain('bytes');
  });

  test('dialog handling — alert, confirm, prompt', async ({ tauriPage }) => {
    // Install dialog handler
    await tauriPage.installDialogHandler({
      defaultConfirm: true,
      defaultPromptText: 'Claude',
    });

    // Trigger alert
    await tauriPage.click('[data-testid="btn-alert"]');
    await tauriPage.waitForSelector('[data-testid="dialog-result"]');

    let dialogs = await tauriPage.getDialogs();
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    expect(dialogs[0].type).toBe('alert');
    expect(dialogs[0].message).toContain('Hello from alert');

    let result = await tauriPage.textContent('[data-testid="dialog-result"]');
    expect(result).toContain('alert fired');

    // Trigger confirm (auto-returns true)
    await tauriPage.clearDialogs();
    await tauriPage.click('[data-testid="btn-confirm"]');
    await tauriPage.waitForFunction(
      "document.querySelector('[data-testid=\"dialog-result\"]')?.textContent?.includes('confirm')",
    );

    dialogs = await tauriPage.getDialogs();
    expect(dialogs.some((d: any) => d.type === 'confirm')).toBe(true);

    result = await tauriPage.textContent('[data-testid="dialog-result"]');
    expect(result).toContain('confirm: true');

    // Trigger prompt (auto-returns 'Claude')
    await tauriPage.clearDialogs();
    await tauriPage.click('[data-testid="btn-prompt"]');
    await tauriPage.waitForFunction(
      "document.querySelector('[data-testid=\"dialog-result\"]')?.textContent?.includes('prompt')",
    );

    dialogs = await tauriPage.getDialogs();
    expect(dialogs.some((d: any) => d.type === 'prompt')).toBe(true);

    result = await tauriPage.textContent('[data-testid="dialog-result"]');
    expect(result).toContain('prompt: Claude');
  });

  test('network mocking — mock API response shown in UI', async ({ tauriPage }) => {
    // The app has a "Fetch Users" button that calls GET /api/users.
    // No real server exists — mock it so the UI renders the mocked data.

    await tauriPage.route('/api/users', {
      status: 200,
      body: JSON.stringify({ users: ['Alice', 'Bob', 'Charlie'] }),
      contentType: 'application/json',
    });

    // Click the Fetch Users button in the UI
    await tauriPage.click('[data-testid="btn-fetch-api"]');

    // Wait for the list to appear with mocked data
    await tauriPage.waitForSelector('[data-testid="api-list"]');

    // Assert each mocked user appears in the UI
    const user0 = await tauriPage.textContent('[data-testid="api-user-0"]');
    expect(user0).toBe('Alice');

    const user1 = await tauriPage.textContent('[data-testid="api-user-1"]');
    expect(user1).toBe('Bob');

    const user2 = await tauriPage.textContent('[data-testid="api-user-2"]');
    expect(user2).toBe('Charlie');

    // Verify all 3 items rendered
    const allUsers = await tauriPage.allTextContents('[data-testid^="api-user-"]');
    expect(allUsers).toEqual(['Alice', 'Bob', 'Charlie']);

    // Check captured network requests include our call
    const requests = await tauriPage.getNetworkRequests();
    const apiCall = requests.find((r: any) => r.url.includes('/api/users'));
    expect(apiCall).toBeTruthy();
    expect(apiCall.method).toBe('GET');

    // Now mock an error response and verify the UI shows the error
    await tauriPage.clearRoutes();
    await tauriPage.route('/api/users', {
      status: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    });

    await tauriPage.click('[data-testid="btn-fetch-api"]');
    await tauriPage.waitForSelector('[data-testid="api-error"]');

    const errorText = await tauriPage.textContent('[data-testid="api-error"]');
    expect(errorText).toContain('500');

    // Clean up
    await tauriPage.clearRoutes();
    await tauriPage.clearNetworkRequests();
  });

  test('drag and drop', async ({ tauriPage }) => {
    // Verify drop target starts empty
    const before = await tauriPage.textContent('[data-testid="drop-target"]');
    expect(before).toContain('Drop here');

    // Perform drag and drop
    await tauriPage.dragAndDrop('[data-testid="drag-source"]', '[data-testid="drop-target"]');

    // Check result
    await tauriPage.waitForFunction(
      "document.querySelector('[data-testid=\"drag-result\"]')?.textContent?.includes('Dropped')",
    );
    const after = await tauriPage.textContent('[data-testid="drag-result"]');
    expect(after).toContain('Dropped');
  });
});
