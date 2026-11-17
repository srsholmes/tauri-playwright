import { describe, it, expect, vi } from 'vitest';
import type { TestInfo } from '@playwright/test';
import { createTauriTest } from './fixture.js';
import type { TauriTestConfig } from './types.js';

// Hand back the fixture definitions so the tests can call them directly
vi.mock('@playwright/test', () => ({
  test: { extend: (fixtures: unknown) => fixtures },
  expect: { extend: () => ({}) },
  chromium: {},
}));

type FixtureFn = (args: object, use: () => Promise<void>, testInfo: TestInfo) => Promise<void>;

function fixturesFor(config: TauriTestConfig) {
  return createTauriTest(config).test as unknown as {
    mode: [string, { option: boolean }];
    tauriPage: FixtureFn;
  };
}

/** Records which fixtures a fixture function asks Playwright for. */
function trackRequests(values: Record<string, unknown>) {
  const requested: string[] = [];
  const args = new Proxy(values, {
    get(target, key) {
      if (typeof key === 'string') requested.push(key);
      return target[key as string];
    },
  });
  return { args, requested };
}

describe('createTauriTest', () => {
  it('defaults to browser mode', () => {
    expect(fixturesFor({ devUrl: '' }).mode[0]).toBe('browser');
  });

  it('uses the configured mode as the default', () => {
    expect(fixturesFor({ devUrl: '', mode: 'tauri' }).mode[0]).toBe('tauri');
  });

  it('asks for page when browser mode is possible', async () => {
    const page = {
      addInitScript: vi.fn(async () => {}),
      goto: vi.fn(async () => {}),
      waitForLoadState: vi.fn(async () => {}),
    };
    const { args, requested } = trackRequests({ page, mode: 'browser' });

    await fixturesFor({ devUrl: 'http://localhost:1420' }).tauriPage(
      args,
      async () => {},
      {} as TestInfo,
    );

    expect(requested).toContain('page');
    expect(page.goto).toHaveBeenCalledWith('http://localhost:1420');
  });

  it.each(['tauri', 'cdp'] as const)(
    'skips page and rules out browser mode when set to %s',
    async (mode) => {
      const { args, requested } = trackRequests({ mode: 'browser' });

      await expect(
        fixturesFor({ devUrl: '', mode }).tauriPage(args, async () => {}, {} as TestInfo),
      ).rejects.toThrow(`createTauriTest() has mode: '${mode}'`);
      expect(requested).not.toContain('page');
    },
  );
});
