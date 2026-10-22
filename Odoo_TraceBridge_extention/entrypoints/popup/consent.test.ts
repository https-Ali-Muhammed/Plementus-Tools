import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createConsentGate, declarationAllows, identifyTab, type SelectedTab } from './consent';

const tab: SelectedTab = { id: 12, windowId: 1, active: true, incognito: false, status: 'complete', url: 'https://odoo.example/web?token=synthetic#private' };
const declaration = { origin: 'https://odoo.example', environment: 'test', authorized: true };
function fixture() {
  const read = vi.fn<() => Promise<SelectedTab | undefined>>().mockResolvedValue({ ...tab });
  const notify = vi.fn();
  return { read, notify, gate: createConsentGate(read, notify) };
}

describe('exact selected-tab policy (synthetic fixtures)', () => {
  it('keeps only tab, window and exact origin; drops path/query/fragment', () => {
    expect(identifyTab(tab)).toEqual({ tabId: 12, windowId: 1, origin: 'https://odoo.example' });
  });
  it.each(['chrome://settings', 'brave://settings', 'about:blank', 'file:///tmp/test', 'data:text/html,test', 'blob:https://odoo.example/id', 'http://odoo.example', 'https://user:pass@odoo.example', 'https://chromewebstore.google.com/detail/test', 'https://chrome.google.com/webstore', 'https://microsoftedge.microsoft.com/addons', 'invalid'])('rejects unsupported URL %s', url => {
    expect(identifyTab({ ...tab, url })).toBeUndefined();
  });
  it.each([{ id: undefined }, { id: -1 }, { windowId: -1 }, { active: false }, { incognito: true }, { incognito: undefined }, { url: undefined }, { pendingUrl: 'https://elsewhere.example' }, { status: 'loading' }])('rejects missing/unsafe identity %j', patch => {
    expect(identifyTab({ ...tab, ...patch })).toBeUndefined();
  });
  it.each([
    { authorized: false }, { environment: 'unknown' }, { environment: 'production' }, { environment: '' },
    { origin: 'https://unrelated.example' }, { origin: 'https://odoo.example.evil' },
    { origin: 'http://odoo.example' }, { origin: 'https://odoo.example:8443' }, { origin: 'https://odoo.example/web' },
  ])('denies unclassified/unauthorized/unrelated declarations %j', patch => {
    expect(declarationAllows(identifyTab(tab)!, { ...declaration, ...patch })).toBe(false);
  });
});

