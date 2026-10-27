import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import type { Control, Header, Reply, View } from '../../src/session/model';
import { LIMITS } from '../../src/session/model';
import { randomUUID } from 'node:crypto';

async function message(popup: Page, request: Control): Promise<Reply> {
  return popup.evaluate(`chrome.runtime.sendMessage(${JSON.stringify(request)})`);
}
async function inspect(popup: Page) {
  const reply = await message(popup, { op: 'inspect', requestId: randomUUID() });
  expect(reply.ok, JSON.stringify(reply)).toBe(true);
  return (reply as { ok: true; view: View }).view;
}
async function consent(popup: Page, origin: string, button = 'Start') {
  await popup.getByLabel('Authorized exact origin').fill(origin);
  await popup.getByRole('combobox', { name: /^Environment/ }).selectOption('local');
  await popup.getByRole('checkbox').check();
  await popup.getByRole('button', { name: button, exact: true }).click();
  await expect(popup.getByRole('status')).toContainText('Session: recording');
}
async function dbRows(popup: Page): Promise<Header[]> {
  return popup.evaluate(`new Promise((resolve, reject) => {
    const open = indexedDB.open('tracebridge', 1);
    open.onerror = () => reject('Cannot inspect test DB');
    open.onsuccess = () => { const db = open.result; const tx = db.transaction('cases'); const read = tx.objectStore('cases').getAll();
      read.onsuccess = () => resolve(read.result); read.onerror = () => reject('Cannot read test DB'); tx.oncomplete = () => db.close(); };
  })`);
}
async function seedRows(popup: Page, rows: unknown[]) {
  await popup.evaluate(`new Promise((resolve, reject) => {
    const open = indexedDB.open('tracebridge', 1);
    open.onsuccess = () => { const db = open.result; const tx = db.transaction('cases', 'readwrite'); const store = tx.objectStore('cases'); store.clear();
      for (const row of ${JSON.stringify(rows)}) store.put(row); tx.oncomplete = () => { db.close(); resolve(true); }; tx.onabort = () => reject('Test seed failed'); };
  })`);
}
function native() { test.skip(process.env.TRACEBRIDGE_HEADED !== '1', 'Native action requires an X11 display and xdotool; no mocked activeTab substitute.'); }

test('direct popup: packaged MV3 fails closed; minimal grants and no persistent scope', async ({ popup }) => {
  const manifest = await popup.evaluate<Record<string, unknown>>('chrome.runtime.getManifest()');
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions).toEqual(['activeTab', 'storage']);
  expect(manifest.host_permissions).toBeUndefined();
  expect(manifest.background).toEqual({ service_worker: 'background.js' });
  expect(manifest.content_scripts).toBeUndefined();
  expect(manifest.incognito).toBe('not_allowed');
  const permissions = await popup.evaluate<Record<string, unknown>>('chrome.permissions.getAll()');
  expect(permissions.permissions).toEqual(['activeTab', 'storage']); expect(permissions.origins).toEqual([]);
  await expect(popup.getByRole('heading', { name: 'Odoo TraceBridge' })).toBeVisible();
  await expect(popup.getByRole('status')).toContainText('Browser access: unavailable');
  await expect(popup.getByRole('button', { name: 'Start', exact: true })).toBeDisabled();
  expect(await dbRows(popup)).toEqual([]);
  expect(await popup.evaluate('chrome.storage.local.get(null)')).toEqual({});
  expect(await popup.evaluate('chrome.storage.session.get(null)')).toEqual({});
});

