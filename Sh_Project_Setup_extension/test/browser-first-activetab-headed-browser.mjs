import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

// Disposable Chrome observations: only the human may invoke the toolbar action.
const roles = ['plementus', 'github', 'odoo-sh'];
const counts = { pass: 0, fail: 0, skip: 0, blocked: 0 };
const lifecycle = { pass: 0, fail: 0, skip: 0, blocked: 0 };
const lifecycleCases = ['same-origin navigation', 'reload and stale-document rejection',
  'cross-origin navigation', 'return after cross-origin navigation', 'tab closure and same-URL reopening',
  'review-page closure/reopening', 'controlled worker restart', 'controlled browser restart'];
const requests = { fixture: 0, unexpectedPage: 0, deniedProxy: 0, rejectedFixture: 0 };
const servers = [], sockets = new Set();
const observations = { actions: [], invocations: [], distinctGrants: 0, coexistence: false };
let root, context, input, visible = false, stopped, browserPid;
const completedLifecycle = new Set();
const stop = () => { stopped = 'process interrupted'; };
process.once('SIGINT', stop); process.once('SIGTERM', stop);

function blocked(reason) { throw Object.assign(new Error(reason), { blocked: true }); }
async function check(name, fn, isLifecycle = false) {
  try { await fn(); }
  catch (error) {
    if (isLifecycle) { lifecycle.fail++; completedLifecycle.add(name); }
    throw error;
  }
  counts.pass++;
  if (isLifecycle) { lifecycle.pass++; completedLifecycle.add(name); }
  console.log(`PASS LOCAL_BROWSER_TESTED ${name}`);
}
function notRun(name, reason, isLifecycle = false, isBlocked = true) {
  const result = isBlocked ? 'blocked' : 'skip';
  counts[result]++;
  if (isLifecycle) { lifecycle[result]++; completedLifecycle.add(name); }
  console.log(`${result.toUpperCase()} NOT_RUN ${name}: ${reason}`);
}
async function until(fn, message, timeout = 5000) {
  const end = Date.now() + timeout;
  do {
    if (stopped) blocked(stopped);
    const value = await fn();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 100));
  } while (Date.now() < end);
  blocked(message);
}
async function listen(server, host = '127.0.0.1') {
  servers.push(server);
  server.on('connection', socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => socket.destroy());
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, host, resolve); });
  return `http://${host}:${server.address().port}`;
}
function fixture(role) {
  const file = path.join(root, `fixture-${role}.html`);
  fs.writeFileSync(file, `<!doctype html><title>BF05-R1 ${role}</title><link rel="icon" href="data:,">
<h1>BF05-R1 invented ${role}</h1><p>Local fixture only. No accounts or business actions.</p>
<p>When the chat requests this role, personally activate this tab and click BF05-R1 human action in Chrome's toolbar.</p>
<p>Never invoke on a duplicate or negative-control tab.</p>`);
  return http.createServer((req, res) => {
    requests.fixture++;
    if (req.method !== 'GET' || !['127.0.0.1', '127.0.0.2'].includes(req.socket.remoteAddress) || !['/', '/next', '/duplicate'].includes(req.url)) {
      requests.rejectedFixture++; res.writeHead(403); return res.end();
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; object-src 'none'; frame-src 'none'");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const html = fs.readFileSync(file, 'utf8');
    res.end(req.url === '/duplicate' ? html.replace(`<title>BF05-R1 ${role}</title>`, '<title>BF05-R1 DUPLICATE DO NOT INVOKE</title>') : html);
  });
}
function mappedWindow(pid) {
  // Read PID properties only on other windows; inspect geometry/title only for our browser.
  const ids = execFileSync('xprop', ['-root', '_NET_CLIENT_LIST'], { encoding: 'utf8', timeout: 5000 }).match(/0x[0-9a-f]+/gi) || [];
  for (const id of ids) {
    let owner;
    try { owner = execFileSync('xprop', ['-id', id, '_NET_WM_PID'], { encoding: 'utf8', timeout: 5000 }); }
    catch { continue; }
    if (!new RegExp(`= ${pid}\\s*$`).test(owner)) continue;
    const info = execFileSync('xwininfo', ['-id', id], { encoding: 'utf8', timeout: 5000 });
    if (/Map State: IsViewable/.test(info) && /Width: [1-9]\d*/.test(info) && /Height: [1-9]\d*/.test(info)) return id;
  }
}

try {
  const { chromium } = await import('playwright');
  const executable = chromium.executablePath();
  if (!fs.existsSync(executable)) blocked('installed Playwright-managed Chromium unavailable');
  if (!process.env.DISPLAY) blocked('X11 display unavailable; no virtual/headless substitute');
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'bf05-r1-headed-'));
  const origins = {};
  for (const role of roles) origins[role] = await listen(fixture(role));
  const negativeOrigin = await listen(fixture('negative-control'), '127.0.0.2');
  const allowedOrigins = new Set([...Object.values(origins), negativeOrigin]);
  // The proxy never forwards, including browser-process requests outside Playwright routing.
  const proxy = http.createServer((req, res) => { requests.deniedProxy++; res.writeHead(403); res.end(); });
  proxy.on('connect', (req, socket) => {
    requests.deniedProxy++; socket.on('error', () => socket.destroy());
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
  });
  const proxyOrigin = await listen(proxy);
  const extension = path.join(root, 'extension'), profile = path.join(root, 'profile');
  fs.mkdirSync(extension); fs.mkdirSync(profile);
  const manifest = { manifest_version: 3, name: 'BF05-R1 human action', version: '1.0',
    permissions: ['activeTab', 'scripting'], background: { service_worker: 'worker.js' },
    action: { default_title: 'BF05-R1 human action' } };
  fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
  fs.writeFileSync(path.join(extension, 'review.html'), `<!doctype html><title>BF05-R1 instructions</title>
<h1>BF05-R1 disposable human-toolbar experiment</h1><p>Confirm visibility and toolbar access in the chat first.</p>
<p>Open Chrome's puzzle-piece Extensions menu and pin BF05-R1 human action. Do not click its action yet.</p>
<p>Wait for each chat instruction. Personally activate plementus, then github, then odoo-sh and click the pinned action once per requested role.</p>
<p>Do not click on the duplicate, negative control or this page. Local fixtures only; no business authority.</p>`);
  fs.writeFileSync(path.join(extension, 'worker.js'), `const boot = crypto.randomUUID(); const events = [];
const origins = new Set(${JSON.stringify(Object.values(origins))});
chrome.action.onClicked.addListener(async tab => {
  if (events.length >= 8) return;
  const event = { kind: 'action.onClicked', tabId: tab.id, boot, complete: false };
  events.push(event);
  try {
    event.tabUrlAvailable = typeof tab.url === 'string';
    event.fixtureOrigin = event.tabUrlAvailable && origins.has(new URL(tab.url).origin);
    if (!event.fixtureOrigin) throw new Error('non-fixture');
    event.results = await chrome.scripting.executeScript({ target: { tabId: tab.id },
      func: () => ({ url: location.href, title: document.title }) });
  } catch (error) {
    event.denied = true;
    event.failure = !event.tabUrlAvailable ? 'invoking_url_unavailable' : !event.fixtureOrigin ? 'non_fixture_origin' :
      /Cannot access contents|Missing host permission|cannot access the page|must invoke the extension/i.test(error.message) ? 'scripting_access_denied' :
      /No tab with id|No document with id|No frame with id/i.test(error.message) ? 'target_unavailable' : 'unclassified_script_failure';
  }
  event.complete = true;
});
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('review.html') ||
      !message || message.kind !== 'status' || Object.keys(message).length !== 1) return;
  reply({ boot, events, accountVerified: false, executionAuthorized: false });
});`);
  let extensionOrigin;
  const launch = async () => {
    try {
      context = await chromium.launchPersistentContext(profile, { executablePath: executable, headless: false,
        args: ['--disable-background-networking', '--disable-component-update', '--disable-sync',
          '--no-first-run', '--no-default-browser-check', '--window-size=1280,900',
          `--proxy-server=${proxyOrigin}`, '--proxy-bypass-list=127.0.0.1;127.0.0.2',
          `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
    } catch { blocked('headed Chromium launch unavailable; no headless substitute'); }
    context.setDefaultTimeout(5000);
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if ((extensionOrigin && url.href.startsWith(`${extensionOrigin}/`)) || allowedOrigins.has(url.origin)) return route.continue();
      requests.unexpectedPage++; return route.abort('blockedbyclient');
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 10000 });
    extensionOrigin = worker.url().slice(0, worker.url().indexOf('/', 'chrome-extension://'.length));
  };
  await launch();
  console.log(`ENV ${JSON.stringify({ node: process.version, executable, chrome: context.browser().version(), mode: 'headed', root, manifest })}`);
  let review = await context.newPage(); await review.goto(`${extensionOrigin}/review.html`);
  const api = (fn, arg) => review.evaluate(fn, arg);
  const status = async () => {
    const value = await api(() => chrome.runtime.sendMessage({ kind: 'status' }));
    assert.equal(value.accountVerified, false); assert.equal(value.executionAuthorized, false); return value;
  };
  const get = id => api(id => chrome.tabs.get(id), id);
  const create = async url => {
    const tab = await api(url => chrome.tabs.create({ url, active: false }), url);
    await until(async () => (await get(tab.id)).status === 'complete', 'fixture load unavailable');
    return tab.id;
  };
  const inject = (tabId, documentId) => api(async ({ tabId, documentId }) => {
    try {
      return { results: await chrome.scripting.executeScript({
        target: { tabId, ...(documentId ? { documentIds: [documentId] } : {}) },
        func: () => ({ url: location.href, title: document.title }),
      }) };
    } catch (error) {
      return { denied: /Cannot access contents|Missing host permission/i.test(error.message),
        missing: /No tab with id|No document with id|No frame with id/i.test(error.message),
        cannotAccessPage: /cannot access the page/i.test(error.message),
        invocationRequired: /must invoke the extension/i.test(error.message) };
    }
  }, { tabId, documentId });
  const bound = [];
  for (const role of roles) bound.push({ role, tabId: await create(`${origins[role]}/`) });
  const duplicate = await create(`${origins.github}/duplicate`), negative = await create(`${negativeOrigin}/`);
  const browserCDP = await context.browser().newBrowserCDPSession();
  try { browserPid = (await browserCDP.send('SystemInfo.getProcessInfo')).processInfo.find(p => p.type === 'browser').id; }
  finally { await browserCDP.detach(); }
  let windowId;
  try { windowId = await until(() => mappedWindow(browserPid), 'disposable X11 window not mapped'); }
  catch { blocked('mapped disposable window unavailable; GUI prerequisite not established'); }
  console.log(`GUI_READY ${JSON.stringify({ browserPid, windowId, instruction: 'Operator must confirm visible window and accessible pinned action before any test. stdin: visible or blocked.' })}`);
  input = readline.createInterface({ input: process.stdin });
  input.on('line', line => {
    if (line.trim() === 'visible') visible = true;
    if (['blocked', 'stop'].includes(line.trim())) stopped = 'operator reports GUI/toolbar unavailable or requests stop';
  });
  await until(() => visible, 'operator visibility/access confirmation unavailable', 300000);
  await check('headed window mapped and operator confirms visible accessible toolbar', () => assert.ok(mappedWindow(browserPid)));
  await check('only activeTab/scripting, no popup or navigation permission', async () => {
    assert.deepEqual(await api(() => chrome.permissions.getAll()), { permissions: ['activeTab', 'scripting'], origins: [] });
    assert.equal(await api(() => chrome.action.getPopup({})), '');
    assert.equal(await api(() => typeof chrome.webNavigation), 'undefined');
  });
  await check('negative access before any human invocation', async () => {
    assert.equal(new Set([...bound.map(x => x.tabId), duplicate, negative]).size, 5);
    console.log(`PRE_INVOCATION_EVENTS ${JSON.stringify(await status())}`);
    for (const id of [...bound.map(x => x.tabId), duplicate, negative]) {
      const result = await inject(id);
      console.log(`NEGATIVE_PROBE ${JSON.stringify({ tabId: id, hasResults: Boolean(result.results), ...(!result.results ? result : {}) })}`);
      assert.equal(result.denied, true); assert.equal((await get(id)).url, undefined);
    }
    assert.deepEqual((await status()).events, []);
  });
  for (let index = 0; index < bound.length; index++) {
    const { role, tabId } = bound[index], before = await status();
    assert.equal(before.events.length, index);
    console.log(`HUMAN_CLICK_REQUIRED ${JSON.stringify({ role, expectedTabId: tabId, instruction: 'Personally activate this role fixture tab and click the pinned BF05-R1 human action once. No keyboard shortcut.' })}`);
    const event = await until(async () => {
      const current = await status();
      assert.equal(current.boot, before.boot, 'worker restarted during human invocation sequence');
      assert.ok(current.events.length <= index + 1, 'extra action invocation');
      if (current.events.length === index) return;
      assert.equal(current.events[index].tabId, tabId, 'wrong invoking tab');
      return current.events[index].complete && current.events[index];
    }, `genuine human action not observed for ${role}`, 300000);
    observations.actions.push({ role, ...event }); console.log(`ACTION_EVENT ${JSON.stringify({ role, ...event })}`);
    await check(`genuine action.onClicked and bounded invoking-tab read: ${role}`, async () => {
      assert.equal(event.kind, 'action.onClicked'); assert.equal(event.tabId, tabId);
      assert.equal(event.results?.length, 1); assert.equal(event.results[0].frameId, 0);
      assert.equal(event.results[0].result.url, `${origins[role]}/`);
      assert.equal(event.results[0].result.title, `BF05-R1 ${role}`);
      assert.ok(event.results[0].documentId);
      observations.invocations.push({ role, ...event }); console.log(`INVOCATION ${JSON.stringify({ role, ...event })}`);
    });
    await check(`sequential grant isolation after ${role}`, async () => {
      for (const [position, item] of bound.entries()) {
        const result = await inject(item.tabId);
        if (position <= index) assert.equal(result.results?.[0].result.url, `${origins[item.role]}/`);
        else assert.equal(result.denied, true);
      }
      for (const id of [duplicate, negative]) assert.equal((await inject(id)).denied, true);
      observations.distinctGrants = index + 1;
    });
  }
  await check('three independently invoked grants coexist', async () => {
    for (const { role, tabId } of bound) assert.equal((await inject(tabId)).results?.[0].result.url, `${origins[role]}/`);
    assert.equal((await status()).events.length, 3); observations.coexistence = true;
  });
  console.log('HUMAN_CLICKS_COMPLETE No further clicks needed. Automatic local lifecycle observations begin.');
  const selected = bound[0];
  const selectedPage = context.pages().find(p => p.url() === `${origins.plementus}/`);
  let before = (await inject(selected.tabId)).results[0];
  await selectedPage.goto(`${origins.plementus}/next`);
  await check(lifecycleCases[0], async () => {
    const after = (await inject(selected.tabId)).results[0];
    assert.notEqual(after.documentId, before.documentId); assert.equal(after.result.url, `${origins.plementus}/next`);
  }, true);
  before = (await inject(selected.tabId)).results[0]; await selectedPage.reload();
  await check(lifecycleCases[1], async () => {
    assert.notEqual((await inject(selected.tabId)).results[0].documentId, before.documentId);
    assert.equal((await inject(selected.tabId, before.documentId)).missing, true);
  }, true);
  await selectedPage.goto(negativeOrigin);
  await check(lifecycleCases[2], async () => assert.equal((await inject(selected.tabId)).denied, true), true);
  await selectedPage.goto(origins.plementus);
  await check(lifecycleCases[3], async () => assert.equal((await inject(selected.tabId)).denied, true), true);
  const closed = bound[1].tabId; await api(id => chrome.tabs.remove(id), closed);
  const replacement = await create(`${origins.github}/`);
  await check(lifecycleCases[4], async () => {
    assert.notEqual(replacement, closed); assert.equal((await inject(closed)).missing, true);
    for (const id of [replacement, duplicate, negative]) assert.equal((await inject(id)).denied, true);
  }, true);
  const retained = bound[2];
  const assertRetained = async () => assert.equal((await inject(retained.tabId)).results?.[0].result.url, `${origins['odoo-sh']}/`);
  const beforeReview = await status();
  await api(() => { window.reviewMarker = 'fixture-only'; });
  await review.close(); review = await context.newPage(); await review.goto(`${extensionOrigin}/review.html`);
  await check(lifecycleCases[5], async () => {
    assert.equal(await api(() => window.reviewMarker), undefined);
    const after = await status();
    if (after.boot === beforeReview.boot) assert.deepEqual(after.events, beforeReview.events);
    else assert.deepEqual(after.events, []);
    await assertRetained();
  }, true);
  let cdp;
  try {
    cdp = await context.newCDPSession(review);
    const versions = [];
    cdp.on('ServiceWorker.workerVersionUpdated', e => versions.push(...e.versions.filter(v => v.scriptURL === `${extensionOrigin}/worker.js`)));
    await cdp.send('ServiceWorker.enable'); const beforeWorker = await status();
    const running = await until(() => versions.findLast(v => v.runningStatus === 'running'), 'worker version unavailable');
    await cdp.send('ServiceWorker.stopWorker', { versionId: running.versionId });
    await until(() => versions.some(v => v.versionId === running.versionId && v.runningStatus === 'stopped'), 'worker stop unavailable');
    await check(lifecycleCases[6], async () => {
      const after = await status(); assert.notEqual(after.boot, beforeWorker.boot); assert.deepEqual(after.events, []);
      await assertRetained(); assert.equal((await inject(duplicate)).denied, true);
    }, true);
  } catch (error) {
    if (stopped) throw error;
    if (!error.blocked && !/not supported|wasn't found|not found/.test(error.message)) throw error;
    notRun(lifecycleCases[6], 'controlled worker termination unavailable', true, false);
  } finally { if (cdp) { await cdp.send('ServiceWorker.disable').catch(() => {}); await cdp.detach(); } }
  const beforeBrowser = await status(); await context.close(); context = undefined;
  await launch(); review = await context.newPage(); await review.goto(`${extensionOrigin}/review.html`);
  const reopened = await create(`${origins['odoo-sh']}/`);
  await check(lifecycleCases[7], async () => {
    const after = await status(); assert.notEqual(after.boot, beforeBrowser.boot); assert.deepEqual(after.events, []);
    assert.equal((await inject(reopened)).denied, true);
  }, true);
  notRun('same-tab grant across crash/session restoration', 'controlled close and new tab only; no session restoration', true, false);
  notRun('natural idle, prerender/BFCache, optional grant prompts, real popup lifecycle', 'not induced; no optional grants or popup declared', true, false);
} catch (error) {
  if (error.blocked || /Cannot find package 'playwright'/.test(error.message)) notRun('headed human invocation prerequisite', error.blocked ? error.message : 'installed Playwright unavailable');
  else { counts.fail++; console.error(`FAIL ${error.stack}`); }
  for (const name of lifecycleCases) if (!completedLifecycle.has(name)) notRun(name, 'genuine invocation/coexistence or earlier lifecycle prerequisite incomplete', true);
} finally {
  if (input) input.close();
  let cleanup = true;
  try { if (context) await context.close(); }
  catch { cleanup = false; console.error('FAIL disposable browser close'); }
  for (const socket of sockets) socket.destroy();
  for (const server of servers) {
    try {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close(e => e && e.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(e) : resolve()));
      assert.equal(server.listening, false);
    } catch { cleanup = false; console.error('FAIL disposable server close'); }
  }
  try {
    if (root) {
      assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith('bf05-r1-headed-'));
      assert.equal(fs.lstatSync(root).uid, process.getuid()); fs.rmSync(root, { recursive: true });
      assert.equal(fs.existsSync(root), false);
    }
    assert.equal(sockets.size, 0);
  } catch { cleanup = false; console.error('FAIL disposable directory/socket cleanup'); }
  try { assert.equal(requests.unexpectedPage, 0); assert.equal(requests.rejectedFixture, 0); }
  catch { counts.fail++; console.error('FAIL local traffic boundary'); }
  if (cleanup) { counts.pass++; console.log('PASS LOCAL_BROWSER_TESTED verified profile/extension removal and servers closed'); }
  else counts.fail++;
  console.log(`RESULT ${JSON.stringify({ ...counts, lifecycle, observations, requests, cleanup,
    accountVerified: false, executionAuthorized: false })}`);
  if (counts.fail || counts.blocked) process.exitCode = 1;
}
