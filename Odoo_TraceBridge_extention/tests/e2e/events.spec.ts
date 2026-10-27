import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import type { Header, Reply, View } from '../../src/session/model';
import { randomUUID } from 'node:crypto';

async function inspect(popup: Page): Promise<View> {
  const result = await popup.evaluate<Reply, string>(requestId => chrome.runtime.sendMessage({ op: 'inspect', requestId }), randomUUID());
  expect(result.ok).toBe(true); return (result as { ok: true; view: View }).view;
}
declare const chrome: typeof import('wxt/browser').browser;
async function start(popup: Page, origin: string, environment = 'local', button = 'Start') {
  await popup.getByLabel('Authorized exact origin').fill(origin);
  await popup.getByRole('combobox', { name: /^Environment/ }).selectOption(environment);
  await popup.getByRole('checkbox').check(); await popup.getByRole('button', { name: button, exact: true }).click();
  await expect(popup.getByRole('status')).toContainText('Session: recording');
}
async function count(popup: Page) { const view = await inspect(popup); return Object.values(view.evidence ?? {})[0]?.count ?? 0; }
async function documentClickListeners(context: import('@playwright/test').BrowserContext, target: Page, extensionOrigin: string) {
  const cdp = await context.newCDPSession(target);
  const contexts: { id: number; origin: string; auxData?: { isDefault?: boolean } }[] = [];
  cdp.on('Runtime.executionContextCreated', event => contexts.push(event.context));
  await cdp.send('Runtime.enable');
  const isolated = contexts.find(context => context.origin === extensionOrigin && context.auxData?.isDefault === false);
  expect(isolated, 'Actual extension isolated world').toBeTruthy();
  const object = await cdp.send('Runtime.evaluate', { expression: 'document', contextId: isolated!.id });
  const result = await cdp.send('DOMDebugger.getEventListeners', { objectId: object.result.objectId! });
  await cdp.detach();
  return result.listeners.filter(listener => listener.type === 'click' && listener.useCapture).length;
}
function native() { test.skip(process.env.TRACEBRIDGE_HEADED !== '1', 'Native action requires X11 and xdotool; no grant mock.'); }

test('native action: trusted clicks are categories only; inputs, labels, selectors and subframes excluded', async ({ context, fixture, invoke, popup: inspector }, info) => {
  native(); const target = await context.newPage(); await target.goto(`${fixture.origin}/private/991?token=SYNTHETIC#record`);
  await target.locator('#safe').click(); expect(await count(inspector)).toBe(0);
  const popup = await invoke(target);
  await start(popup, fixture.origin);
  await target.locator('#safe span').click(); await expect.poll(() => count(inspector)).toBe(1);
  await target.locator('#link').click(); await expect.poll(() => count(inspector)).toBe(2);
  await target.locator('#password').fill('SYNTHETIC_SECRET'); await target.locator('#business').fill('SYNTHETIC_CUSTOMER_991');
  await target.locator('#notes').fill('SYNTHETIC_NOTES'); await target.locator('#select').selectOption({ index: 0 });
  await target.locator('#editable-button').click(); await target.locator('#unknown').click();
  await target.frameLocator('iframe').locator('#safe').click();
  await target.locator('#safe').evaluate(element => (element as HTMLElement).click());
  const view = await inspect(inspector); const summary = Object.values(view.evidence!)[0]!;
  expect(summary.count).toBe(2); expect(summary.events.map(event => event.category)).toEqual(['button_click', 'link_click']);
  expect(JSON.stringify(summary)).not.toMatch(/SYNTHETIC|secret|password|private|record|localhost|127\.0\.0\.1|selector|label|href/i);
  expect(summary.events.every(event => Object.keys(event).sort().join() === 'category,elapsedMs,sequence')).toBe(true);
  const stores = await inspector.evaluate<{ stores: string[]; rows: Header[] }>(`new Promise(resolve => { const request=indexedDB.open('tracebridge',1); request.onsuccess=()=>{const db=request.result; const read=db.transaction('cases').objectStore('cases').getAll(); read.onsuccess=()=>{resolve({stores:[...db.objectStoreNames],rows:read.result}); db.close();};};})`);
  expect(stores.stores).toEqual(['cases']); expect(stores.rows).toEqual(view.cases);
  expect(stores.rows.every(row => Object.keys(row).sort().join() === 'createdAt,epoch,id,schema,state,updatedAt')).toBe(true);
  expect(JSON.stringify(stores)).not.toMatch(/SYNTHETIC|category|sequence|events|origin|private|token/);
  expect(await inspector.evaluate('chrome.storage.local.get(null)')).toEqual({});
  expect(await inspector.evaluate('chrome.storage.session.get(null)')).toEqual({ binding: { id: view.cases[0]!.id, target: view.target } });
  await inspector.getByRole('button', { name: 'Refresh scope / status' }).click();
  await expect(inspector.getByText(/Volatile categories observed: 2/)).toBeVisible();
  await inspector.screenshot({ path: info.outputPath('sanitized-counter.png') });
});