test('native action: consent negatives, lifecycle controls, fresh Resume and irreversible Delete', async ({ context, fixture, invoke }, info) => {
  native(); const target = await context.newPage(); await target.goto(`${fixture.origin}/?synthetic_token=DO_NOT_STORE`);
  const popup = await invoke(target);
  await expect(popup.getByRole('status')).toContainText('Session: permission_pending');
  expect((await inspect(popup)).cases).toEqual([]);
  const start = popup.getByRole('button', { name: 'Start', exact: true });
  await expect(start).toBeDisabled();
  await popup.getByLabel('Authorized exact origin').fill(fixture.origin);
  await popup.getByRole('checkbox').check();
  for (const value of ['production', 'unknown', 'test', 'staging']) {
    await popup.getByRole('combobox', { name: /^Environment/ }).selectOption(value); await expect(start).toBeDisabled();
  }
  await popup.getByRole('combobox', { name: /^Environment/ }).selectOption('local');
  await popup.getByRole('checkbox').uncheck(); await expect(start).toBeDisabled(); await popup.getByRole('checkbox').check();
  for (const wrong of [fixture.secondOrigin, fixture.origin.replace('127.0.0.1', 'localhost'), `${fixture.origin}/`, fixture.origin.replace('http:', 'https:')]) {
    await popup.getByLabel('Authorized exact origin').fill(wrong); await expect(start).toBeDisabled();
  }
  // Prior inspect consumed the old review in the UI; refresh displays the current worker challenge.
  await popup.getByRole('button', { name: 'Refresh scope / status' }).click();
  await consent(popup, fixture.origin);
  const first = (await inspect(popup)).cases[0]!;
  expect(first.state).toBe('recording');
  expect(Object.keys(first).sort()).toEqual(['schema', 'id', 'epoch', 'state', 'createdAt', 'updatedAt'].sort());
  expect(JSON.stringify(await dbRows(popup))).not.toMatch(/127\.0\.0\.1|DO_NOT_STORE|token|\/web|cookie|body/);
  expect(await popup.evaluate('chrome.storage.local.get(null)')).toEqual({});
  const temporary = await popup.evaluate<string>('chrome.storage.session.get(null).then(JSON.stringify)');
  expect(temporary).toContain(fixture.origin); expect(temporary).not.toMatch(/DO_NOT_STORE|token|authorized|environment/);
  await popup.locator('header').scrollIntoViewIfNeeded(); await popup.screenshot({ path: info.outputPath('recording-no-capture.png') });
  await popup.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(popup.getByRole('status')).toContainText('Session: paused');
  await expect(popup.getByRole('button', { name: 'Resume', exact: true })).toBeDisabled();
  await popup.getByRole('button', { name: 'Refresh scope / status' }).click();
  await expect(popup.getByRole('checkbox')).not.toBeChecked();
  await consent(popup, fixture.origin, 'Resume');
  const resumed = (await inspect(popup)).cases[0]!; expect(resumed.epoch).not.toBe(first.epoch);
  expect((await message(popup, { op: 'stop', requestId: randomUUID(), id: first.id, epoch: first.epoch })).ok).toBe(false);
  await popup.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(popup.getByText('Case state: stopped.', { exact: false })).toBeVisible();
  const stopped = (await inspect(popup)).cases[0]!;
  await popup.getByRole('button', { name: 'Delete selected case' }).click();
  expect(await dbRows(popup)).toEqual([]); expect(await popup.evaluate('chrome.storage.session.get(null)')).toEqual({});
  expect((await message(popup, { op: 'stop', requestId: randomUUID(), id: stopped.id, epoch: stopped.epoch })).ok).toBe(false);
  await popup.getByRole('button', { name: 'Refresh scope / status' }).click(); expect((await inspect(popup)).cases).toEqual([]);
});

for (const host of ['localhost', 'ipv6', 'second-port']) {
  test(`native action: explicit lifecycle Start on ${host}`, async ({ context, fixture, invoke }) => {
    native(); test.skip(host === 'ipv6' && !fixture.ipv6Origin, 'IPv6 loopback unavailable.');
    const origin = host === 'ipv6' ? fixture.ipv6Origin! : host === 'second-port' ? fixture.secondOrigin : fixture.origin.replace('127.0.0.1', 'localhost');
    const target = await context.newPage(); await target.goto(origin); const popup = await invoke(target);
    await expect(popup.locator('strong')).toHaveText(origin); await consent(popup, origin);
    await popup.getByRole('button', { name: 'Revoke consent' }).click();
    await expect(popup.getByRole('status')).toContainText('Session: paused');
  });
}

for (const change of ['tab-switch', 'reload', 'same-origin-navigation', 'cross-port-navigation', 'cross-host-navigation', 'tab-close']) {
  test(`native action: conservatively pauses after ${change}`, async ({ context, fixture, invoke }) => {
    native(); const target = await context.newPage(); await target.goto(fixture.origin); const popup = await invoke(target);
    await consent(popup, fixture.origin); const first = (await inspect(popup)).cases[0]!;
    const popupUrl = popup.url(); await popup.close();
    let next = target;
    if (change === 'tab-switch') { next = await context.newPage(); await next.goto(fixture.origin); }
    else if (change === 'tab-close') { await target.close(); next = await context.newPage(); await next.goto(fixture.origin); }
    else if (change === 'reload') await target.reload();
    else await target.goto(`${change === 'cross-port-navigation' ? fixture.secondOrigin : change === 'cross-host-navigation' ? fixture.origin.replace('127.0.0.1', 'localhost') : fixture.origin}/next-document`);
    // Direct inspection is intentionally separate from native authorization above.
    const inspector = await context.newPage(); await inspector.goto(popupUrl);
    const recovered = await inspect(inspector);
    expect(recovered.cases[0]!.state).toBe('paused'); expect(recovered.cases[0]!.epoch).not.toBe(first.epoch);
    expect((await message(inspector, { op: 'stop', requestId: randomUUID(), id: first.id, epoch: first.epoch })).ok).toBe(false);
    await inspector.close(); const reopened = await invoke(next);
    await expect(reopened.getByRole('checkbox')).not.toBeChecked();
    await expect(reopened.getByRole('button', { name: 'Resume', exact: true })).toBeDisabled();
  });
}

