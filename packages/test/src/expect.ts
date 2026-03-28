import { expect as baseExpect } from '@playwright/test';

/**
 * Poll a function until the check passes or timeout.
 */
async function pollUntil<T>(
  fn: () => Promise<T>,
  check: (value: T) => boolean,
  timeout: number,
  interval = 100,
): Promise<{ pass: boolean; value: T }> {
  const deadline = Date.now() + timeout;
  let lastValue: T = undefined as T;
  while (Date.now() < deadline) {
    try {
      lastValue = await fn();
      if (check(lastValue)) return { pass: true, value: lastValue };
    } catch {
      // Element might not exist yet — keep polling
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  return { pass: false, value: lastValue };
}

/**
 * Any object with TauriLocator/BrowserLocatorAdapter-compatible methods.
 */
export interface LocatorLike {
  isVisible(): Promise<boolean>;
  isHidden(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  isDisabled(): Promise<boolean>;
  isEditable(): Promise<boolean>;
  isChecked(): Promise<boolean>;
  isFocused?(): Promise<boolean>;
  textContent(): Promise<string | null>;
  innerText(): Promise<string>;
  inputValue(): Promise<string>;
  getAttribute(name: string): Promise<string | null>;
  count(): Promise<number>;
}

/**
 * Page-like object for page-level assertions (toHaveURL, toHaveTitle).
 */
export interface PageLike {
  url(): Promise<string>;
  title(): Promise<string>;
}

const DEFAULT_TIMEOUT = 5000;

function getTimeout(options?: { timeout?: number }): number {
  return options?.timeout ?? DEFAULT_TIMEOUT;
}

/**
 * Extended expect with Playwright-style locator assertions.
 *
 * Usage:
 * ```ts
 * await expect(locator).toBeVisible();
 * await expect(locator).toContainText('Hello');
 * await expect(locator).not.toBeVisible();
 * ```
 */
export const tauriExpect = baseExpect.extend({
  // ── State assertions ──────────────────────────────────────────────

  async toBeVisible(locator: LocatorLike, options?: { timeout?: number }) {
    const assertionName = 'toBeVisible';
    const timeout = getTimeout(options);
    const { pass } = await pollUntil(() => locator.isVisible(), (v) => v === true, timeout);
    return {
      pass,
      name: assertionName,
      message: () =>
        this.isNot
          ? `expected element not to be visible`
          : `expected element to be visible within ${timeout}ms`,
    };
  },

  async toBeHidden(locator: LocatorLike, options?: { timeout?: number }) {
    const timeout = getTimeout(options);
    const { pass } = await pollUntil(() => locator.isHidden(), (v) => v === true, timeout);
    return {
      pass,
      name: 'toBeHidden',
      message: () =>
        this.isNot
          ? `expected element not to be hidden`
          : `expected element to be hidden within ${timeout}ms`,
    };
  },

  async toBeEnabled(locator: LocatorLike, options?: { timeout?: number }) {
    const timeout = getTimeout(options);
    const { pass } = await pollUntil(() => locator.isEnabled(), (v) => v === true, timeout);
    return {
      pass,
      name: 'toBeEnabled',
      message: () =>
        this.isNot
          ? `expected element not to be enabled`
          : `expected element to be enabled within ${timeout}ms`,
    };
  },

  async toBeDisabled(locator: LocatorLike, options?: { timeout?: number }) {
    const timeout = getTimeout(options);
    const { pass } = await pollUntil(() => locator.isDisabled(), (v) => v === true, timeout);
    return {
      pass,
      name: 'toBeDisabled',
      message: () =>
        this.isNot
          ? `expected element not to be disabled`
          : `expected element to be disabled within ${timeout}ms`,
    };
  },

  async toBeEditable(locator: LocatorLike, options?: { timeout?: number }) {
    const timeout = getTimeout(options);
    const { pass } = await pollUntil(() => locator.isEditable(), (v) => v === true, timeout);
    return {
      pass,
      name: 'toBeEditable',
      message: () =>
        this.isNot
          ? `expected element not to be editable`
          : `expected element to be editable within ${timeout}ms`,
    };
  },

  async toBeChecked(locator: LocatorLike, options?: { timeout?: number }) {
    const timeout = getTimeout(options);
    const { pass } = await pollUntil(() => locator.isChecked(), (v) => v === true, timeout);
    return {
      pass,
      name: 'toBeChecked',
      message: () =>
        this.isNot
          ? `expected element not to be checked`
          : `expected element to be checked within ${timeout}ms`,
    };
  },

  async toBeAttached(locator: LocatorLike, options?: { timeout?: number }) {
    const timeout = getTimeout(options);
    const { pass } = await pollUntil(() => locator.count(), (c) => c > 0, timeout);
    return {
      pass,
      name: 'toBeAttached',
      message: () =>
        this.isNot
          ? `expected element not to be attached`
          : `expected element to be attached within ${timeout}ms`,
    };
  },

  async toBeEmpty(locator: LocatorLike, options?: { timeout?: number }) {
    const timeout = getTimeout(options);
    const { pass, value } = await pollUntil(
      async () => {
        try {
          return await locator.inputValue();
        } catch {
          return (await locator.textContent()) ?? '';
        }
      },
      (v) => v.trim() === '',
      timeout,
    );
    return {
      pass,
      name: 'toBeEmpty',
      message: () =>
        this.isNot
          ? `expected element not to be empty, got "${value}"`
          : `expected element to be empty, got "${value}"`,
    };
  },

  // ── Content assertions ────────────────────────────────────────────

  async toContainText(
    locator: LocatorLike,
    expected: string | RegExp,
    options?: { timeout?: number },
  ) {
    const timeout = getTimeout(options);
    const { pass, value } = await pollUntil(
      () => locator.textContent(),
      (text) => {
        if (!text) return false;
        return typeof expected === 'string'
          ? text.includes(expected)
          : expected.test(text);
      },
      timeout,
    );
    return {
      pass,
      name: 'toContainText',
      message: () =>
        this.isNot
          ? `expected "${value}" not to contain "${expected}"`
          : `expected "${value}" to contain "${expected}"`,
    };
  },

  async toHaveText(
    locator: LocatorLike,
    expected: string | RegExp,
    options?: { timeout?: number },
  ) {
    const timeout = getTimeout(options);
    const { pass, value } = await pollUntil(
      async () => ((await locator.textContent()) ?? '').trim(),
      (text) => {
        return typeof expected === 'string'
          ? text === expected
          : expected.test(text);
      },
      timeout,
    );
    return {
      pass,
      name: 'toHaveText',
      message: () =>
        this.isNot
          ? `expected "${value}" not to equal "${expected}"`
          : `expected "${value}" to equal "${expected}"`,
    };
  },

  async toHaveValue(
    locator: LocatorLike,
    expected: string | RegExp,
    options?: { timeout?: number },
  ) {
    const timeout = getTimeout(options);
    const { pass, value } = await pollUntil(
      () => locator.inputValue(),
      (val) =>
        typeof expected === 'string' ? val === expected : expected.test(val),
      timeout,
    );
    return {
      pass,
      name: 'toHaveValue',
      message: () =>
        this.isNot
          ? `expected value "${value}" not to be "${expected}"`
          : `expected value "${value}" to be "${expected}"`,
    };
  },

  // ── Attribute/CSS assertions ──────────────────────────────────────

  async toHaveAttribute(
    locator: LocatorLike,
    name: string,
    value?: string | RegExp,
    options?: { timeout?: number },
  ) {
    const timeout = getTimeout(options);
    const { pass, value: actual } = await pollUntil(
      () => locator.getAttribute(name),
      (attr) => {
        if (attr === null) return false;
        if (value === undefined) return true;
        return typeof value === 'string' ? attr === value : value.test(attr);
      },
      timeout,
    );
    return {
      pass,
      name: 'toHaveAttribute',
      message: () =>
        this.isNot
          ? `expected attribute "${name}" not to be "${actual}"`
          : `expected attribute "${name}" to be "${value}", got "${actual}"`,
    };
  },

  async toHaveClass(
    locator: LocatorLike,
    expected: string | RegExp,
    options?: { timeout?: number },
  ) {
    const timeout = getTimeout(options);
    const { pass, value } = await pollUntil(
      () => locator.getAttribute('class'),
      (cls) => {
        if (!cls) return false;
        return typeof expected === 'string'
          ? cls.split(/\s+/).includes(expected)
          : expected.test(cls);
      },
      timeout,
    );
    return {
      pass,
      name: 'toHaveClass',
      message: () =>
        this.isNot
          ? `expected class "${value}" not to contain "${expected}"`
          : `expected class "${value}" to contain "${expected}"`,
    };
  },

  async toHaveId(
    locator: LocatorLike,
    expected: string,
    options?: { timeout?: number },
  ) {
    const timeout = getTimeout(options);
    const { pass, value } = await pollUntil(
      () => locator.getAttribute('id'),
      (id) => id === expected,
      timeout,
    );
    return {
      pass,
      name: 'toHaveId',
      message: () =>
        this.isNot
          ? `expected id "${value}" not to be "${expected}"`
          : `expected id "${value}" to be "${expected}"`,
    };
  },

  // ── Collection assertions ─────────────────────────────────────────

  async toHaveCount(
    locator: LocatorLike,
    expected: number,
    options?: { timeout?: number },
  ) {
    const timeout = getTimeout(options);
    const { pass, value } = await pollUntil(
      () => locator.count(),
      (c) => c === expected,
      timeout,
    );
    return {
      pass,
      name: 'toHaveCount',
      message: () =>
        this.isNot
          ? `expected count ${value} not to be ${expected}`
          : `expected count ${value} to be ${expected}`,
    };
  },

  // ── Focus assertion ───────────────────────────────────────────────

  async toBeFocused(locator: LocatorLike, options?: { timeout?: number }) {
    const timeout = getTimeout(options);
    const fn = locator.isFocused
      ? () => locator.isFocused!()
      : async () => false;
    const { pass } = await pollUntil(fn, (v) => v === true, timeout);
    return {
      pass,
      name: 'toBeFocused',
      message: () =>
        this.isNot
          ? `expected element not to be focused`
          : `expected element to be focused within ${timeout}ms`,
    };
  },

  // ── CSS assertion ─────────────────────────────────────────────────

  async toHaveCSS(
    locator: LocatorLike,
    property: string,
    expected: string | RegExp,
    options?: { timeout?: number },
  ) {
    const timeout = getTimeout(options);
    const { pass, value } = await pollUntil(
      () => locator.getAttribute('style').then(() => {
        // Use evaluate if available, fall back to getAttribute
        if ('evaluate' in locator && typeof (locator as any).evaluate === 'function') {
          return (locator as any).evaluate(`(el) => getComputedStyle(el).getPropertyValue(${JSON.stringify(property)})`) as Promise<string>;
        }
        return Promise.resolve('');
      }),
      (val) => {
        if (!val) return false;
        return typeof expected === 'string' ? val.trim() === expected : expected.test(val);
      },
      timeout,
    );
    return {
      pass,
      name: 'toHaveCSS',
      message: () =>
        this.isNot
          ? `expected CSS "${property}" not to be "${expected}", got "${value}"`
          : `expected CSS "${property}" to be "${expected}", got "${value}"`,
    };
  },

  // ── Page-level assertions ─────────────────────────────────────────

  async toHaveURL(
    page: PageLike,
    expected: string | RegExp,
    options?: { timeout?: number },
  ) {
    const timeout = getTimeout(options);
    const { pass, value } = await pollUntil(
      () => page.url(),
      (url) =>
        typeof expected === 'string' ? url.includes(expected) : expected.test(url),
      timeout,
    );
    return {
      pass,
      name: 'toHaveURL',
      message: () =>
        this.isNot
          ? `expected URL "${value}" not to match "${expected}"`
          : `expected URL "${value}" to match "${expected}"`,
    };
  },

  async toHaveTitle(
    page: PageLike,
    expected: string | RegExp,
    options?: { timeout?: number },
  ) {
    const timeout = getTimeout(options);
    const { pass, value } = await pollUntil(
      () => page.title(),
      (title) =>
        typeof expected === 'string' ? title === expected : expected.test(title),
      timeout,
    );
    return {
      pass,
      name: 'toHaveTitle',
      message: () =>
        this.isNot
          ? `expected title "${value}" not to match "${expected}"`
          : `expected title "${value}" to match "${expected}"`,
    };
  },
});