for (const op of ['pause', 'stop', 'delete'] as const) {
  test(`native action: ${op} removes collection; late trusted page actions cannot append`, async ({ context, fixture, invoke, popup: inspector }) => {
    native(); const target = await context.newPage(); await target.goto(fixture.origin); const popup = await invoke(target); await start(popup, fixture.origin);
    await target.locator('#safe').click(); await expect.poll(() => count(inspector)).toBe(1);
    const extensionOrigin = inspector.url().replace('/popup.html', '');
    expect(await documentClickListeners(context, target, extensionOrigin)).toBe(1);
    const view = await inspect(inspector); const row = view.cases[0]!;
    const result = await inspector.evaluate<Reply, object>(request => chrome.runtime.sendMessage(request), { op, requestId: randomUUID(), id: row.id, epoch: row.epoch });
    expect(result.ok).toBe(true);
    await expect.poll(() => documentClickListeners(context, target, extensionOrigin)).toBe(0);
    await target.locator('#safe').click(); await target.locator('#link').click();
    expect(await count(inspector)).toBe(op === 'delete' ? 0 : 1);
    const late = await inspector.evaluate<Reply, object>(request => chrome.runtime.sendMessage(request), { op: 'pause', requestId: randomUUID(), id: row.id, epoch: row.epoch });
    expect(late.ok).toBe(false); expect(await count(inspector)).toBe(op === 'delete' ? 0 : 1);
  });
}

for (const navigation of ['reload', 'document', 'hash', 'popstate', 'pushstate']) {
  test(`native action: ${navigation} pauses safely with generic navigation or an explicit teardown gap`, async ({ context, fixture, invoke, popup: inspector }, info) => {
    native(); const target = await context.newPage(); await target.goto(fixture.origin); const popup = await invoke(target); await start(popup, fixture.origin);
    await target.locator('#safe').click(); await expect.poll(() => count(inspector)).toBe(1);
    if (navigation === 'reload') await target.reload();
    if (navigation === 'document') await target.goto(`${fixture.origin}/record/991?secret=SYNTHETIC`);
    if (navigation === 'hash') await target.evaluate(() => { location.hash = 'SYNTHETIC_RECORD_991'; });
    if (navigation === 'pushstate') await target.evaluate(() => history.pushState({}, '', '/record/991?secret=SYNTHETIC'));
    if (navigation === 'popstate') await target.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));
    await expect.poll(async () => (await inspect(inspector)).cases[0]?.state).toBe('paused');
    const view = await inspect(inspector); const summary = Object.values(view.evidence!)[0]!;
    const observed = summary.events.some(event => ['document_navigation', 'navigation_signal'].includes(event.category));
    if (!['reload', 'document'].includes(navigation)) expect(observed).toBe(true);
    else expect(summary.events.every(event => ['button_click', 'document_navigation', 'navigation_signal'].includes(event.category))).toBe(true);
    await info.attach('navigation-availability.json', { body: JSON.stringify({ navigation, observed, gap: observed ? null : 'Document teardown invalidated the collector before navigation admission', paused: true }), contentType: 'application/json' });
    expect(JSON.stringify(summary)).not.toMatch(/SYNTHETIC|secret|record|http/);
    const before = summary.count; await target.locator('#safe').click(); expect(await count(inspector)).toBe(before);
  });
}

test('native action: bounded volatile buffer overflows without changing persistent headers', async ({ context, fixture, invoke, popup: inspector }) => {
  test.setTimeout(60_000); native(); const target = await context.newPage(); await target.goto(fixture.origin); const popup = await invoke(target); await start(popup, fixture.origin);
  for (let sequence = 1; sequence <= 130; sequence++) {
    await target.locator('#safe').click(); await expect.poll(() => count(inspector)).toBe(sequence);
  }
  const view = await inspect(inspector); const summary = Object.values(view.evidence!)[0]!;
  expect(summary.count).toBe(130); expect(summary.events).toHaveLength(128); expect(summary.dropped).toBe(2); expect(summary.events[0]!.sequence).toBe(3);
  const stored = await inspector.evaluate(`new Promise(resolve => {const open=indexedDB.open('tracebridge',1);open.onsuccess=()=>{const db=open.result;const read=db.transaction('cases').objectStore('cases').getAll();read.onsuccess=()=>{resolve(read.result);db.close();};};})`);
  expect(JSON.stringify(stored)).not.toMatch(/events|category|sequence|SYNTHETIC|origin/);
});

