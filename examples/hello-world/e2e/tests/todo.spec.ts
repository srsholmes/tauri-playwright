import { test, expect } from '../fixtures';

test.describe('Todo List', () => {
  test('starts empty', async ({ tauriPage }) => {
    await expect(tauriPage.locator('[data-testid="todo-empty"]')).toBeVisible();
    await expect(tauriPage.locator('[data-testid="todo-count"]')).toContainText('0 items');
  });

  test('adds items', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="todo-input"]', 'Buy groceries');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    await expect(tauriPage.locator('[data-testid="todo-item-0"]')).toContainText('Buy groceries');
    await expect(tauriPage.locator('[data-testid="todo-count"]')).toContainText('1 item');
    await expect(tauriPage.locator('[data-testid="todo-empty"]')).not.toBeVisible();
  });

  test('adds multiple items', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="todo-input"]', 'First');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    await tauriPage.fill('[data-testid="todo-input"]', 'Second');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    await tauriPage.fill('[data-testid="todo-input"]', 'Third');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    await expect(tauriPage.locator('[data-testid="todo-count"]')).toContainText('3 items');
    await expect(tauriPage.locator('[data-testid="todo-item-0"]')).toContainText('First');
    await expect(tauriPage.locator('[data-testid="todo-item-1"]')).toContainText('Second');
    await expect(tauriPage.locator('[data-testid="todo-item-2"]')).toContainText('Third');
  });

  test('removes items', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="todo-input"]', 'Remove me');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    await expect(tauriPage.locator('[data-testid="todo-item-0"]')).toBeVisible();

    await tauriPage.click('[data-testid="btn-remove-0"]');

    await expect(tauriPage.locator('[data-testid="todo-empty"]')).toBeVisible();
    await expect(tauriPage.locator('[data-testid="todo-count"]')).toContainText('0 items');
  });

  test('adds via Enter key', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="todo-input"]', 'Enter item');
    await tauriPage.press('[data-testid="todo-input"]', 'Enter');

    await expect(tauriPage.locator('[data-testid="todo-item-0"]')).toContainText('Enter item');
  });

  test('does not add empty items', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="todo-input"]', '   ');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    await expect(tauriPage.locator('[data-testid="todo-empty"]')).toBeVisible();
    await expect(tauriPage.locator('[data-testid="todo-count"]')).toContainText('0 items');
  });

  test('clears input after adding', async ({ tauriPage }) => {
    await tauriPage.fill('[data-testid="todo-input"]', 'Some item');
    await tauriPage.click('[data-testid="btn-add-todo"]');

    await expect(tauriPage.locator('[data-testid="todo-input"]')).toHaveValue('');
  });
});
