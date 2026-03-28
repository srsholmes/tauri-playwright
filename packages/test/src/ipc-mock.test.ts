import { describe, it, expect } from 'vitest';
import { generateIpcMockScript } from './ipc-mock.js';

describe('generateIpcMockScript', () => {
  it('returns a string containing the IIFE wrapper', () => {
    const script = generateIpcMockScript({});
    expect(script).toContain('(function()');
    expect(script).toContain('window.__TAURI_INTERNALS__');
  });

  it('includes mock handlers', () => {
    const script = generateIpcMockScript({
      greet: (args) => `Hello, ${(args as Record<string, unknown>)?.name}!`,
    });
    expect(script).toContain('greet');
    expect(script).toContain('mockHandlers');
  });

  it('serializes handler functions as strings', () => {
    const handler = (args?: Record<string, unknown>) => (args?.value as number) * 2;
    const script = generateIpcMockScript({ double: handler });
    expect(script).toContain('double');
    expect(script).toContain(handler.toString());
  });

  it('includes call tracking globals', () => {
    const script = generateIpcMockScript({});
    expect(script).toContain('__TAURI_MOCK_CALLS__');
    expect(script).toContain('__TAURI_GET_MOCK_CALLS__');
    expect(script).toContain('__TAURI_CLEAR_MOCK_CALLS__');
  });

  it('includes event emission helper', () => {
    const script = generateIpcMockScript({});
    expect(script).toContain('__TAURI_EMIT_MOCK_EVENT__');
    expect(script).toContain('__TAURI_MOCK_LISTENERS__');
  });

  it('handles event plugin commands', () => {
    const script = generateIpcMockScript({});
    expect(script).toContain('plugin:event|listen');
    expect(script).toContain('plugin:event|unlisten');
  });

  it('includes convertFileSrc passthrough', () => {
    const script = generateIpcMockScript({});
    expect(script).toContain('convertFileSrc');
  });

  it('includes metadata with window labels', () => {
    const script = generateIpcMockScript({});
    expect(script).toContain('currentWindow');
    expect(script).toContain('"main"');
  });

  it('handles empty mocks', () => {
    const script = generateIpcMockScript({});
    expect(script).toContain('var mockHandlers = {');
    expect(script).not.toContain('undefined');
  });

  it('handles multiple handlers', () => {
    const script = generateIpcMockScript({
      greet: () => 'hello',
      search: () => [],
      save: () => true,
    });
    expect(script).toContain('"greet"');
    expect(script).toContain('"search"');
    expect(script).toContain('"save"');
  });

  it('injects context variables as var declarations', () => {
    const USERS = [{ id: 1, name: 'Alice' }];
    const script = generateIpcMockScript(
      { get_users: () => USERS },
      { USERS },
    );
    expect(script).toContain('var USERS = [{"id":1,"name":"Alice"}]');
  });

  it('context variables appear before mockHandlers', () => {
    const script = generateIpcMockScript(
      { get_items: () => ITEMS },
      { ITEMS: ['a', 'b'] },
    );
    const contextPos = script.indexOf('var ITEMS =');
    const handlersPos = script.indexOf('var mockHandlers =');
    expect(contextPos).toBeGreaterThan(-1);
    expect(handlersPos).toBeGreaterThan(contextPos);
  });

  it('works without context', () => {
    const script = generateIpcMockScript({ ping: () => 'pong' });
    expect(script).toContain('"ping"');
    expect(script).not.toContain('undefined');
  });

  it('handles multiple context variables', () => {
    const script = generateIpcMockScript(
      {},
      { FOO: 'bar', COUNT: 42, DATA: { nested: true } },
    );
    expect(script).toContain('var FOO = "bar"');
    expect(script).toContain('var COUNT = 42');
    expect(script).toContain('var DATA = {"nested":true}');
  });
});