test('native action: real worker termination drops events, detaches collector and never resumes automatically', async ({ context, fixture, invoke, popup: inspector }, info) => {
  native(); const target = await context.newPage(); await target.goto(fixture.origin); const popup = await invoke(target); await start(popup, fixture.origin);
  await target.locator('#safe').click(); await expect.poll(() => count(inspector)).toBe(1);
  const cdp = await context.newCDPSession(target);
  const versions: { versionId: string; scriptURL: string; runningStatus: string }[] = [];
  cdp.on('ServiceWorker.workerVersionUpdated', event => versions.push(...event.versions)); await cdp.send('ServiceWorker.enable');
  await expect.poll(() => versions.find(version => version.scriptURL.endsWith('/background.js') && version.runningStatus === 'running')).toBeTruthy();
  const version = versions.find(version => version.scriptURL.endsWith('/background.js') && version.runningStatus === 'running')!;
  await cdp.send('ServiceWorker.stopWorker', { versionId: version.versionId });
  await expect.poll(() => versions.some(item => item.versionId === version.versionId && item.runningStatus === 'stopped')).toBe(true);
  await target.locator('#safe').click();
  const view = await inspect(inspector); expect(view.cases[0]!.state).toBe('paused'); expect(await count(inspector)).toBe(0);
  await target.locator('#safe').click(); expect(await count(inspector)).toBe(0);
  const resumed = await invoke(target); await start(resumed, fixture.origin, 'local', 'Resume');
  await target.locator('#safe').click(); await expect.poll(() => count(inspector)).toBe(1);
  await info.attach('volatile-restart.json', { body: JSON.stringify({ observedStopped: true, evidenceLost: true, recoveredState: view.cases[0]!.state, explicitResumeRequired: true }), contentType: 'application/json' });
  await cdp.detach();
});

test('native action: observation preserves fixture action behavior and request/response content', async ({ context, fixture, invoke, popup: inspector }) => {
  native(); const target = await context.newPage(); await target.goto(fixture.origin);
  const probe = () => target.evaluate(async () => { const response = await fetch('/probe', { method: 'POST', body: 'SYNTHETIC_UNCHANGED_BODY', headers: { 'X-Synthetic': 'same' } }); return { status: response.status, header: response.headers.get('X-Fixture'), body: await response.json() }; });
  const before = await probe();
  await target.evaluate('window.originalFetch = window.fetch; window.originalXHR = window.XMLHttpRequest; window.originalPush = history.pushState');
  const popup = await invoke(target); await start(popup, fixture.origin);
  expect(await probe()).toEqual(before); expect(before).toEqual({ status: 201, header: 'unchanged', body: { method: 'POST', body: 'SYNTHETIC_UNCHANGED_BODY' } });
  await target.locator('#safe').click(); await expect.poll(() => count(inspector)).toBe(1);
  expect(await target.evaluate('window.fixtureClicks')).toBe(1);
  expect(await target.evaluate('window.fetch === window.originalFetch && window.XMLHttpRequest === window.originalXHR && history.pushState === window.originalPush')).toBe(true);
  // In-place SPA rendering without navigation events is deliberately unavailable.
  await target.evaluate(() => { document.body.dataset.syntheticState = 'changed'; }); expect(await count(inspector)).toBe(1);
});

test('native action: intercepted HTTPS staging fixture collects only after explicit consent', async ({ context, fixture, invoke, popup: inspector }) => {
  native(); const target = await context.newPage(); await target.goto(fixture.syntheticHttpsOrigin);
  await target.locator('#safe').click(); expect(await count(inspector)).toBe(0);
  const popup = await invoke(target); await start(popup, fixture.syntheticHttpsOrigin, 'staging');
  await target.locator('#safe').click(); await expect.poll(() => count(inspector)).toBe(1);
  const view = await inspect(inspector); expect(Object.values(view.evidence!)[0]!.events[0]!.category).toBe('button_click');
});

test('native action: isolated collector deadline expires in Chromium virtual time without renewal', async ({ context, fixture, invoke, popup: inspector }, info) => {
  native(); const target = await context.newPage(); await target.goto(fixture.origin); const popup = await invoke(target); await start(popup, fixture.origin);
  await target.locator('#safe').click(); await expect.poll(() => count(inspector)).toBe(1);
  const cdp = await context.newCDPSession(target);
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: 30 * 60_000 + 1000 });
  await expect.poll(async () => (await inspect(inspector)).cases[0]!.state).toBe('paused');
  await target.locator('#safe').click(); expect(await count(inspector)).toBe(1);
  await info.attach('collector-expiry.json', { body: JSON.stringify({ mechanism: 'CDP page virtual time', advancedMs: 1801000, collectorStopped: true, workerState: 'paused', autoRenewal: false, actualThirtyMinuteWait: false }), contentType: 'application/json' });
  await cdp.detach();
});
