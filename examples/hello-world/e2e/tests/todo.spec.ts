import { test, expect } from '../fixtures';

test.describe('Todo List', () => {
  test('starts empty', async ({ tauriPage }) => {
    expect(await tauriPage.isVisible('[data-testid="todo-empty"]')).toBe(true);
    const count = await tauriPage.textContent('[data-testid="todo-count"]');
    expect(count).toContain('0 items');
  });

  test('adds items', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="todo-input"]', 'Buy groceries');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    const item = await tauriPage.textContent('[data-testid="todo-item-0"]');
    expect(item).toContain('Buy groceries');
    const count = await tauriPage.textContent('[data-testid="todo-count"]');
    expect(count).toContain('1 item');
    expect(await tauriPage.isHidden('[data-testid="todo-empty"]')).toBe(true);
  });

  test('adds multiple items', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="todo-input"]', 'First');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    await tauriPage.fill('[data-testid="todo-input"]', 'Second');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    await tauriPage.fill('[data-testid="todo-input"]', 'Third');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    const count = await tauriPage.textContent('[data-testid="todo-count"]');
    expect(count).toContain('3 items');

    const all = await tauriPage.allTextContents('[data-testid^="todo-item-"]');
    expect(all[0]).toContain('First');
    expect(all[1]).toContain('Second');
    expect(all[2]).toContain('Third');
  });

  test('removes items', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="todo-input"]', 'Remove me');
    await tauriPage.click('[data-testid="btn-add-todo"]');
    expect(await tauriPage.isVisible('[data-testid="todo-item-0"]')).toBe(true);

    await tauriPage.click('[data-testid="btn-remove-0"]');
    expect(await tauriPage.isVisible('[data-testid="todo-empty"]')).toBe(true);
    const count = await tauriPage.textContent('[data-testid="todo-count"]');
    expect(count).toContain('0 items');
  });

  test('adds via Enter key', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="todo-input"]', 'Enter item');
    await tauriPage.press('[data-testid="todo-input"]', 'Enter');

    const item = await tauriPage.textContent('[data-testid="todo-item-0"]');
    expect(item).toContain('Enter item');
  });

  test('does not add empty items', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="todo-input"]', '   ');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    expect(await tauriPage.isVisible('[data-testid="todo-empty"]')).toBe(true);
    const count = await tauriPage.textContent('[data-testid="todo-count"]');
    expect(count).toContain('0 items');
  });

  test('clears input after adding', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="todo-input"]', 'Some item');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    const val = await tauriPage.inputValue('[data-testid="todo-input"]');
    expect(val).toBe('');
  });
});
