import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

// Standalone local observation harness; never import or adapt BF-01's synthetic evaluator.
const roles = ['plementus', 'github', 'odoo-sh'];
const variants = [
  { name: 'restricted', permissions: [] },
  { name: 'metadata', permissions: ['tabs', 'scripting', 'activeTab'] },
  { name: 'host', permissions: ['scripting', 'webNavigation'], host_permissions: ['http://127.0.0.1/*'] },
];
const counts = { pass: 0, fail: 0, skip: 0, blocked: 0 };
const requests = { fixture: 0, unexpectedPage: 0, deniedProxy: 0 };
const servers = [];
let root, context;

async function check(name, fn, tier = 'LOCAL_BROWSER_TESTED') {
  await fn(); counts.pass++;
  console.log(`PASS ${tier} ${name}`);
}
function skip(name, reason) {
  counts.skip++; console.log(`SKIP NOT_RUN ${name}: ${reason}`);
}
async function listen(server, host = '127.0.0.1') {
  servers.push(server);
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(0, host, resolve);
  });
  return `http://${host}:${server.address().port}`;
}
function fixture(role) {
  return http.createServer((req, res) => {
    requests.fixture++;
    if (req.method !== 'GET' || !['127.0.0.1', '127.0.0.2'].includes(req.socket.remoteAddress)) {
      res.writeHead(403); return res.end();
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; connect-src 'none'; object-src 'none'; frame-src 'none'");
    if (req.url === '/fixture.js') {
      res.setHeader('Content-Type', 'text/javascript');
      return res.end("document.querySelector('#route').addEventListener('click', e => { e.preventDefault(); history.pushState(null, '', '/route'); });");
    }
    if (!['/', '/next', '/route'].includes(req.url)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><title>Invented ${role} fixture</title><link rel="icon" href="data:,">
      <h1>Invented ${role} fixture</h1><a id="fragment" href="#route">Fragment</a>
      <a id="route" href="/route">History route</a><a id="next" href="/next">Full navigation</a>
      <script src="/fixture.js"></script>`);
  });
}
async function until(fn, message) {
  const deadline = Date.now() + 5000;
  do {
    const result = await fn();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 40));
  } while (Date.now() < deadline);
  throw new Error(message);
}
function validateSelection(selection) {
  assert.equal(selection.length, 3);
  assert.deepEqual(selection.map(x => x.role).sort(), [...roles].sort());
  assert.equal(new Set(selection.map(x => x.tabId)).size, 3);
  assert.ok(selection.every(x => Number.isSafeInteger(x.tabId) && x.tabId > 0));
}

try {
  const { chromium } = await import('playwright');
  const executable = chromium.executablePath();
  assert.ok(fs.existsSync(executable), 'existing Playwright-managed Chromium required');
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'bf03-chrome-fixture-'));
  const origins = {
    plementus: await listen(fixture('plementus')),
    github: await listen(fixture('github')),
    'odoo-sh': await listen(fixture('odoo-sh')),
  };
  const crossOrigin = await listen(fixture('cross-origin'), '127.0.0.2');
  const allowedOrigins = new Set([...Object.values(origins), crossOrigin]);
  // No forwarding: even browser-process traffic bypassing Playwright cannot reach external hosts via this proxy.
  const proxy = http.createServer((req, res) => { requests.deniedProxy++; res.writeHead(403); res.end(); });
  proxy.on('connect', (req, socket) => { requests.deniedProxy++; socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); });
  const proxyOrigin = await listen(proxy);
  console.log(`ENV ${JSON.stringify({ node: process.version, executable, origins, crossOrigin, mode: 'headless=new', accountVerified: false, executionAuthorized: false })}`);

  for (const variant of variants) {
    const extension = path.join(root, `${variant.name}-extension`);
    const profile = path.join(root, `${variant.name}-profile`);
    fs.mkdirSync(extension); fs.mkdirSync(profile);
    const manifest = { manifest_version: 3, name: `BF03 isolated ${variant.name}`, version: '1.0',
      permissions: variant.permissions, ...(variant.host_permissions ? { host_permissions: variant.host_permissions } : {}),
      background: { service_worker: 'worker.js' }, action: { default_popup: 'popup.html' } };
    fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
    fs.writeFileSync(path.join(extension, 'probe.html'), '<!doctype html><title>BF03 local probe</title>');
    fs.writeFileSync(path.join(extension, 'popup.html'), '<!doctype html><title>BF03 disposable popup</title>');
    fs.writeFileSync(path.join(extension, 'worker.js'), `const boot = crypto.randomUUID(); let selection = null;
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('probe.html')) return;
  if (message.kind === 'select') selection = message.selection;
  reply({ boot, selection, accountVerified: false, executionAuthorized: false });
});`);
    let extensionOrigin;
    const launch = async () => {
      const launched = await chromium.launchPersistentContext(profile, { executablePath: executable, headless: false,
        args: ['--headless=new', '--disable-background-networking', '--disable-component-update', '--disable-sync',
          '--no-first-run', '--no-default-browser-check', `--proxy-server=${proxyOrigin}`,
          '--proxy-bypass-list=127.0.0.1;127.0.0.2',
          `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
      // Assign before setup so finally can close a browser even if route/worker initialization fails.
      context = launched;
      launched.setDefaultTimeout(5000);
      await launched.route('**/*', route => {
        const url = new URL(route.request().url());
        if ((extensionOrigin && url.href.startsWith(`${extensionOrigin}/`)) || allowedOrigins.has(url.origin)) return route.continue();
        requests.unexpectedPage++; return route.abort('blockedbyclient');
      });
      const worker = launched.serviceWorkers()[0] || await launched.waitForEvent('serviceworker', { timeout: 10000 });
      // Node URL.origin is "null" for chrome-extension:, so retain the scheme/host explicitly.
      extensionOrigin = worker.url().slice(0, worker.url().indexOf('/', 'chrome-extension://'.length));
      return launched;
    };
    await launch();
    console.log(`MANIFEST ${JSON.stringify(manifest)}`);
    console.log(`CHROME ${context.browser().version()} variant=${variant.name}`);
    let control = await context.newPage(); await control.goto(`${extensionOrigin}/probe.html`);
    const api = (fn, arg) => control.evaluate(fn, arg);
    const create = url => api(url => chrome.tabs.create({ url, active: false }), url);
    // Each role is chosen explicitly by the driver; no inventory search, URL matching or first-tab assignment.
    const plementus = await create(origins.plementus);
    const github = await create(origins.github);
    const odoo = await create(origins['odoo-sh']);
    const selection = [{ role: 'plementus', tabId: plementus.id }, { role: 'github', tabId: github.id }, { role: 'odoo-sh', tabId: odoo.id }];
    const get = id => api(id => chrome.tabs.get(id), id);
    const selectedPage = url => until(() => context.pages().find(page => page.url() === url || page.url() === `${url}/`), 'selected fixture page not observed');
    for (const item of selection) await until(async () => (await get(item.tabId)).status === 'complete', 'selected fixture did not complete');
    await check(`${variant.name}: explicit role choices use distinct real Chrome tab IDs`, () => validateSelection(selection));
    await check(`${variant.name}: missing selection has no automatic role assignment`, () => {
      assert.throws(() => validateSelection(selection.slice(0, 2)));
      assert.throws(() => validateSelection([]));
    }, 'SIMULATED');
    await check(`${variant.name}: duplicate roles and reused selected IDs rejected`, () => {
      assert.throws(() => validateSelection([selection[0], selection[0], selection[2]]));
      assert.throws(() => validateSelection([selection[0], { role: 'github', tabId: plementus.id }, selection[2]]));
    }, 'SIMULATED');
    await check(`${variant.name}: selected metadata availability`, async () => {
      for (const { role, tabId } of selection) {
        const tab = await get(tabId);
        assert.equal(tab.id, tabId); assert.equal('documentId' in tab, false);
        if (variant.name === 'restricted') {
          for (const property of ['url', 'pendingUrl', 'title', 'favIconUrl']) assert.equal(tab[property], undefined);
        } else {
          assert.equal(new URL(tab.url).origin, origins[role]);
          assert.equal(new URL(tab.url).port, new URL(origins[role]).port);
          assert.equal(tab.title, `Invented ${role} fixture`);
        }
      }
    });
    const inject = id => api(async id => {
      if (!chrome.scripting) return { unavailable: true };
      try {
        const results = await chrome.scripting.executeScript({ target: { tabId: id },
          func: () => ({ url: location.href, title: document.title }) });
        return { results };
      } catch { return { denied: true }; }
    }, id);
    await check(`${variant.name}: metadata and page injection are separate capabilities`, async () => {
      for (const { role, tabId } of selection) {
        const observed = await inject(tabId);
        if (variant.name === 'restricted') assert.equal(observed.unavailable, true);
        else if (variant.name === 'metadata') assert.equal(observed.denied, true);
        else {
          assert.equal(observed.results.length, 1); assert.equal(observed.results[0].frameId, 0);
          assert.equal(new URL(observed.results[0].result.url).origin, origins[role]);
          assert.equal(observed.results[0].result.title, `Invented ${role} fixture`);
          assert.equal(typeof observed.results[0].documentId, 'string');
          assert.ok(observed.results[0].documentId.length > 0);
        }
      }
    });
    if (variant.name === 'metadata') {
      await check('activeTab declared but never invoked does not grant any selected fixture injection', async () => {
        assert.equal(await api(() => chrome.permissions.contains({ permissions: ['activeTab'] })), true);
        for (const { tabId } of selection) assert.equal((await inject(tabId)).denied, true);
      });
    }
    if (variant.name !== 'host') {
      await check(`${variant.name}: webNavigation document API unavailable without its permission`, async () => {
        assert.equal(await api(() => typeof chrome.webNavigation), 'undefined');
      });
    }
    const duplicate = await create(origins.github);
    const alternateSelection = [selection[0], { role: 'github', tabId: duplicate.id }, selection[2]];
    await until(async () => (await get(duplicate.id)).status === 'complete', 'duplicate fixture did not complete');
    await check(`${variant.name}: duplicate-origin tab does not replace explicit GitHub choice`, async () => {
      assert.notEqual(duplicate.id, github.id); assert.equal(selection[1].tabId, github.id);
      validateSelection(selection); validateSelection(alternateSelection);
      if (variant.name !== 'restricted') assert.equal(new URL((await get(duplicate.id)).url).origin, origins.github);
    });
    await api(id => chrome.tabs.remove(id), alternateSelection[1].tabId);
    await check(`${variant.name}: closed selected candidate is inaccessible through tabs.get`, async () => {
      assert.equal(await api(async id => { try { await chrome.tabs.get(id); return false; } catch { return true; } }, alternateSelection[1].tabId), true);
    });
    const replacement = await create(origins.github);
    await check(`${variant.name}: reopened same-URL tab has a new ID requiring fresh selection`, () => assert.notEqual(replacement.id, duplicate.id));
    await api(id => chrome.tabs.remove(id), replacement.id);

    if (variant.name === 'host') {
      const fixturePage = await selectedPage(origins.plementus);
      const frame = () => api(tabId => chrome.webNavigation.getFrame({ tabId, frameId: 0 }), plementus.id);
      await check('host grant exists without tabs permission and covers all three loopback ports', async () => {
        assert.equal(await api(() => chrome.permissions.contains({ permissions: ['tabs'] })), false);
        for (const origin of Object.values(origins)) assert.equal(await api(origin => chrome.permissions.contains({ origins: [`${origin}/*`] }), origin), true);
      });
      await api(ids => {
        window.events = [];
        const watched = new Set(ids);
        for (const type of ['onCommitted', 'onHistoryStateUpdated', 'onReferenceFragmentUpdated']) {
          chrome.webNavigation[type].addListener(details => {
            if (watched.has(details.tabId) && details.frameId === 0 && window.events.length < 128)
              window.events.push({ type, tabId: details.tabId, documentId: details.documentId });
          });
        }
      }, selection.map(x => x.tabId));
      let before = await frame();
      await check('webNavigation and read-only scripting agree on real main-frame document identity', async () => {
        assert.equal(before.parentFrameId, -1); assert.equal(before.documentLifecycle, 'active');
        assert.equal(before.documentId, (await inject(plementus.id)).results[0].documentId);
      });
      await fixturePage.locator('#fragment').click();
      await check('fragment navigation preserves document but changes the selected full URL', async () => {
        await until(async () => (await frame()).url.endsWith('#route'), 'fragment not observed');
        const after = await frame(); assert.equal(after.documentId, before.documentId); assert.notEqual(after.url, before.url);
        await until(() => api(() => window.events.some(e => e.type === 'onReferenceFragmentUpdated')), 'fragment event absent');
      });
      before = await frame();
      await fixturePage.locator('#route').click();
      await check('history route navigation preserves document and emits a route event', async () => {
        await until(async () => (await frame()).url.endsWith('/route'), 'history route not observed');
        assert.equal((await frame()).documentId, before.documentId);
        await until(() => api(() => window.events.some(e => e.type === 'onHistoryStateUpdated')), 'history event absent');
      });
      before = await frame();
      await fixturePage.locator('#next').click(); await fixturePage.waitForURL(`${origins.plementus}/next`);
      await check('full navigation keeps tab ID but changes document identity', async () => {
        assert.notEqual((await frame()).documentId, before.documentId); assert.equal((await get(plementus.id)).id, plementus.id);
      });
      before = await frame(); await fixturePage.reload();
      await check('reload keeps URL and tab ID but changes document identity', async () => {
        const after = await frame(); assert.equal(after.url, before.url); assert.notEqual(after.documentId, before.documentId);
      });
      await check('read-only injection targeting the pre-reload document is rejected', async () => {
        const denied = await api(async ({ tabId, documentId }) => {
          try {
            await chrome.scripting.executeScript({ target: { tabId, documentIds: [documentId] }, func: () => location.href });
            return false;
          } catch { return true; }
        }, { tabId: plementus.id, documentId: before.documentId });
        assert.equal(denied, true);
      });
      before = await frame(); await fixturePage.goto(crossOrigin);
      await check('cross-host navigation loses host metadata and injection access', async () => {
        await until(async () => (await get(plementus.id)).status === 'complete', 'cross-origin navigation incomplete');
        assert.equal((await get(plementus.id)).url, undefined);
        assert.equal((await inject(plementus.id)).denied, true);
        assert.equal(await api(origin => chrome.permissions.contains({ origins: [`${origin}/*`] }), crossOrigin), false);
        const after = await frame(); assert.notEqual(after.documentId, before.documentId);
        assert.equal(new URL(after.url).origin, crossOrigin);
      });
      await check('webNavigation observation can outlive host injection access and supplies no authority', async () => {
        assert.equal(new URL((await frame()).url).origin, crossOrigin);
        const status = await api(() => chrome.runtime.sendMessage({ kind: 'status' }));
        assert.equal(status.accountVerified, false); assert.equal(status.executionAuthorized, false);
      });
      await fixturePage.goto(origins.plementus);
      await check('return to original origin restores manifest host access but not the old document', async () => {
        assert.notEqual((await frame()).documentId, before.documentId);
        assert.ok((await inject(plementus.id)).results);
      });
      const removal = await api(async () => {
        try { return await chrome.permissions.remove({ origins: ['http://127.0.0.1/*'] }); }
        catch { return 'rejected'; }
      });
      console.log(`PERMISSION_REMOVAL ${JSON.stringify({ variant: 'host', result: removal })}`);
      await check('required-host removal result agrees with actual access state', async () => {
        assert.equal(await api(() => chrome.permissions.contains({ origins: ['http://127.0.0.1/*'] })), removal !== true);
        if (removal === true) {
          assert.equal((await get(plementus.id)).url, undefined); assert.equal((await inject(plementus.id)).denied, true);
        } else assert.ok((await inject(plementus.id)).results);
      });

      await api(selection => { window.selection = selection; }, selection);
      const started = await api(selection => chrome.runtime.sendMessage({ kind: 'select', selection }), selection);
      await control.close(); control = await context.newPage(); await control.goto(`${extensionOrigin}/probe.html`);
      await check('extension page close/reopen loses page-local selection; worker state is separate', async () => {
        assert.equal(await api(() => window.selection), undefined);
        const status = await api(() => chrome.runtime.sendMessage({ kind: 'status' }));
        if (status.boot === started.boot) assert.deepEqual(status.selection, selection);
        else assert.equal(status.selection, null);
      });
      const popupOutcome = await api(async () => {
        try { await chrome.action.openPopup(); return 'opened'; }
        catch { return 'unavailable'; }
      });
      if (popupOutcome === 'unavailable') {
        skip('actual action-popup close/reopen', 'Chrome action.openPopup rejected in this headless browser');
      } else {
        let popup;
        try {
          popup = await until(() => context.pages().find(page => page.url() === `${extensionOrigin}/popup.html`), 'opened action popup not observable');
        } catch (error) {
          if (error.message !== 'opened action popup not observable') throw error;
          skip('actual action-popup close/reopen', 'openPopup resolved but no popup page was observable through Playwright');
        }
        if (popup) {
          await popup.evaluate(() => { window.selection = ['fixture-only-popup-marker']; });
          await popup.close();
          await api(() => chrome.action.openPopup());
          const reopened = await until(() => context.pages().find(page => page.url() === `${extensionOrigin}/popup.html`), 'reopened action popup not observable');
          await check('actual action popup close/reopen loses popup-local selection', async () => {
            assert.equal(await reopened.evaluate(() => window.selection), undefined);
          });
          await reopened.close();
        }
      }
      let cdp;
      try {
        cdp = await context.newCDPSession(control);
        const versions = [];
        cdp.on('ServiceWorker.workerVersionUpdated', event => versions.push(...event.versions.filter(v => v.scriptURL === `${extensionOrigin}/worker.js`)));
        await cdp.send('ServiceWorker.enable');
        const anchored = await api(selection => chrome.runtime.sendMessage({ kind: 'select', selection }), selection);
        const active = await until(() => versions.findLast(v => v.runningStatus === 'running'), 'CDP worker version unavailable');
        await cdp.send('ServiceWorker.stopWorker', { versionId: active.versionId });
        await until(() => versions.some(v => v.versionId === active.versionId && v.runningStatus === 'stopped'), 'CDP worker stop unavailable');
        await check('forced worker stop/reactivation loses volatile selection and keeps authority false', async () => {
          const after = await api(() => chrome.runtime.sendMessage({ kind: 'status' }));
          assert.notEqual(after.boot, anchored.boot); assert.equal(after.selection, null);
          assert.equal(after.accountVerified, false); assert.equal(after.executionAuthorized, false);
        });
      } catch (error) {
        if (!/CDP worker .*unavailable|wasn't found|not found|not supported/.test(error.message)) throw error;
        skip('forced worker stop', 'CDP termination not observable in this browser');
      } finally { if (cdp) { await cdp.send('ServiceWorker.disable').catch(() => {}); await cdp.detach(); } }

      const anchored = await api(selection => chrome.runtime.sendMessage({ kind: 'select', selection }), selection);
      await context.close(); context = undefined;
      await launch(); control = await context.newPage(); await control.goto(`${extensionOrigin}/probe.html`);
      await check('explicit disposable-browser close/reopen loses worker selection without replay', async () => {
        const after = await api(() => chrome.runtime.sendMessage({ kind: 'status' }));
        assert.notEqual(after.boot, anchored.boot); assert.equal(after.selection, null);
        assert.equal(after.accountVerified, false); assert.equal(after.executionAuthorized, false);
      });
    }
    await context.close(); context = undefined;
  }
  skip('genuine permission prompt accept/deny and optional-grant removal', 'no browser-chrome consent interaction or optional grant exercised');
  skip('invoked activeTab grant and its navigation revocation', 'toolbar invocation not exercised; only uninvoked denial and host-grant boundaries observed');
  skip('natural idle suspension, OS/browser crash and session restoration', 'forced worker stop and controlled browser restart are narrower evidence');
  skip('tabs.onReplaced / prerender replacement event', 'close/reopen IDs tested; no genuine prerender swap induced');
  await check('request allowlist observed no unexpected page traffic', () => assert.equal(requests.unexpectedPage, 0));
} catch (error) {
  if (!root && /Cannot find package 'playwright'|existing Playwright-managed Chromium required/.test(error.message)) {
    counts.blocked++; console.error('BLOCKED installed browser prerequisite unavailable');
  } else { counts.fail++; console.error(`FAIL ${error.stack}`); }
} finally {
  try { if (context) await context.close(); }
  catch { counts.fail++; console.error('FAIL disposable browser close'); }
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
  if (root) {
    assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith('bf03-chrome-fixture-'));
    assert.equal(fs.lstatSync(root).uid, process.getuid());
    fs.rmSync(root, { recursive: true });
    await check('disposable extensions and profiles removed', () => assert.equal(fs.existsSync(root), false));
  }
  console.log(`RESULT ${JSON.stringify({ ...counts, cases: counts.pass + counts.fail + counts.skip + counts.blocked,
    requests, accountVerified: false, executionAuthorized: false })}`);
  if (counts.fail || counts.blocked) process.exitCode = 1;
}
