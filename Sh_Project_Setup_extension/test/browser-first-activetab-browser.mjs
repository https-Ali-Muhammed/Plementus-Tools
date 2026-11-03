import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

// Disposable Chrome observations only; no product imports or synthetic invocation callbacks.
const roles = ['plementus', 'github', 'odoo-sh'];
const counts = { pass: 0, fail: 0, skip: 0, blocked: 0 };
const requests = { fixture: 0, unexpectedPage: 0, deniedProxy: 0, rejectedFixture: 0 };
const servers = [];
let root, context;

async function check(name, fn) {
  await fn(); counts.pass++; console.log(`PASS LOCAL_BROWSER_TESTED ${name}`);
}
function notRun(name, reason, blocked = false) {
  counts[blocked ? 'blocked' : 'skip']++;
  console.log(`${blocked ? 'BLOCKED' : 'SKIP'} NOT RUN ${name}: ${reason}`);
}
async function until(fn, message, timeout = 5000) {
  const deadline = Date.now() + timeout;
  do {
    const value = await fn();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 40));
  } while (Date.now() < deadline);
  throw new Error(message);
}
async function listen(server, host = '127.0.0.1') {
  servers.push(server);
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(0, host, resolve);
  });
  return `http://${host}:${server.address().port}`;
}
function fixture(role) {
  const file = path.join(root, `fixture-${role}.html`);
  fs.writeFileSync(file, `<!doctype html><title>Invented ${role}</title><link rel="icon" href="data:,"><h1>Invented ${role}</h1>`);
  return http.createServer((req, res) => {
    requests.fixture++;
    if (req.method !== 'GET' || !['127.0.0.1', '127.0.0.2'].includes(req.socket.remoteAddress)) {
      requests.rejectedFixture++; res.writeHead(403); return res.end();
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; object-src 'none'; frame-src 'none'");
    if (!['/', '/next'].includes(req.url)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(fs.readFileSync(file));
  });
}

try {
  const { chromium } = await import('playwright');
  const executable = chromium.executablePath();
  assert.ok(fs.existsSync(executable), 'existing Playwright-managed Chromium required');
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'bf05-activetab-'));
  const origins = {};
  for (const role of roles) origins[role] = await listen(fixture(role));
  const crossOrigin = await listen(fixture('cross-origin'), '127.0.0.2');
  const allowedOrigins = new Set([...Object.values(origins), crossOrigin]);
  // BF-03 isolation: this proxy never forwards, including browser-process requests.
  const proxy = http.createServer((req, res) => { requests.deniedProxy++; res.writeHead(403); res.end(); });
  proxy.on('connect', (req, socket) => {
    requests.deniedProxy++;
    // A peer reset must not escape the denying proxy and bypass finally cleanup.
    socket.on('error', () => socket.destroy());
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
  });
  const proxyOrigin = await listen(proxy);
  console.log(`ENV ${JSON.stringify({ node: process.version, executable, origins, crossOrigin, mode: 'headless=new' })}`);

  for (const variant of ['action', 'popup']) {
    const extension = path.join(root, `${variant}-extension`);
    const profile = path.join(root, `${variant}-profile`);
    fs.mkdirSync(extension); fs.mkdirSync(profile);
    const manifest = {
      manifest_version: 3, name: `BF05 disposable ${variant}`, version: '1.0',
      permissions: ['activeTab', 'scripting'], background: { service_worker: 'worker.js' },
      action: variant === 'action' ? {} : { default_popup: 'popup.html' },
      commands: { _execute_action: { suggested_key: { default: 'Ctrl+Shift+Y' } } },
    };
    fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
    fs.writeFileSync(path.join(extension, 'review.html'), '<!doctype html><title>BF05 disposable review</title><h1>Fixture review only</h1>');
    fs.writeFileSync(path.join(extension, 'popup.html'), '<!doctype html><title>BF05 disposable popup</title><h1>Fixture popup only</h1>');
    fs.writeFileSync(path.join(extension, 'worker.js'), `const boot = crypto.randomUUID(); const events = [];
chrome.action.onClicked.addListener(async tab => {
  const event = { kind: 'action.onClicked', tabId: tab.id, boot, complete: false };
  if (events.length >= 32) return;
  events.push(event);
  try {
    event.results = await chrome.scripting.executeScript({ target: { tabId: tab.id },
      func: () => ({ url: location.href, title: document.title }) });
  } catch { event.denied = true; }
  event.complete = true;
});
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('review.html') ||
      !message || message.kind !== 'status' || Object.keys(message).length !== 1) return;
  reply({ boot, events, accountVerified: false, executionAuthorized: false });
});`);
    let extensionOrigin;
    const launch = async () => {
      context = await chromium.launchPersistentContext(profile, { executablePath: executable, headless: false,
        args: ['--headless=new', '--disable-background-networking', '--disable-component-update', '--disable-sync',
          '--no-first-run', '--no-default-browser-check', `--proxy-server=${proxyOrigin}`,
          '--proxy-bypass-list=127.0.0.1;127.0.0.2',
          `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
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
    console.log(`CHROME ${context.browser().version()} variant=${variant}`);
    console.log(`MANIFEST ${JSON.stringify(manifest)}`);
    let review = await context.newPage(); await review.goto(`${extensionOrigin}/review.html`);
    const api = (fn, arg) => review.evaluate(fn, arg);
    const status = () => api(() => chrome.runtime.sendMessage({ kind: 'status' }));
    const get = id => api(id => chrome.tabs.get(id), id);
    const create = async url => {
      const tab = await api(url => chrome.tabs.create({ url, active: false }), url);
      await until(async () => (await get(tab.id)).status === 'complete', 'fixture load unavailable');
      return tab.id;
    };
    const pageFor = url => until(() => context.pages().find(page => page.url() === `${url}/` || page.url() === url), 'fixture page unavailable');
    const inject = (tabId, documentId) => api(async ({ tabId, documentId }) => {
      try {
        return { results: await chrome.scripting.executeScript({
          target: { tabId, ...(documentId ? { documentIds: [documentId] } : {}) },
          func: () => ({ url: location.href, title: document.title }),
        }) };
      } catch (error) {
        return { denied: /Cannot access contents|Missing host permission|Cannot access a chrome:/i.test(error.message),
          missing: /No tab with id|No document with id|No frame with id/i.test(error.message) };
      }
    }, { tabId, documentId });
    const bound = [];
    for (const role of roles) bound.push({ role, tabId: await create(origins[role]) });
    const duplicate = await create(origins.github);
    await check(`${variant}: minimal manifest and unavailable navigation API`, async () => {
      assert.deepEqual(await api(() => chrome.permissions.getAll()), { permissions: ['activeTab', 'scripting'], origins: [] });
      assert.equal(await api(() => typeof chrome.webNavigation), 'undefined');
      assert.equal(await api(() => chrome.action.getPopup({})), variant === 'action' ? '' : `${extensionOrigin}/popup.html`);
    });
    await check(`${variant}: explicit fixture IDs are distinct`, () => {
      assert.equal(new Set([...bound.map(x => x.tabId), duplicate]).size, 4);
    });
    await check(`${variant}: selection and programmatic activation do not grant activeTab`, async () => {
      for (const { tabId } of bound) {
        await api(tabId => chrome.tabs.update(tabId, { active: true }), tabId);
        assert.equal((await inject(tabId)).denied, true);
        assert.equal((await get(tabId)).url, undefined);
      }
      assert.equal((await inject(duplicate)).denied, true);
      assert.deepEqual((await status()).events, []);
    });
    const commands = await api(() => chrome.commands.getAll());
    console.log(`SHORTCUT ${JSON.stringify({ variant, commands })}`);
    const registered = commands.some(command => command.name === '_execute_action' && command.shortcut === 'Ctrl+Shift+Y');
    let allInvoked = variant === 'action';
    for (const { role, tabId } of (variant === 'action' ? bound : [bound[0]])) {
      const fixturePage = await pageFor(origins[role]);
      await api(tabId => chrome.tabs.update(tabId, { active: true }), tabId);
      await fixturePage.bringToFront();
      assert.equal((await get(tabId)).active, true);
      if (!registered) {
        notRun(`${variant}: genuine invocation ${role}`, 'declared shortcut not registered', true);
        allInvoked = false; continue;
      }
      // Keyboard input only: Chrome must recognize _execute_action; no direct extension callback or permission override.
      const beforeInvocation = await status();
      console.log(`ATTEMPT ${JSON.stringify({ variant, role, expectedTabId: tabId, active: true, shortcut: 'Ctrl+Shift+Y' })}`);
      await fixturePage.keyboard.press('Control+Shift+Y');
      let observed;
      try {
        observed = await until(async () => {
          const current = await status();
          if (variant === 'action') return current.events.find(event => event.tabId === tabId && event.complete);
          const popups = await api(() => chrome.runtime.getContexts({ contextTypes: ['POPUP'] }));
          return popups.find(popup => popup.documentUrl === `${extensionOrigin}/popup.html`);
        }, 'invocation not observed');
      } catch (error) {
        if (error.message !== 'invocation not observed') throw error;
        const afterInvocation = await status();
        assert.equal(afterInvocation.boot, beforeInvocation.boot);
        assert.deepEqual(afterInvocation.events, beforeInvocation.events);
        assert.equal((await inject(tabId)).denied, true);
        notRun(`${variant}: genuine invocation ${role}`, 'registered shortcut keyboard input produced no observable Chrome action/popup or scripting grant', true);
        allInvoked = false; continue;
      }
      console.log(`INVOCATION ${JSON.stringify({ variant, role, tabId, observed })}`);
      await check(`${variant}: recognized invocation and invoking-tab scripting ${role}`, async () => {
        if (variant === 'action') {
          assert.equal(observed.kind, 'action.onClicked'); assert.equal(observed.tabId, tabId);
          assert.equal(observed.results[0].result.url, `${origins[role]}/`);
          assert.equal(observed.results[0].frameId, 0);
        } else assert.deepEqual((await status()).events, []);
        assert.equal((await inject(tabId)).results[0].result.url, `${origins[role]}/`);
      });
      if (variant === 'action') await check(`sequential ${role}: prior grants remain usable, unrelated tab denied`, async () => {
        for (const prior of bound.slice(0, bound.findIndex(x => x.role === role) + 1)) assert.ok((await inject(prior.tabId)).results);
        assert.equal((await inject(duplicate)).denied, true);
        assert.equal((await get(duplicate)).url, undefined);
      });
    }
    if (variant === 'action' && allInvoked) {
      await check('all three separately invoked grants are simultaneously usable', async () => {
        for (const { role, tabId } of bound) assert.equal((await inject(tabId)).results[0].result.url, `${origins[role]}/`);
      });
      const selected = bound[0], selectedPage = await pageFor(origins.plementus);
      let before = (await inject(selected.tabId)).results[0];
      await selectedPage.goto(`${origins.plementus}/next`);
      await check('same-origin full navigation retains grant, changes document', async () => {
        const after = (await inject(selected.tabId)).results[0];
        assert.notEqual(after.documentId, before.documentId); assert.equal(after.result.url, `${origins.plementus}/next`);
      });
      before = (await inject(selected.tabId)).results[0]; await selectedPage.reload();
      await check('reload retains grant; stale document targeting rejected', async () => {
        assert.notEqual((await inject(selected.tabId)).results[0].documentId, before.documentId);
        assert.equal((await inject(selected.tabId, before.documentId)).missing, true);
      });
      await selectedPage.goto(crossOrigin);
      await check('cross-origin navigation revokes invoked access', async () => {
        assert.equal((await inject(selected.tabId)).denied, true); assert.equal((await get(selected.tabId)).url, undefined);
      });
      await selectedPage.goto(origins.plementus);
      await check('return to original origin does not restore the revoked grant', async () => assert.equal((await inject(selected.tabId)).denied, true));
      const closed = bound[1].tabId; await api(id => chrome.tabs.remove(id), closed);
      const replacement = await create(origins.github);
      await check('closure and same-URL reopening require a fresh invocation', async () => {
        assert.notEqual(replacement, closed); assert.equal((await inject(closed)).missing, true);
        assert.equal((await inject(replacement)).denied, true); assert.equal((await inject(duplicate)).denied, true);
      });
    } else if (variant === 'action') {
      for (const name of ['simultaneous three grants', 'same-origin navigation grant retention', 'reload grant retention and stale-document targeting',
        'cross-origin grant revocation and return', 'invoked-tab closure/reopening', 'duplicate-origin granted/ungranted distinction']) {
        notRun(name, 'genuine action invocation prerequisite unavailable');
      }
    }
    await api(id => chrome.tabs.remove(id), duplicate);
    const duplicateReplacement = await create(origins.github);
    await check(`${variant}: uninvoked duplicate closure/reopening has a new ID and no access`, async () => {
      assert.notEqual(duplicateReplacement, duplicate);
      assert.equal((await inject(duplicate)).missing, true);
      assert.equal((await inject(duplicateReplacement)).denied, true);
    });
    const beforeReview = await status(); await review.close(); review = await context.newPage(); await review.goto(`${extensionOrigin}/review.html`);
    await check(`${variant}: packaged review close/reopen is observable without invocation`, async () => {
      const after = await status();
      assert.equal(after.accountVerified, false); assert.equal(after.executionAuthorized, false);
      if (after.boot === beforeReview.boot) assert.deepEqual(after.events, beforeReview.events);
      else assert.deepEqual(after.events, []);
    });
    if (variant === 'action') {
      let cdp;
      try {
        cdp = await context.newCDPSession(review);
        const versions = [];
        cdp.on('ServiceWorker.workerVersionUpdated', event => versions.push(...event.versions.filter(v => v.scriptURL === `${extensionOrigin}/worker.js`)));
        await cdp.send('ServiceWorker.enable');
        const before = await status();
        const running = await until(() => versions.findLast(v => v.runningStatus === 'running'), 'worker version unavailable');
        await cdp.send('ServiceWorker.stopWorker', { versionId: running.versionId });
        await until(() => versions.some(v => v.versionId === running.versionId && v.runningStatus === 'stopped'), 'worker stop unavailable');
        await check('forced worker restart changes boot; status request does not fabricate invocation', async () => {
          const after = await status(); assert.notEqual(after.boot, before.boot); assert.deepEqual(after.events, []);
          assert.equal(after.accountVerified, false); assert.equal(after.executionAuthorized, false);
        });
        const access = await inject(bound[2].tabId);
        console.log(`POST_WORKER_ACCESS ${JSON.stringify(access)}`);
        if (!allInvoked) await check('forced worker restart does not create a previously missing grant', () => assert.equal(access.denied, true));
      } catch (error) {
        if (!/worker (version|stop) unavailable|not supported/.test(error.message)) throw error;
        notRun('forced worker restart', 'controlled worker stop unavailable');
      } finally { if (cdp) { await cdp.send('ServiceWorker.disable').catch(() => {}); await cdp.detach(); } }
      const before = await status(); await context.close(); context = undefined;
      await launch(); review = await context.newPage(); await review.goto(`${extensionOrigin}/review.html`);
      await check('controlled browser restart changes boot and retains no invocation evidence', async () => {
        const after = await status(); assert.notEqual(after.boot, before.boot); assert.deepEqual(after.events, []);
        assert.equal(after.accountVerified, false); assert.equal(after.executionAuthorized, false);
      });
      const reopened = await create(origins['odoo-sh']);
      await check('new fixture after controlled browser restart has no scripting grant', async () => assert.equal((await inject(reopened)).denied, true));
      if (!allInvoked) notRun('grant behavior across review/worker/browser restart', 'no actual invocation grants existed; controlled lifecycle observations are narrower');
    } else notRun('actual popup focus-loss/close/reopen', 'requires an observable genuine action popup; review-page lifecycle is narrower evidence');
    await context.close(); context = undefined;
  }
  notRun('natural idle suspension, crashes, session restoration, prerender replacement and expiry policy', 'not induced; no product capability expiry policy implemented');
  notRun('optional permission prompt denial/removal', 'no optional permissions declared or requested');
  await check('network allowlist and read-only fixture boundary', () => {
    assert.equal(requests.unexpectedPage, 0); assert.equal(requests.rejectedFixture, 0); assert.ok(requests.fixture > 0);
  });
} catch (error) {
  if (!root && /Cannot find package 'playwright'|existing Playwright-managed Chromium required/.test(error.message)) {
    notRun('installed browser prerequisite', 'installed Playwright/Chromium unavailable', true);
  } else { counts.fail++; console.error(`FAIL ${error.stack}`); }
} finally {
  try { if (context) await context.close(); }
  catch { counts.fail++; console.error('FAIL disposable browser close'); }
  for (const server of servers) {
    try {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close(error => error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve()));
    } catch { counts.fail++; console.error('FAIL disposable server close'); }
  }
  try {
    if (root) {
      assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith('bf05-activetab-'));
      assert.equal(fs.lstatSync(root).uid, process.getuid()); fs.rmSync(root, { recursive: true });
      await check('all disposable contexts, servers, extensions and profiles cleaned', () => {
        assert.equal(fs.existsSync(root), false); assert.ok(servers.every(server => !server.listening));
      });
    }
  } catch { counts.fail++; console.error('FAIL disposable directory cleanup'); }
  console.log(`RESULT ${JSON.stringify({ ...counts, cases: Object.values(counts).reduce((a, b) => a + b, 0), requests,
    accountVerified: false, executionAuthorized: false })}`);
  if (counts.fail || counts.blocked) process.exitCode = 1;
}