describe('explicit loopback development policy', () => {
  it.each(['https://10.staging.example', 'https://192.168.staging.example', 'https://172.15.0.1', 'https://172.32.0.1'])('keeps exact remote host checks for %s', url => {
    const target = identifyTab({ ...tab, url })!;
    expect(target?.origin).toBe(new URL(url).origin);
    expect(declarationAllows(target, { origin: target.origin, environment: 'test', authorized: true })).toBe(true);
  });
  it.each([
    'https://192.168.1.2', 'https://10.0.0.1', 'https://172.16.0.1', 'https://172.31.255.254',
    'https://169.254.1.2', 'https://100.64.0.1', 'https://127.0.0.2', 'https://[fd00::1]',
    'https://[fe80::1]', 'https://[::ffff:192.168.1.2]', 'https://odoo.local', 'https://odoo.lan',
    'https://odoo.internal', 'https://odoo', 'https://localhost.evil', 'https://sub.localhost',
  ])('does not bypass unapproved LAN/local names with HTTPS %s', url => {
    expect(identifyTab({ ...tab, url })).toBeUndefined();
  });
  it.each([
    ['http://localhost:8069/web', 'http://localhost:8069'],
    ['http://127.0.0.1:8069', 'http://127.0.0.1:8069'],
    ['http://[::1]:8069', 'http://[::1]:8069'],
    ['http://localhost', 'http://localhost'],
    ['http://localhost:80/web', 'http://localhost'],
    ['http://LOCALHOST:49152/web', 'http://localhost:49152'],
    ['http://localhost:1', 'http://localhost:1'],
    ['http://localhost:65535', 'http://localhost:65535'],
    ['https://localhost:443', 'https://localhost'],
    ['https://staging.example:8443', 'https://staging.example:8443'],
  ])('normalizes eligible %s without discarding non-default ports', (url, origin) => {
    const target = identifyTab({ ...tab, url })!;
    expect(target?.origin).toBe(origin);
    expect(declarationAllows(target, { origin, environment: new URL(url).hostname === 'staging.example' ? 'staging' : 'local', authorized: true })).toBe(true);
  });
  it.each([
    'http://localhost.evil:8069', 'http://sub.localhost:8069', 'http://localhost.:8069',
    'http://192.168.1.2:8069', 'http://10.0.0.1:8069', 'http://odoo.local:8069',
    'http://127.0.0.2:8069', 'http://[::ffff:127.0.0.1]:8069', 'http://remote.example:8069',
    'http://localhost:65536', 'http://localhost:-1', 'http://localhost:port',
    'http://localhost:8069@evil.example', 'http://evil.example@localhost:8069',
    'ftp://localhost:8069', 'ws://localhost:8069',
  ])('rejects unsafe local URL %s', url => {
    expect(identifyTab({ ...tab, url })).toBeUndefined();
  });
  it.each([
    { origin: 'http://127.0.0.1:8069' }, { origin: 'http://localhost:8070' },
    { origin: 'https://localhost:8069' }, { origin: 'http://localhost:8069/' },
    { origin: 'http://localhost:8069/web' }, { origin: 'http://localhost:8069#x' },
    { origin: 'http://localhost:8069?x' }, { origin: '' }, { authorized: false },
    { environment: 'test' }, { environment: 'staging' }, { environment: 'production' },
    { environment: 'unknown' }, { environment: '' },
  ])('requires explicit Local Development and exact normalized origin %j', patch => {
    const target = identifyTab({ ...tab, url: 'http://localhost:8069/web' })!;
    expect(declarationAllows(target, { origin: target.origin, environment: 'local', authorized: true, ...patch })).toBe(false);
  });
  it.each([undefined, null, 'true', 1])('rejects missing or malformed authorization %s', authorized => {
    const target = identifyTab({ ...tab, url: 'http://localhost:8069' })!;
    expect(declarationAllows(target, { origin: target.origin, environment: 'local', authorized: authorized as unknown as boolean })).toBe(false);
  });
  it('rejects remote HTTPS declared as Local Development', () => {
    expect(declarationAllows(identifyTab(tab)!, { ...declaration, environment: 'local' })).toBe(false);
  });
  it.each(['invalid', 'http://remote.example', 'http://localhost:80', 'http://localhost/path'])('fails closed for forged target %s', origin => {
    expect(declarationAllows({ tabId: 1, windowId: 1, origin }, { origin, environment: 'local', authorized: true })).toBe(false);
  });
  it.each(['http://127.0.0.1:8069', 'http://localhost:8070', 'https://localhost:8069'])('rejects stale local target %s during approval', async url => {
    const read = vi.fn<() => Promise<SelectedTab>>().mockResolvedValue({ ...tab, url: 'http://localhost:8069/web' });
    const gate = createConsentGate(read, vi.fn());
    await gate.inspect();
    read.mockResolvedValue({ ...tab, url });
    await gate.approve({ origin: 'http://localhost:8069', environment: 'local', authorized: true });
    expect(gate.getState().consent).toBe('tab-changed');
  });
});