test('native action: restricted page denies Start', async ({ context, fixture, invoke }) => {
  native(); const target = await context.newPage(); await target.goto(fixture.origin); const first = await invoke(target); await first.close();
  await target.goto('chrome://settings'); const popup = await invoke(target);
  await expect(popup.getByRole('status')).toContainText('Browser access: unavailable');
  await expect(popup.getByRole('button', { name: 'Start', exact: true })).toBeDisabled();
});

test('native action: genuine worker termination recovers PAUSED, explicit fresh Resume only', async ({ context, fixture, invoke }, info) => {
  native(); const target = await context.newPage(); await target.goto(fixture.origin); const popup = await invoke(target); await consent(popup, fixture.origin);
  const first = (await inspect(popup)).cases[0]!;
  const cdp = await context.newCDPSession(target);
  const versions: { versionId: string; scriptURL: string; runningStatus: string }[] = [];
  cdp.on('ServiceWorker.workerVersionUpdated', event => { versions.push(...event.versions); });
  await cdp.send('ServiceWorker.enable');
  await expect.poll(() => versions.find(version => version.scriptURL === `${popup.url().replace('/popup.html', '')}/background.js` && version.runningStatus === 'running')).toBeTruthy();
  const version = versions.find(version => version.scriptURL.endsWith('/background.js') && version.runningStatus === 'running')!;
  await cdp.send('ServiceWorker.stopWorker', { versionId: version.versionId });
  await expect.poll(() => versions.some(item => item.versionId === version.versionId && item.runningStatus === 'stopped')).toBe(true);
  const recovered = await inspect(popup); expect(recovered.cases[0]!.state).toBe('paused'); expect(recovered.cases[0]!.epoch).not.toBe(first.epoch);
  await popup.getByRole('button', { name: 'Refresh scope / status' }).click();
  await expect(popup.getByRole('button', { name: 'Resume', exact: true })).toBeDisabled();
  await consent(popup, fixture.origin, 'Resume');
  await info.attach('worker-restart.json', { body: JSON.stringify({ stoppedVersion: version.versionId, observedStopped: true, recovered: recovered.cases[0]!.state, epochRotated: recovered.cases[0]!.epoch !== first.epoch }), contentType: 'application/json' });
  await cdp.detach();
});

test('direct popup: real IDB retention, invalid records, quotas and concurrent delete replay', async ({ popup }) => {
  await inspect(popup);
  const now = Date.now();
  const make = (age: number, state = 'stopped') => ({ schema: 1, id: randomUUID(), epoch: randomUUID(), state, createdAt: now - age, updatedAt: now - age });
  await seedRows(popup, [make(LIMITS.ttl), make(LIMITS.duration, 'paused'), { ...make(0), rawUrl: 'SYNTHETIC_FORBIDDEN' }]);
  const cleaned = await inspect(popup); expect(cleaned.cases).toHaveLength(1); expect(cleaned.cases[0]!.state).toBe('stopped');
  expect(await dbRows(popup)).toEqual(cleaned.cases);
  await seedRows(popup, Array.from({ length: 10 }, () => make(0)));
  const full = await inspect(popup); expect(full.cases).toHaveLength(10);
  const row = full.cases[0]!;
  const replies = await Promise.all(Array.from({ length: 3 }, () => message(popup, { op: 'delete', requestId: randomUUID(), id: row.id, epoch: row.epoch })));
  expect(replies.filter(reply => reply.ok)).toHaveLength(1); expect(await dbRows(popup)).toHaveLength(9);
  const storeNames = await popup.evaluate(`new Promise(resolve => { const open = indexedDB.open('tracebridge', 1); open.onsuccess = () => { resolve([...open.result.objectStoreNames]); open.result.close(); }; })`);
  expect(storeNames).toEqual(['cases']);
});

