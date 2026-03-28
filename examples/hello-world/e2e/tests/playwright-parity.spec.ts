import { test, expect } from '../fixtures';

test.describe('Playwright Parity', () => {

  // ── Locator Assertions (Phase 2) ────────────────────────────────────

  test('expect(locator).toBeVisible / toBeHidden', async ({ tauriPage }) => {
    await expect(tauriPage.locator('[data-testid="heading"]')).toBeVisible();
    await expect(tauriPage.locator('[data-testid="modal"]')).toBeHidden();
    await expect(tauriPage.locator('[data-testid="heading"]')).not.toBeHidden();
  });

  test('expect(locator).toContainText / toHaveText', async ({ tauriPage }) => {
    await expect(tauriPage.locator('[data-testid="heading"]')).toContainText('Tauri Playwright');
    await expect(tauriPage.locator('[data-testid="heading"]')).toHaveText('Hello, Tauri Playwright!');
    await expect(tauriPage.locator('[data-testid="heading"]')).not.toContainText('nonexistent');
  });

  test('expect(locator).toHaveValue', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="greet-input"]', 'test-value');
    await expect(tauriPage.locator('[data-testid="greet-input"]')).toHaveValue('test-value');
    await expect(tauriPage.locator('[data-testid="greet-input"]')).not.toHaveValue('wrong');
  });

  test('expect(locator).toHaveAttribute', async ({ tauriPage }) => {
    await expect(tauriPage.locator('[data-testid="greet-input"]')).toHaveAttribute('type', 'text');
    await expect(tauriPage.locator('[data-testid="greet-input"]')).toHaveAttribute('placeholder', 'Enter your name');
    await expect(tauriPage.locator('[data-testid="greet-input"]')).toHaveAttribute('placeholder'); // just check exists
  });

  test('expect(locator).toHaveCount', async ({ tauriPage }) => {
    await expect(tauriPage.locator('section')).toHaveCount(9); // counter, greet, todo, delayed, api, upload, dialog, drag, modal
    await expect(tauriPage.locator('[data-testid="does-not-exist"]')).toHaveCount(0);
  });

  test('expect(locator).toBeEnabled / toBeDisabled', async ({ tauriPage }) => {
    await expect(tauriPage.locator('[data-testid="btn-increment"]')).toBeEnabled();
    await expect(tauriPage.locator('[data-testid="btn-increment"]')).not.toBeDisabled();
  });

  test('expect(locator).toBeEditable', async ({ tauriPage }) => {
    await expect(tauriPage.locator('[data-testid="greet-input"]')).toBeEditable();
  });

  test('expect(locator).toBeEmpty', async ({ tauriPage }) => {
    // Input starts empty
    await expect(tauriPage.locator('[data-testid="greet-input"]')).toBeEmpty();
    await tauriPage.fill('[data-testid="greet-input"]', 'not empty');
    await expect(tauriPage.locator('[data-testid="greet-input"]')).not.toBeEmpty();
  });

  test('expect(locator) with regex', async ({ tauriPage }) => {
    await expect(tauriPage.locator('[data-testid="heading"]')).toContainText(/tauri/i);
    await expect(tauriPage.locator('[data-testid="heading"]')).toHaveText(/^Hello.*!$/);
  });

  // ── Semantic Selectors (Phase 3) ────────────────────────────────────

  test('getByTestId', async ({ tauriPage }) => {
    const heading = await tauriPage.getByTestId('heading').textContent();
    expect(heading).toContain('Hello, Tauri Playwright!');
  });

  test('getByPlaceholder', async ({ tauriPage }) => {
    await tauriPage.getByPlaceholder('Enter your name').fill('Semantic');
    const val = await tauriPage.getByPlaceholder('Enter your name').inputValue();
    expect(val).toBe('Semantic');
  });

  test('getByText', async ({ tauriPage }) => {
    const locator = tauriPage.getByText('Hello, Tauri Playwright!');
    const visible = await locator.isVisible();
    expect(visible).toBe(true);
  });

  // ── Locator Refinement (Phase 4) ────────────────────────────────────

  test('locator.first / last', async ({ tauriPage }) => {
    const first = await tauriPage.locator('section').first().isVisible();
    expect(first).toBe(true);

    const last = await tauriPage.locator('section').last().isVisible();
    expect(last).toBe(true);
  });

  test('locator.nth', async ({ tauriPage }) => {
    const second = await tauriPage.locator('section').nth(1).isVisible();
    expect(second).toBe(true);
  });

  test('locator.filter with hasText', async ({ tauriPage }) => {
    const counter = tauriPage.locator('section').filter({ hasText: 'Counter' });
    const visible = await counter.isVisible();
    expect(visible).toBe(true);
  });

  test('locator.all', async ({ tauriPage }) => {
    const sections = await tauriPage.locator('section').all();
    expect(sections.length).toBeGreaterThan(3);
  });

  test('locator.clear', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="greet-input"]', 'clear me');
    const loc = tauriPage.locator('[data-testid="greet-input"]');
    await loc.clear();
    const val = await loc.inputValue();
    expect(val).toBe('');
  });

  test('nested locator', async ({ tauriPage }) => {
    const section = tauriPage.locator('[data-testid="counter-section"]');
    const button = section.locator('[data-testid="btn-increment"]');
    const visible = await button.isVisible();
    expect(visible).toBe(true);
  });

  // ── Keyboard & Mouse (Phase 5) ──────────────────────────────────────

  test('keyboard.type into focused input', async ({ tauriPage }) => {
    await tauriPage.focus('[data-testid="greet-input"]');
    await tauriPage.keyboard.type('keyboard-test');
    const val = await tauriPage.inputValue('[data-testid="greet-input"]');
    expect(val).toContain('keyboard-test');
  });

  test('keyboard.press sends Enter', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="greet-input"]', 'KeyboardEnter');
    await tauriPage.focus('[data-testid="greet-input"]');
    await tauriPage.keyboard.press('Enter');
    await tauriPage.waitForSelector('[data-testid="greet-result"]');
    const text = await tauriPage.textContent('[data-testid="greet-result"]');
    expect(text).toContain('Hello, KeyboardEnter!');
  });

  test('mouse.click at coordinates', async ({ tauriPage }) => {
    const box = await tauriPage.boundingBox('[data-testid="btn-increment"]');
    expect(box).not.toBeNull();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;
    await tauriPage.mouse.click(x, y);
    const count = await tauriPage.textContent('[data-testid="counter-value"]');
    expect(count).toContain('Count: 1');
  });
});