describe('popup consent gate + browser lookup integration (mock browser)', () => {
  it('requires inspect and explicit approval; invocation alone never consents', async () => {
    const { gate, read } = fixture();
    await gate.approve(declaration);
    expect(read).not.toHaveBeenCalled();
    await gate.inspect();
    expect(gate.getState().consent).toBe('required');
    await gate.approve(declaration);
    expect(read).toHaveBeenCalledTimes(2);
    expect(gate.getState().consent).toBe('approved');
    expect(gate.getState()).not.toHaveProperty('recording');
  });
  it('accepts an explicitly authorized staging declaration', async () => {
    const { gate } = fixture(); await gate.inspect();
    await gate.approve({ ...declaration, environment: 'staging' });
    expect(gate.getState().consent).toBe('approved');
  });
  it('denies missing confirmation even if UI controls are bypassed', async () => {
    const { gate } = fixture(); await gate.inspect();
    await gate.approve({ ...declaration, authorized: false });
    expect(gate.getState().consent).toBe('denied');
  });
  it.each([{ id: 13 }, { windowId: 2 }, { url: 'https://unrelated.example' }])('rejects stale target at approval %j', async patch => {
    const { gate, read } = fixture(); await gate.inspect(); read.mockResolvedValue({ ...tab, ...patch });
    await gate.approve(declaration);
    expect(gate.getState().consent).toBe('tab-changed');
    expect(gate.getState().target).toBeUndefined();
  });
  it('reports browser lookup failure as unavailable', async () => {
    const { gate, read } = fixture(); read.mockRejectedValue(new Error('synthetic denial'));
    await gate.inspect(); expect(gate.getState().access).toBe('unavailable');
  });
  it('reports missing URL/access on invocation as unavailable', async () => {
    const { gate, read } = fixture(); read.mockResolvedValue({ ...tab, url: undefined });
    await gate.inspect(); expect(gate.getState().access).toBe('unavailable');
  });
  it.each(['missing', 'error'])('revokes on lost browser access: %s', async mode => {
    const { gate, read } = fixture(); await gate.inspect();
    if (mode === 'missing') read.mockResolvedValue({ ...tab, url: undefined });
    else read.mockRejectedValue(new Error('synthetic revoked access'));
    await gate.approve(declaration); expect(gate.getState().access).toBe('revoked');
  });
  it.each(['denied', 'tab-changed', 'revoked'] as const)('invalidates approval and cannot reuse it after %s', async reason => {
    const { gate } = fixture(); await gate.inspect(); await gate.approve(declaration);
    gate.invalidate(reason); await gate.approve(declaration);
    expect(gate.getState().consent).toBe(reason);
    expect(gate.getState().target).toBeUndefined();
  });
  it.each(['inspect', 'approve'] as const)('drops late %s results after invalidation', async action => {
    const { gate, read } = fixture();
    if (action === 'approve') await gate.inspect();
    let finish!: (value: SelectedTab) => void;
    read.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const pending = action === 'inspect' ? gate.inspect() : gate.approve(declaration);
    gate.invalidate('tab-changed'); finish(tab); await pending;
    expect(gate.getState().consent).toBe('tab-changed');
  });
  it('reopening starts without the prior popup approval', async () => {
    const { gate } = fixture(); await gate.inspect(); await gate.approve(declaration);
    const reopened = fixture().gate; await reopened.inspect();
    expect(reopened.getState().consent).toBe('required');
  });
});

describe('Phase 03 source boundary', () => {
  const source = readdirSync('entrypoints/popup').filter(name => /\.(ts|tsx)$/.test(name) && !name.includes('.test.'))
    .map(name => readFileSync(`entrypoints/popup/${name}`, 'utf8')).join('\n');
  it('has no capture, injection, persistence, page messaging or network API', () => {
    expect(source).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|indexedDB|localStorage|sessionStorage|executeScript|captureVisibleTab|sendMessage|postMessage)\b|browser\.(storage|scripting|webRequest|debugger|cookies)|dangerouslySetInnerHTML/);
    expect(readdirSync('entrypoints')).toEqual(['popup']);
  });
  it('never offers Start and wires invalidation signals', () => {
    expect(source).toContain('<button disabled>Start unavailable — Phase 04</button>');
    for (const event of ['tabs.onActivated', 'tabs.onUpdated', 'tabs.onRemoved', 'tabs.onReplaced', 'windows.onFocusChanged', 'permissions.onRemoved']) {
      expect(source).toContain(`browser.${event}.addListener`);
      expect(source).toContain(`browser.${event}.removeListener`);
    }
  });
  it('declares only activeTab with no broad/optional host permissions', () => {
    const config = readFileSync('wxt.config.ts', 'utf8');
    expect(config).toContain("permissions: ['activeTab']");
    expect(config).toContain("incognito: 'not_allowed'");
    expect(config).toContain("connect-src 'none'");
    expect(config).not.toMatch(/host_permissions|optional_permissions|<all_urls>|https?:\/\/\*/);
  });
});