test('native action: real browser quota exhaustion fails closed', async ({ context, fixture, invoke }, info) => {
  native(); const target = await context.newPage(); await target.goto(fixture.origin); const popup = await invoke(target);
  const cdp = await context.newCDPSession(popup);
  const origin = popup.url().replace('/popup.html', '');
  await cdp.send('Storage.overrideQuotaForOrigin', { origin, quotaSize: 1 });
  await popup.getByLabel('Authorized exact origin').fill(fixture.origin); await popup.getByRole('combobox', { name: /^Environment/ }).selectOption('local');
  await popup.getByRole('checkbox').check(); await popup.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(popup.getByRole('status')).toContainText('Session: error');
  await expect(popup.getByRole('status')).toContainText('Storage or initialization unavailable');
  expect(await dbRows(popup)).toEqual([]);
  await info.attach('quota.json', { body: JSON.stringify({ mechanism: 'CDP Storage.overrideQuotaForOrigin', quotaBytes: 1, state: 'error', headers: 0 }), contentType: 'application/json' });
  await cdp.send('Storage.overrideQuotaForOrigin', { origin }); await cdp.detach();
});

test('native action: selected-case Delete cannot touch another open session; Revoke pauses the open session', async ({ context, fixture, invoke }) => {
  native(); const target = await context.newPage(); await target.goto(fixture.origin); const popup = await invoke(target);
  await consent(popup, fixture.origin); const first = (await inspect(popup)).cases[0]!;
  await popup.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(popup.getByText('Case state: stopped.', { exact: false })).toBeVisible();
  await popup.getByRole('button', { name: 'Refresh scope / status' }).click(); await consent(popup, fixture.origin);
  const second = (await inspect(popup)).cases.find(row => row.state === 'recording')!;
  expect(second.id).not.toBe(first.id);
  await popup.getByRole('combobox', { name: /^Retained case/ }).selectOption(first.id);
  await expect(popup.getByRole('button', { name: 'Pause', exact: true })).toBeDisabled();
  await expect(popup.getByRole('button', { name: 'Stop', exact: true })).toBeDisabled();
  await popup.getByRole('button', { name: 'Delete selected case' }).click();
  await expect.poll(async () => (await dbRows(popup)).length).toBe(1);
  expect((await dbRows(popup))[0]!.id).toBe(second.id); expect((await dbRows(popup))[0]!.state).toBe('recording');
  await popup.getByRole('button', { name: 'Revoke consent' }).click();
  await expect(popup.getByRole('status')).toContainText('Session: paused');
});

test('native action: new browser window invalidates the original session and cannot inherit its binding', async ({ context, fixture, invoke }) => {
  native(); const target = await context.newPage(); await target.goto(fixture.origin); const popup = await invoke(target);
  await consent(popup, fixture.origin); const first = (await inspect(popup)).cases[0]!; const popupUrl = popup.url();
  const opened = context.waitForEvent('page');
  await popup.evaluate(`chrome.windows.create({url:${JSON.stringify(fixture.origin)},type:'normal'})`);
  const second = await opened; await second.waitForLoadState();
  const inspector = await context.newPage(); await inspector.goto(popupUrl);
  const result = await inspect(inspector); expect(result.cases[0]!.state).toBe('paused'); expect(result.cases[0]!.epoch).not.toBe(first.epoch);
  expect(result.boundIds).toEqual([]);
  expect((await message(inspector, { op: 'resume', requestId: randomUUID(), id: first.id, epoch: first.epoch, challenge: randomUUID(), declaration: { origin: fixture.origin, environment: 'local', authorized: true } })).ok).toBe(false);
});

test('native action: remote HTTPS-origin Staging authorization and worker production denial (intercepted synthetic page)', async ({ context, fixture, invoke }) => {
  native(); const target = await context.newPage(); await target.goto(fixture.syntheticHttpsOrigin); const popup = await invoke(target);
  await expect(popup.locator('strong')).toHaveText(fixture.syntheticHttpsOrigin);
  await popup.getByLabel('Authorized exact origin').fill(fixture.syntheticHttpsOrigin);
  await popup.getByRole('checkbox').check();
  await popup.getByRole('combobox', { name: /^Environment/ }).selectOption('production');
  await expect(popup.getByRole('button', { name: 'Start', exact: true })).toBeDisabled();
  const review = await inspect(popup);
  expect((await message(popup, { op: 'start', requestId: randomUUID(), challenge: review.challenge!, declaration: { origin: fixture.syntheticHttpsOrigin, environment: 'production', authorized: true } })).ok).toBe(false);
  expect(await dbRows(popup)).toEqual([]);
  await popup.getByRole('button', { name: 'Refresh scope / status' }).click();
  await popup.getByLabel('Authorized exact origin').fill(fixture.syntheticHttpsOrigin);
  await popup.getByRole('checkbox').check(); await popup.getByRole('combobox', { name: /^Environment/ }).selectOption('staging');
  await popup.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(popup.getByRole('status')).toContainText('Session: recording');
});
