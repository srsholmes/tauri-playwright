import { test, expect } from '../fixtures';

test.describe('Kitchen Sink — Full Tauri E2E', () => {

  test('page info and content', async ({ tauriPage }) => {
    const title = await tauriPage.title();
    expect(title).toContain('Hello World');

    const url = await tauriPage.url();
    expect(url).toContain('localhost');

    const html = await tauriPage.content();
    expect(html).toContain('data-testid="app"');
    expect(html).toContain('</html>');
  });

  test('heading and section visibility', async ({ tauriPage }) => {
    const heading = await tauriPage.textContent('[data-testid="heading"]');
    expect(heading).toContain('Hello, Tauri Playwright!');

    // innerHTML gives us the raw HTML
    const headingHtml = await tauriPage.innerHTML('[data-testid="heading"]');
    expect(headingHtml).toBe('Hello, Tauri Playwright!');

    // All sections should be visible
    for (const section of ['counter-section', 'greet-section', 'todo-section', 'modal-section']) {
      const visible = await tauriPage.isVisible(`[data-testid="${section}"]`);
      expect(visible).toBe(true);
    }

    // Modal should be hidden
    const modalHidden = await tauriPage.isHidden('[data-testid="modal"]');
    expect(modalHidden).toBe(true);
  });

  test('counter — increment, decrement, reset', async ({ tauriPage }) => {
    let count = await tauriPage.textContent('[data-testid="counter-value"]');
    expect(count).toContain('Count: 0');

    // Increment 3 times
    await tauriPage.click('[data-testid="btn-increment"]');
    await tauriPage.click('[data-testid="btn-increment"]');
    await tauriPage.click('[data-testid="btn-increment"]');
    count = await tauriPage.textContent('[data-testid="counter-value"]');
    expect(count).toContain('Count: 3');

    // Decrement once
    await tauriPage.click('[data-testid="btn-decrement"]');
    count = await tauriPage.textContent('[data-testid="counter-value"]');
    expect(count).toContain('Count: 2');

    // Reset
    await tauriPage.click('[data-testid="btn-reset"]');
    count = await tauriPage.textContent('[data-testid="counter-value"]');
    expect(count).toContain('Count: 0');
  });

  test('greet — Tauri IPC round-trip', async ({ tauriPage }) => {
    // Focus and fill the input
    await tauriPage.focus('[data-testid="greet-input"]');
    const editable = await tauriPage.isEditable('[data-testid="greet-input"]');
    expect(editable).toBe(true);

    await tauriPage.fill('[data-testid="greet-input"]', 'Playwright');
    const inputVal = await tauriPage.inputValue('[data-testid="greet-input"]');
    expect(inputVal).toBe('Playwright');

    // Click greet and wait for result
    await tauriPage.click('[data-testid="btn-greet"]');
    await tauriPage.waitForSelector('[data-testid="greet-result"]');

    const greeting = await tauriPage.textContent('[data-testid="greet-result"]');
    expect(greeting).toContain('Hello, Playwright!');
    expect(greeting).toContain('greeted from Rust');

    // innerText should give visible text
    const innerText = await tauriPage.innerText('[data-testid="greet-result"]');
    expect(innerText).toContain('Hello, Playwright!');

    // Test greet via Enter key
    await tauriPage.fill('[data-testid="greet-input"]', 'Enter Key');
    await tauriPage.press('[data-testid="greet-input"]', 'Enter');
    await tauriPage.waitForFunction(
      "document.querySelector('[data-testid=\"greet-result\"]')?.textContent?.includes('Enter Key')"
    );
    const greeting2 = await tauriPage.textContent('[data-testid="greet-result"]');
    expect(greeting2).toContain('Hello, Enter Key!');
  });

  test('todo list — add, count, remove', async ({ tauriPage }) => {
    // Starts empty
    const emptyMsg = await tauriPage.isVisible('[data-testid="todo-empty"]');
    expect(emptyMsg).toBe(true);

    const todoCount = await tauriPage.textContent('[data-testid="todo-count"]');
    expect(todoCount).toContain('0 items');

    // Add three items
    await tauriPage.fill('[data-testid="todo-input"]', 'Write tests');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    await tauriPage.fill('[data-testid="todo-input"]', 'Fix bugs');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    await tauriPage.fill('[data-testid="todo-input"]', 'Ship it');
    await tauriPage.press('[data-testid="todo-input"]', 'Enter');

    // Check count and individual items
    const countAfter = await tauriPage.textContent('[data-testid="todo-count"]');
    expect(countAfter).toContain('3 items');

    // allTextContents: get all todo item texts at once
    const allItems = await tauriPage.allTextContents('[data-testid^="todo-item-"]');
    expect(allItems.length).toBe(3);
    expect(allItems[0]).toContain('Write tests');
    expect(allItems[1]).toContain('Fix bugs');
    expect(allItems[2]).toContain('Ship it');

    // Count elements matching selector
    const itemCount = await tauriPage.count('[data-testid^="todo-item-"]');
    expect(itemCount).toBe(3);

    // Empty message should be hidden now
    const emptyHidden = await tauriPage.isHidden('[data-testid="todo-empty"]');
    expect(emptyHidden).toBe(true);

    // Remove the middle item
    await tauriPage.click('[data-testid="btn-remove-1"]');
    const countAfterRemove = await tauriPage.textContent('[data-testid="todo-count"]');
    expect(countAfterRemove).toContain('2 items');

    // Input should be cleared after adding
    const inputEmpty = await tauriPage.inputValue('[data-testid="todo-input"]');
    expect(inputEmpty).toBe('');

    // Won't add empty items
    await tauriPage.fill('[data-testid="todo-input"]', '   ');
    await tauriPage.click('[data-testid="btn-add-todo"]');
    const stillTwo = await tauriPage.textContent('[data-testid="todo-count"]');
    expect(stillTwo).toContain('2 items');
  });

  test('modal — open, read, close', async ({ tauriPage }) => {
    // Modal starts hidden
    expect(await tauriPage.isVisible('[data-testid="modal"]')).toBe(false);
    expect(await tauriPage.isVisible('[data-testid="modal-backdrop"]')).toBe(false);

    // Open modal
    await tauriPage.click('[data-testid="btn-open-modal"]');
    await tauriPage.waitForSelector('[data-testid="modal"]');
    expect(await tauriPage.isVisible('[data-testid="modal"]')).toBe(true);

    // Read modal content
    const modalText = await tauriPage.innerText('[data-testid="modal"]');
    expect(modalText).toContain('Modal Title');
    expect(modalText).toContain('modal dialog');

    // Close via button
    await tauriPage.click('[data-testid="btn-close-modal"]');
    await tauriPage.waitForFunction(
      "!document.querySelector('[data-testid=\"modal\"]')"
    );
    expect(await tauriPage.isHidden('[data-testid="modal"]')).toBe(true);

    // Open and close via backdrop
    await tauriPage.click('[data-testid="btn-open-modal"]');
    await tauriPage.waitForSelector('[data-testid="modal-backdrop"]');
    // Click the backdrop edge (not center, which would hit the modal content)
    await tauriPage.evaluate("document.querySelector('[data-testid=\"modal-backdrop\"]').click()");
    await tauriPage.waitForFunction(
      "!document.querySelector('[data-testid=\"modal-backdrop\"]')"
    );
    expect(await tauriPage.isHidden('[data-testid="modal-backdrop"]')).toBe(true);
  });

  test('element geometry and attributes', async ({ tauriPage }) => {
    // Bounding box of the heading
    const box = await tauriPage.boundingBox('[data-testid="heading"]');
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(10);

    // Attributes
    const testId = await tauriPage.getAttribute('[data-testid="heading"]', 'data-testid');
    expect(testId).toBe('heading');

    const inputType = await tauriPage.getAttribute('[data-testid="greet-input"]', 'type');
    expect(inputType).toBe('text');

    const placeholder = await tauriPage.getAttribute('[data-testid="greet-input"]', 'placeholder');
    expect(placeholder).toBe('Enter your name');
  });

  test('evaluate — run arbitrary JS in the webview', async ({ tauriPage }) => {
    // Read window dimensions
    const width = await tauriPage.evaluate<number>('window.innerWidth');
    expect(width).toBeGreaterThan(0);

    // Manipulate DOM directly
    await tauriPage.evaluate(
      "document.querySelector('[data-testid=\"heading\"]').style.color = 'red'"
    );
    const color = await tauriPage.evaluate<string>(
      "getComputedStyle(document.querySelector('[data-testid=\"heading\"]')).color"
    );
    expect(color).toContain('255');

    // Reset
    await tauriPage.evaluate(
      "document.querySelector('[data-testid=\"heading\"]').style.color = ''"
    );
  });

  test('native screenshot captures the real window', async ({ tauriPage }) => {
    // Do some interactions first so the screenshot has state
    await tauriPage.click('[data-testid="btn-increment"]');
    await tauriPage.fill('[data-testid="greet-input"]', 'Screenshot');
    await tauriPage.click('[data-testid="btn-greet"]');
    await tauriPage.waitForSelector('[data-testid="greet-result"]');

    const buf = await tauriPage.screenshot();
    expect(buf.length).toBeGreaterThan(10000); // Real PNG, not empty
    expect(buf[0]).toBe(0x89); // PNG magic byte
    expect(buf[1]).toBe(0x50); // 'P'
    expect(buf[2]).toBe(0x4e); // 'N'
    expect(buf[3]).toBe(0x47); // 'G'

    await test.info().attach('final-screenshot', {
      body: buf,
      contentType: 'image/png',
    });
  });

  test('intentional failure — screenshot and video on failure', async ({ tauriPage }) => {
    // Interact to give the video content
    await tauriPage.click('[data-testid="btn-increment"]');
    await tauriPage.click('[data-testid="btn-increment"]');
    await tauriPage.fill('[data-testid="todo-input"]', 'This test will fail');
    await tauriPage.click('[data-testid="btn-add-todo"]');
    await tauriPage.fill('[data-testid="greet-input"]', 'Failure');
    await tauriPage.click('[data-testid="btn-greet"]');
    await tauriPage.waitForSelector('[data-testid="greet-result"]');

    // Take a screenshot before failure for the report
    const buf = await tauriPage.screenshot();
    await test.info().attach('before-failure', {
      body: buf,
      contentType: 'image/png',
    });

    // This assertion will fail
    const heading = await tauriPage.textContent('[data-testid="heading"]');
    expect(heading).toContain('This heading does not exist');
  });
});
