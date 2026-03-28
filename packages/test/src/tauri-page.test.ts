import { describe, it, expect, beforeEach } from 'vitest';
import { TauriPage, TauriLocator, TauriKeyboard, TauriMouse } from './tauri-page.js';
import { createMockClient } from './test-helpers.js';

describe('TauriPage', () => {
  let mock: ReturnType<typeof createMockClient>;
  let page: TauriPage;

  beforeEach(() => {
    mock = createMockClient();
    page = new TauriPage(mock.client);
  });

  // ── Actions ─────────────────────────────────────────────────────────

  describe('actions', () => {
    it('click sends click command with selector and timeout', async () => {
      await page.click('#btn');
      expect(mock.lastCall()).toMatchObject({ type: 'click', selector: '#btn', timeout_ms: 5000 });
    });

    it('click passes custom timeout', async () => {
      await page.click('#btn', { timeout: 1000 });
      expect(mock.lastCall()).toMatchObject({ timeout_ms: 1000 });
    });

    it('dblclick sends dblclick command', async () => {
      await page.dblclick('.target');
      expect(mock.lastCall()).toMatchObject({ type: 'dblclick', selector: '.target' });
    });

    it('hover sends hover command', async () => {
      await page.hover('.item');
      expect(mock.lastCall()).toMatchObject({ type: 'hover', selector: '.item' });
    });

    it('fill sends fill command with text', async () => {
      await page.fill('input', 'hello');
      expect(mock.lastCall()).toMatchObject({ type: 'fill', selector: 'input', text: 'hello' });
    });

    it('type sends type_text command', async () => {
      await page.type('input', 'world');
      expect(mock.lastCall()).toMatchObject({
        type: 'type_text',
        selector: 'input',
        text: 'world',
      });
    });

    it('press sends press command with key', async () => {
      await page.press('input', 'Enter');
      expect(mock.lastCall()).toMatchObject({ type: 'press', selector: 'input', key: 'Enter' });
    });

    it('check sends check command', async () => {
      await page.check('#cb');
      expect(mock.lastCall()).toMatchObject({ type: 'check', selector: '#cb' });
    });

    it('uncheck sends uncheck command', async () => {
      await page.uncheck('#cb');
      expect(mock.lastCall()).toMatchObject({ type: 'uncheck', selector: '#cb' });
    });

    it('selectOption sends select_option with value', async () => {
      mock.setResponse({ data: 'opt1' });
      const result = await page.selectOption('select', 'opt1');
      expect(result).toBe('opt1');
      expect(mock.lastCall()).toMatchObject({ type: 'select_option', value: 'opt1' });
    });

    it('focus sends focus command', async () => {
      await page.focus('input');
      expect(mock.lastCall()).toMatchObject({ type: 'focus', selector: 'input' });
    });

    it('blur sends blur command', async () => {
      await page.blur('input');
      expect(mock.lastCall()).toMatchObject({ type: 'blur', selector: 'input' });
    });

    it('dragAndDrop sends drag_and_drop with source and target', async () => {
      await page.dragAndDrop('#src', '#tgt');
      expect(mock.lastCall()).toMatchObject({
        type: 'drag_and_drop',
        source: '#src',
        target: '#tgt',
      });
    });
  });

  // ── Queries ─────────────────────────────────────────────────────────

  describe('queries', () => {
    it('textContent returns string data', async () => {
      mock.setResponse({ data: 'Hello' });
      const result = await page.textContent('.heading');
      expect(result).toBe('Hello');
      expect(mock.lastCall()).toMatchObject({ type: 'text_content', selector: '.heading' });
    });

    it('innerHTML returns string data', async () => {
      mock.setResponse({ data: '<b>Bold</b>' });
      const result = await page.innerHTML('.content');
      expect(result).toBe('<b>Bold</b>');
    });

    it('innerText returns string data', async () => {
      mock.setResponse({ data: 'Visible text' });
      const result = await page.innerText('.content');
      expect(result).toBe('Visible text');
    });

    it('allTextContents returns array', async () => {
      mock.setResponse({ data: ['a', 'b', 'c'] });
      const result = await page.allTextContents('.item');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('allInnerTexts returns array', async () => {
      mock.setResponse({ data: ['x', 'y'] });
      const result = await page.allInnerTexts('.item');
      expect(result).toEqual(['x', 'y']);
    });

    it('getAttribute returns attribute value', async () => {
      mock.setResponse({ data: 'text' });
      const result = await page.getAttribute('input', 'type');
      expect(result).toBe('text');
      expect(mock.lastCall()).toMatchObject({ type: 'get_attribute', name: 'type' });
    });

    it('inputValue returns string', async () => {
      mock.setResponse({ data: 'hello' });
      const result = await page.inputValue('input');
      expect(result).toBe('hello');
    });

    it('boundingBox returns rect', async () => {
      const box = { x: 10, y: 20, width: 100, height: 50 };
      mock.setResponse({ data: box });
      const result = await page.boundingBox('.el');
      expect(result).toEqual(box);
    });

    it('boundingBox returns null for missing element', async () => {
      mock.setResponse({ data: null });
      const result = await page.boundingBox('.missing');
      expect(result).toBeNull();
    });
  });

  // ── State checks ────────────────────────────────────────────────────

  describe('state checks', () => {
    it('isVisible returns boolean', async () => {
      mock.setResponse({ data: true });
      expect(await page.isVisible('.el')).toBe(true);
    });

    it('isHidden is inverse of isVisible', async () => {
      mock.setResponse({ data: false });
      expect(await page.isHidden('.el')).toBe(true);
    });

    it('isChecked returns boolean', async () => {
      mock.setResponse({ data: true });
      expect(await page.isChecked('#cb')).toBe(true);
    });

    it('isDisabled returns boolean', async () => {
      mock.setResponse({ data: false });
      expect(await page.isDisabled('button')).toBe(false);
    });

    it('isEnabled is inverse of isDisabled', async () => {
      mock.setResponse({ data: true }); // isDisabled returns true
      expect(await page.isEnabled('button')).toBe(false);
    });

    it('isEditable returns boolean', async () => {
      mock.setResponse({ data: true });
      expect(await page.isEditable('input')).toBe(true);
    });
  });

  // ── Page info ───────────────────────────────────────────────────────

  describe('page info', () => {
    it('title returns page title', async () => {
      mock.setResponse({ data: 'My App' });
      expect(await page.title()).toBe('My App');
    });

    it('url returns current URL', async () => {
      mock.setResponse({ data: 'http://localhost:1420' });
      expect(await page.url()).toBe('http://localhost:1420');
    });

    it('content returns full HTML', async () => {
      mock.setResponse({ data: '<html></html>' });
      expect(await page.content()).toBe('<html></html>');
    });

    it('count returns number', async () => {
      mock.setResponse({ data: 5 });
      expect(await page.count('.item')).toBe(5);
    });
  });

  // ── Navigation ──────────────────────────────────────────────────────

  describe('navigation', () => {
    it('goto sends goto command', async () => {
      await page.goto('http://localhost:1420/new');
      expect(mock.lastCall()).toMatchObject({ type: 'goto', url: 'http://localhost:1420/new' });
    });
  });

  // ── Evaluate ────────────────────────────────────────────────────────

  describe('evaluate', () => {
    it('sends eval command and returns result', async () => {
      mock.setResponse({ data: 42 });
      const result = await page.evaluate<number>('1 + 1');
      expect(result).toBe(42);
      expect(mock.lastCall()).toMatchObject({ type: 'eval', script: '1 + 1' });
    });
  });

  // ── Default timeout ─────────────────────────────────────────────────

  describe('setDefaultTimeout', () => {
    it('changes default timeout for all commands', async () => {
      page.setDefaultTimeout(10000);
      await page.click('#btn');
      expect(mock.lastCall()).toMatchObject({ timeout_ms: 10000 });
    });

    it('per-call timeout overrides default', async () => {
      page.setDefaultTimeout(10000);
      await page.click('#btn', { timeout: 500 });
      expect(mock.lastCall()).toMatchObject({ timeout_ms: 500 });
    });
  });

  // ── Error handling ──────────────────────────────────────────────────

  describe('errors', () => {
    it('throws on command failure', async () => {
      mock.setError('not found: #missing');
      await expect(page.click('#missing')).rejects.toThrow(
        "TauriPage command 'click' failed: not found: #missing",
      );
    });
  });

  // ── Semantic selectors ──────────────────────────────────────────────

  describe('semantic selectors', () => {
    it('getByTestId returns locator with data-testid selector', () => {
      const loc = page.getByTestId('heading');
      expect(loc).toBeInstanceOf(TauriLocator);
    });

    it('getByPlaceholder returns locator with placeholder selector', () => {
      const loc = page.getByPlaceholder('Enter name');
      expect(loc).toBeInstanceOf(TauriLocator);
    });

    it('getByPlaceholder exact mode', () => {
      const loc = page.getByPlaceholder('Enter name', { exact: true });
      expect(loc).toBeInstanceOf(TauriLocator);
    });

    it('getByAltText returns locator', () => {
      const loc = page.getByAltText('logo');
      expect(loc).toBeInstanceOf(TauriLocator);
    });

    it('getByTitle returns locator', () => {
      const loc = page.getByTitle('Close');
      expect(loc).toBeInstanceOf(TauriLocator);
    });

    it('getByRole returns locator', () => {
      const loc = page.getByRole('button');
      expect(loc).toBeInstanceOf(TauriLocator);
    });

    it('getByRole with name filter', () => {
      const loc = page.getByRole('button', { name: 'Submit' });
      expect(loc).toBeInstanceOf(TauriLocator);
    });

    it('getByText returns JS-based locator', () => {
      const loc = page.getByText('Hello');
      expect(loc).toBeInstanceOf(TauriLocator);
      expect(loc.isJsBased).toBe(true);
    });

    it('getByLabel returns JS-based locator', () => {
      const loc = page.getByLabel('Email');
      expect(loc).toBeInstanceOf(TauriLocator);
      expect(loc.isJsBased).toBe(true);
    });
  });

  // ── Keyboard / Mouse ───────────────────────────────────────────────

  describe('keyboard', () => {
    it('is a TauriKeyboard instance', () => {
      expect(page.keyboard).toBeInstanceOf(TauriKeyboard);
    });

    it('press sends eval command', async () => {
      await page.keyboard.press('Enter');
      expect(mock.calls.length).toBeGreaterThan(0);
      expect(mock.lastCall()?.type).toBe('eval');
    });

    it('type sends one eval per character', async () => {
      mock.reset();
      await page.keyboard.type('abc');
      expect(mock.calls.length).toBe(3);
    });
  });

  describe('mouse', () => {
    it('is a TauriMouse instance', () => {
      expect(page.mouse).toBeInstanceOf(TauriMouse);
    });

    it('click sends eval with coordinates', async () => {
      await page.mouse.click(100, 200);
      expect(mock.lastCall()?.type).toBe('eval');
      const script = mock.lastCall()?.script as string;
      expect(script).toContain('100');
      expect(script).toContain('200');
    });

    it('wheel sends eval with deltas', async () => {
      await page.mouse.wheel(0, 100);
      const script = mock.lastCall()?.script as string;
      expect(script).toContain('deltaY:100');
    });
  });

  // ── Network mocking ─────────────────────────────────────────────────

  describe('network mocking', () => {
    it('route sends add_network_route command', async () => {
      await page.route('/api/data', { status: 200, body: '[]' });
      expect(mock.lastCall()).toMatchObject({
        type: 'add_network_route',
        pattern: '/api/data',
        status: 200,
        body: '[]',
      });
    });

    it('unroute sends remove_network_route', async () => {
      await page.unroute('/api/data');
      expect(mock.lastCall()).toMatchObject({ type: 'remove_network_route', pattern: '/api/data' });
    });

    it('clearRoutes sends clear_network_routes', async () => {
      await page.clearRoutes();
      expect(mock.lastCall()).toMatchObject({ type: 'clear_network_routes' });
    });

    it('getNetworkRequests returns array', async () => {
      mock.setResponse({ data: [{ url: '/api', method: 'GET', timestamp: 123 }] });
      const reqs = await page.getNetworkRequests();
      expect(reqs).toHaveLength(1);
      expect(reqs[0].url).toBe('/api');
    });
  });

  // ── Dialog handling ─────────────────────────────────────────────────

  describe('dialog handling', () => {
    it('installDialogHandler sends command with defaults', async () => {
      await page.installDialogHandler();
      expect(mock.lastCall()).toMatchObject({
        type: 'install_dialog_handler',
        default_confirm: true,
      });
    });

    it('installDialogHandler with custom options', async () => {
      await page.installDialogHandler({ defaultConfirm: false, defaultPromptText: 'test' });
      expect(mock.lastCall()).toMatchObject({
        default_confirm: false,
        default_prompt_text: 'test',
      });
    });

    it('getDialogs returns array', async () => {
      mock.setResponse({ data: [{ type: 'alert', message: 'hi' }] });
      const dialogs = await page.getDialogs();
      expect(dialogs).toHaveLength(1);
      expect(dialogs[0].type).toBe('alert');
    });

    it('clearDialogs sends command', async () => {
      await page.clearDialogs();
      expect(mock.lastCall()).toMatchObject({ type: 'clear_dialogs' });
    });
  });

  // ── File upload ─────────────────────────────────────────────────────

  describe('file upload', () => {
    it('setInputFiles sends base64-encoded files', async () => {
      mock.setResponse({ data: 1 });
      const buf = Buffer.from('hello');
      const count = await page.setInputFiles('input[type=file]', [
        { name: 'test.txt', mimeType: 'text/plain', buffer: buf },
      ]);
      expect(count).toBe(1);
      const call = mock.lastCall()!;
      expect(call.type).toBe('set_input_files');
      expect((call.files as Array<Record<string, unknown>>)[0].name).toBe('test.txt');
      expect((call.files as Array<Record<string, unknown>>)[0].base64).toBe(buf.toString('base64'));
    });
  });

  // ── Screenshot / Recording ──────────────────────────────────────────

  describe('capture', () => {
    it('screenshot returns buffer from base64', async () => {
      const pngData = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64');
      mock.setResponse({ data: { base64: pngData, size: 4 } });
      const buf = await page.screenshot();
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
    });

    it('startRecording sends start_recording', async () => {
      mock.setResponse({ data: { dir: '/tmp/rec', fps: 15 } });
      const result = await page.startRecording({ path: '/tmp/rec', fps: 15 });
      expect(result.dir).toBe('/tmp/rec');
      expect(mock.lastCall()).toMatchObject({ type: 'start_recording', fps: 15 });
    });

    it('stopRecording sends stop_recording', async () => {
      mock.setResponse({
        data: { dir: '/tmp/rec', frame_count: 10, fps: 15, video: '/tmp/rec/video.mp4' },
      });
      const result = await page.stopRecording();
      expect(result.frame_count).toBe(10);
      expect(result.video).toBe('/tmp/rec/video.mp4');
    });
  });
});

// ── TauriLocator ────────────────────────────────────────────────────────

describe('TauriLocator', () => {
  let mock: ReturnType<typeof createMockClient>;
  let page: TauriPage;

  beforeEach(() => {
    mock = createMockClient();
    page = new TauriPage(mock.client);
  });

  it('delegates click to page', async () => {
    await page.locator('#btn').click();
    expect(mock.lastCall()).toMatchObject({ type: 'click', selector: '#btn' });
  });

  it('delegates fill to page', async () => {
    await page.locator('input').fill('text');
    expect(mock.lastCall()).toMatchObject({ type: 'fill', selector: 'input', text: 'text' });
  });

  it('delegates textContent to page', async () => {
    mock.setResponse({ data: 'Hello' });
    const text = await page.locator('.h1').textContent();
    expect(text).toBe('Hello');
  });

  it('delegates isVisible to page', async () => {
    mock.setResponse({ data: true });
    expect(await page.locator('.el').isVisible()).toBe(true);
  });

  it('clear fills with empty string', async () => {
    await page.locator('input').clear();
    expect(mock.lastCall()).toMatchObject({ type: 'fill', text: '' });
  });

  describe('refinement', () => {
    it('nth returns JS-based locator', () => {
      const loc = page.locator('.item').nth(2);
      expect(loc.isJsBased).toBe(true);
    });

    it('first is nth(0)', () => {
      const loc = page.locator('.item').first();
      expect(loc.isJsBased).toBe(true);
    });

    it('last returns JS-based locator', () => {
      const loc = page.locator('.item').last();
      expect(loc.isJsBased).toBe(true);
    });

    it('filter with hasText returns JS-based locator', () => {
      const loc = page.locator('div').filter({ hasText: 'Hello' });
      expect(loc.isJsBased).toBe(true);
    });

    it('all returns array of locators', async () => {
      mock.setResponse({ data: 3 }); // count returns 3
      const locs = await page.locator('.item').all();
      expect(locs).toHaveLength(3);
      expect(locs[0]).toBeInstanceOf(TauriLocator);
    });

    it('nested locator combines selectors', async () => {
      const nested = page.locator('.parent').locator('.child');
      mock.setResponse({ data: true });
      await nested.isVisible();
      expect(mock.lastCall()).toMatchObject({ selector: '.parent .child' });
    });
  });

  describe('semantic selectors on locator', () => {
    it('getByTestId scopes to parent', () => {
      const loc = page.locator('.parent').getByTestId('child');
      expect(loc).toBeInstanceOf(TauriLocator);
    });

    it('getByPlaceholder scopes to parent', () => {
      const loc = page.locator('.parent').getByPlaceholder('Search');
      expect(loc).toBeInstanceOf(TauriLocator);
    });
  });
});
