import { describe, expect, it } from 'vitest';
import { declarationAllows, identifyTab, type SelectedTab } from './consent';

const tab: SelectedTab = { id: 12, windowId: 1, active: true, incognito: false, status: 'complete', url: 'https://odoo.example/web?token=synthetic#private' };
const declaration = { origin: 'https://odoo.example', environment: 'test', authorized: true };
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
});
