import { describe, it, expect as vitestExpect, vi } from 'vitest';
import { tauriExpect, type LocatorLike } from './expect.js';

function createFakeLocator(overrides: Partial<LocatorLike> = {}): LocatorLike {
  return {
    isVisible: vi.fn(async () => true),
    isHidden: vi.fn(async () => false),
    isEnabled: vi.fn(async () => true),
    isDisabled: vi.fn(async () => false),
    isEditable: vi.fn(async () => true),
    isChecked: vi.fn(async () => false),
    textContent: vi.fn(async () => 'Hello World'),
    innerText: vi.fn(async () => 'Hello World'),
    inputValue: vi.fn(async () => ''),
    getAttribute: vi.fn(async () => null),
    count: vi.fn(async () => 1),
    ...overrides,
  };
}

describe('tauriExpect matchers', () => {
  // ── State assertions ──────────────────────────────────────────────

  describe('toBeVisible', () => {
    it('passes when element is visible', async () => {
      const loc = createFakeLocator({ isVisible: vi.fn(async () => true) });
      await tauriExpect(loc).toBeVisible();
    });

    it('fails when element is not visible', async () => {
      const loc = createFakeLocator({ isVisible: vi.fn(async () => false) });
      await vitestExpect(
        tauriExpect(loc).toBeVisible({ timeout: 200 })
      ).rejects.toThrow();
    });

    it('.not.toBeVisible passes when hidden', async () => {
      const loc = createFakeLocator({ isVisible: vi.fn(async () => false) });
      await tauriExpect(loc).not.toBeVisible({ timeout: 200 });
    });
  });

  describe('toBeHidden', () => {
    it('passes when element is hidden', async () => {
      const loc = createFakeLocator({ isHidden: vi.fn(async () => true) });
      await tauriExpect(loc).toBeHidden();
    });
  });

  describe('toBeEnabled', () => {
    it('passes when enabled', async () => {
      const loc = createFakeLocator({ isEnabled: vi.fn(async () => true) });
      await tauriExpect(loc).toBeEnabled();
    });
  });

  describe('toBeDisabled', () => {
    it('passes when disabled', async () => {
      const loc = createFakeLocator({ isDisabled: vi.fn(async () => true) });
      await tauriExpect(loc).toBeDisabled();
    });
  });

  describe('toBeEditable', () => {
    it('passes when editable', async () => {
      const loc = createFakeLocator({ isEditable: vi.fn(async () => true) });
      await tauriExpect(loc).toBeEditable();
    });
  });

  describe('toBeChecked', () => {
    it('passes when checked', async () => {
      const loc = createFakeLocator({ isChecked: vi.fn(async () => true) });
      await tauriExpect(loc).toBeChecked();
    });

    it('fails when not checked', async () => {
      const loc = createFakeLocator({ isChecked: vi.fn(async () => false) });
      await vitestExpect(
        tauriExpect(loc).toBeChecked({ timeout: 200 })
      ).rejects.toThrow();
    });
  });

  describe('toBeAttached', () => {
    it('passes when count > 0', async () => {
      const loc = createFakeLocator({ count: vi.fn(async () => 1) });
      await tauriExpect(loc).toBeAttached();
    });

    it('fails when count is 0', async () => {
      const loc = createFakeLocator({ count: vi.fn(async () => 0) });
      await vitestExpect(
        tauriExpect(loc).toBeAttached({ timeout: 200 })
      ).rejects.toThrow();
    });
  });

  describe('toBeEmpty', () => {
    it('passes when inputValue is empty', async () => {
      const loc = createFakeLocator({ inputValue: vi.fn(async () => '') });
      await tauriExpect(loc).toBeEmpty();
    });

    it('fails when inputValue has content', async () => {
      const loc = createFakeLocator({ inputValue: vi.fn(async () => 'not empty') });
      await vitestExpect(
        tauriExpect(loc).toBeEmpty({ timeout: 200 })
      ).rejects.toThrow();
    });
  });

  // ── Content assertions ────────────────────────────────────────────

  describe('toContainText', () => {
    it('passes when text contains substring', async () => {
      const loc = createFakeLocator({ textContent: vi.fn(async () => 'Hello World') });
      await tauriExpect(loc).toContainText('World');
    });

    it('fails when text does not contain substring', async () => {
      const loc = createFakeLocator({ textContent: vi.fn(async () => 'Hello') });
      await vitestExpect(
        tauriExpect(loc).toContainText('Missing', { timeout: 200 })
      ).rejects.toThrow();
    });

    it('supports regex', async () => {
      const loc = createFakeLocator({ textContent: vi.fn(async () => 'Hello World') });
      await tauriExpect(loc).toContainText(/world/i);
    });

    it('.not.toContainText works', async () => {
      const loc = createFakeLocator({ textContent: vi.fn(async () => 'Hello') });
      await tauriExpect(loc).not.toContainText('Missing', { timeout: 200 });
    });
  });

  describe('toHaveText', () => {
    it('passes on exact match (trimmed)', async () => {
      const loc = createFakeLocator({ textContent: vi.fn(async () => '  Hello  ') });
      await tauriExpect(loc).toHaveText('Hello');
    });

    it('supports regex', async () => {
      const loc = createFakeLocator({ textContent: vi.fn(async () => 'Hello World') });
      await tauriExpect(loc).toHaveText(/^Hello World$/);
    });
  });

  describe('toHaveValue', () => {
    it('passes on exact match', async () => {
      const loc = createFakeLocator({ inputValue: vi.fn(async () => 'test') });
      await tauriExpect(loc).toHaveValue('test');
    });

    it('supports regex', async () => {
      const loc = createFakeLocator({ inputValue: vi.fn(async () => 'abc123') });
      await tauriExpect(loc).toHaveValue(/\d+/);
    });
  });

  // ── Attribute assertions ──────────────────────────────────────────

  describe('toHaveAttribute', () => {
    it('passes when attribute exists with value', async () => {
      const loc = createFakeLocator({ getAttribute: vi.fn(async () => 'text') });
      await tauriExpect(loc).toHaveAttribute('type', 'text');
    });

    it('passes when just checking existence', async () => {
      const loc = createFakeLocator({ getAttribute: vi.fn(async () => 'anything') });
      await tauriExpect(loc).toHaveAttribute('type');
    });

    it('fails when attribute is null', async () => {
      const loc = createFakeLocator({ getAttribute: vi.fn(async () => null) });
      await vitestExpect(
        tauriExpect(loc).toHaveAttribute('missing', undefined, { timeout: 200 })
      ).rejects.toThrow();
    });

    it('supports regex value', async () => {
      const loc = createFakeLocator({ getAttribute: vi.fn(async () => 'my-class-name') });
      await tauriExpect(loc).toHaveAttribute('class', /my-class/);
    });
  });

  describe('toHaveClass', () => {
    it('passes when class list includes class', async () => {
      const loc = createFakeLocator({ getAttribute: vi.fn(async () => 'btn primary active') });
      await tauriExpect(loc).toHaveClass('primary');
    });

    it('supports regex', async () => {
      const loc = createFakeLocator({ getAttribute: vi.fn(async () => 'btn-large') });
      await tauriExpect(loc).toHaveClass(/btn/);
    });
  });

  describe('toHaveId', () => {
    it('passes on exact match', async () => {
      const loc = createFakeLocator({ getAttribute: vi.fn(async () => 'main-heading') });
      await tauriExpect(loc).toHaveId('main-heading');
    });
  });

  // ── Collection assertions ─────────────────────────────────────────

  describe('toHaveCount', () => {
    it('passes when count matches', async () => {
      const loc = createFakeLocator({ count: vi.fn(async () => 5) });
      await tauriExpect(loc).toHaveCount(5);
    });

    it('fails when count differs', async () => {
      const loc = createFakeLocator({ count: vi.fn(async () => 3) });
      await vitestExpect(
        tauriExpect(loc).toHaveCount(5, { timeout: 200 })
      ).rejects.toThrow();
    });

    it('.not.toHaveCount works', async () => {
      const loc = createFakeLocator({ count: vi.fn(async () => 3) });
      await tauriExpect(loc).not.toHaveCount(5, { timeout: 200 });
    });
  });

  // ── Polling behavior ──────────────────────────────────────────────

  describe('polling', () => {
    it('retries until condition is met', async () => {
      let callCount = 0;
      const loc = createFakeLocator({
        isVisible: vi.fn(async () => {
          callCount++;
          return callCount >= 3;
        }),
      });
      await tauriExpect(loc).toBeVisible({ timeout: 2000 });
      vitestExpect(callCount).toBeGreaterThanOrEqual(3);
    });

    it('respects timeout', async () => {
      const start = Date.now();
      const loc = createFakeLocator({ isVisible: vi.fn(async () => false) });
      await vitestExpect(
        tauriExpect(loc).toBeVisible({ timeout: 300 })
      ).rejects.toThrow();
      const elapsed = Date.now() - start;
      vitestExpect(elapsed).toBeGreaterThanOrEqual(250);
      vitestExpect(elapsed).toBeLessThan(1000);
    });
  });
});
