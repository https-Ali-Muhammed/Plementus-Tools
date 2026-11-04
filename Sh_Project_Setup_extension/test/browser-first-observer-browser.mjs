import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

// Disposable observer only. Never import BF-07 or expose a runtime dispatch API.
function matches(results, documentId) {
  return Array.isArray(results) && results.length === 1 && results[0]?.frameId === 0 &&
    typeof results[0].documentId === 'string' && results[0].documentId.length > 0 &&
    results[0].documentId.length <= 256 && results[0].result === true &&
    (documentId === undefined || results[0].documentId === documentId);
}

function observer() {
  const boot = crypto.randomUUID();
  let capture = null, owner = null, generation = 0, holdNext = false, delayed = null;
  const stats = { actions: 0, discoveries: 0, confirmations: 0, reads: 0, rejected: 0,
    rejectedConnections: 0, invalidations: 0, loadingEvents: 0, lateRejected: 0 };
  const flags = { accountVerified: false, executionAuthorized: false, approvalGranted: false,
    trustedContinuingContext: false };
  function inspectForTest() {
    return { boot, capture: capture && { id: capture.id, tabId: capture.tabId,
      documentId: capture.documentId, reviewTab: capture.reviewTab,
      consumed: capture.consumed, observed: capture.observed },
      owningDocument: owner?.documentId, held: Boolean(delayed), stats: { ...stats }, ...flags };
  }
  function send(port, value) { try { port.postMessage(value); } catch {} }
  function invalidate(reason) {
    generation++;
    capture = null;
    const previous = owner; owner = null;
    stats.invalidations++;
    if (previous) {
      send(previous.port, { state: 'unbound', reason, ...flags });
      previous.port.disconnect();
    }
  }
  const current = (entry, connection, epoch) => capture === entry && owner === connection && generation === epoch;
  const eligible = (tab, entry) => tab.id === entry.tabId && tab.windowId === entry.windowId &&
    tab.url === fixtureURL && tab.status === 'complete' && tab.incognito === false && tab.discarded === false;

  chrome.action.onClicked.addListener(tab => {
    // Chrome's supplied identity is copied before any await or review focus change.
    const entry = { id: crypto.randomUUID(), tabId: tab.id, windowId: tab.windowId,
      documentId: null, reviewTab: null, consumed: false, observed: false };
    stats.actions++;
    invalidate('superseded');
    if (tab.url !== fixtureURL || !Number.isSafeInteger(entry.tabId) ||
        !Number.isSafeInteger(entry.windowId) || tab.incognito !== false || tab.discarded !== false) return;
    capture = entry;
    void discover(entry);
  });
  async function discover(entry) {
    const epoch = generation;
    const live = () => capture === entry && generation === epoch;
    try {
      // Discovery reads no DOM. Its envelope cannot supply verified application context.
      const results = await chrome.scripting.executeScript({ target: { tabId: entry.tabId }, func: () => true });
      if (!live()) return;
      if (!matches(results)) throw new Error('unsupported_document');
      entry.documentId = results[0].documentId; stats.discoveries++;
      if (!eligible(await chrome.tabs.get(entry.tabId), entry)) throw new Error('context_changed');
      if (!live()) return;
      const page = await chrome.tabs.create({ url: 'about:blank', active: false });
      if (!live()) { await chrome.tabs.remove(page.id); return; }
      entry.reviewTab = page.id;
      await chrome.tabs.update(page.id, { url: chrome.runtime.getURL('review.html'), active: true });
    } catch {
      if (live()) invalidate('discovery_unavailable');
    }
  }

  chrome.runtime.onConnect.addListener(port => {
    let connection = null, connected = true;
    port.onMessage.addListener(message => {
      if (!connection || owner !== connection || !capture ||
          !message || typeof message !== 'object' || Object.keys(message).length !== 3 ||
          message.kind !== 'confirm' || message.boot !== boot || message.captureId !== capture.id ||
          capture.consumed) {
        stats.rejected++; send(port, { state: 'rejected', ...flags }); return;
      }
      const entry = capture, epoch = generation;
      entry.consumed = true; stats.confirmations++;
      void probe(entry, connection, epoch);
    });
    port.onDisconnect.addListener(() => {
      connected = false;
      if (connection && owner === connection) invalidate('review_disconnected');
    });
    void admit();
    async function admit() {
      const sender = port.sender, entry = capture, epoch = generation;
      try {
        if (!entry || owner || port.name !== 'bf09-review' || sender?.id !== chrome.runtime.id ||
            sender.url !== chrome.runtime.getURL('review.html') ||
            sender.origin !== chrome.runtime.getURL('').slice(0, -1) ||
            typeof sender.documentId !== 'string' || !sender.documentId ||
            sender.documentLifecycle !== 'active') throw new Error('wrong_review');
        const contexts = await chrome.runtime.getContexts({ documentIds: [sender.documentId], contextTypes: ['TAB'] });
        if (!connected || capture !== entry || owner || generation !== epoch || contexts.length !== 1 ||
            contexts[0].tabId !== entry.reviewTab || contexts[0].documentId !== sender.documentId ||
            contexts[0].documentUrl !== chrome.runtime.getURL('review.html') || contexts[0].incognito !== false) {
          throw new Error('wrong_review_context');
        }
        connection = { port, documentId: sender.documentId };
        owner = connection;
        send(port, { state: 'unassigned', boot, captureId: entry.id, ...flags });
      } catch {
        stats.rejectedConnections++; send(port, { state: 'rejected', ...flags }); port.disconnect();
      }
    }
  });
  async function probe(entry, connection, epoch) {
    const timeout = setTimeout(() => {
      if (current(entry, connection, epoch)) invalidate('probe_timeout');
    }, 10000);
    try {
      if (!eligible(await chrome.tabs.get(entry.tabId), entry) || !current(entry, connection, epoch)) {
        throw new Error('context_changed');
      }
      const results = await chrome.scripting.executeScript({
        target: { tabId: entry.tabId, documentIds: [entry.documentId] },
        func: () => document.documentElement.getAttribute('data-bf09') === 'bounded-fixture-v1',
      });
      // External-driver fault instrumentation: hold acceptance, never manufacture a Chrome result.
      if (holdNext) { holdNext = false; await new Promise(resolve => { delayed = resolve; }); }
      if (!current(entry, connection, epoch)) { stats.lateRejected++; return; }
      if (!matches(results, entry.documentId) || !eligible(await chrome.tabs.get(entry.tabId), entry)) {
        throw new Error('result_mismatch');
      }
      if (!current(entry, connection, epoch)) { stats.lateRejected++; return; }
      entry.observed = true; stats.reads++;
      send(connection.port, { state: 'fixture_read_observed', ...flags });
    } catch {
      if (current(entry, connection, epoch)) invalidate('probe_unavailable');
      else stats.lateRejected++;
    } finally { clearTimeout(timeout); }
  }
  function holdNextResultForTest() { holdNext = true; }
  function releaseResultForTest() { const resolve = delayed; delayed = null; resolve?.(); }
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    stats.rejected++; reply({ accepted: false, ...flags });
  });
  chrome.tabs.onUpdated.addListener((id, change) => {
    if (id === capture?.tabId && (change.status === 'loading' || typeof change.url === 'string')) {
      stats.loadingEvents++; invalidate('tab_changed');
    }
  });
  chrome.tabs.onRemoved.addListener(id => {
    if (id === capture?.tabId || id === capture?.reviewTab) invalidate('tab_removed');
  });
}

const automatedGUI = process.argv.includes('--automated-gui');
const browserTier = automatedGUI ? 'AUTOMATED_GUI_BROWSER_TESTED' : 'LOCAL_BROWSER_TESTED';
const cases = new Map();
const requests = { fixture: 0, rejectedFixture: 0, unexpectedPage: 0, deniedProxy: 0, forwarded: 0 };
const servers = [], sockets = new Set();
const actionsByBoot = new Map();
const observations = { actionEvents: 0, invokingTabMatches: 0, humanReviewClicks: 0, automatedReviewClicks: 0, toolbarMouseClicks: 0, osMouseClicks: 0,
  controlledStops: 0, freshBoots: 0, retainedAccess: false, staleTargetRejected: false,
  loadingEvents: 0, delayedRejections: 0 };
let root, context, input, worker, ownedPid, stopped = false, visible = false;
process.once('SIGINT', () => { stopped = true; });
process.once('SIGTERM', () => { stopped = true; });
function blocked(reason) { throw Object.assign(new Error(reason), { blocked: true }); }
async function until(fn, reason, timeout = 5000) {
  const deadline = Date.now() + timeout;
  do {
    if (stopped) blocked('operator_stop');
    const value = await fn(); if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 100));
  } while (Date.now() < deadline);
  blocked(reason);
}
function record(id, outcome, tier, reason) {
  // A successful setup/denial check cannot attest an OS toolbar invocation that has not occurred.
  if (automatedGUI && tier === browserTier && observations.actionEvents === 0) tier = 'LOCAL_BROWSER_TESTED';
  cases.set(id, { id, outcome, tier, reason });
  console.log(`${outcome} ${tier} ${id} ${reason}`);
}
async function check(id, tier, reason, fn) {
  try { await fn(); record(id, 'PASS', tier, reason); }
  catch (error) {
    record(id, error.blocked ? 'BLOCKED' : 'FAIL', error.blocked ? 'NOT_RUN' : tier,
      error.blocked ? error.message : 'assertion_or_api_failure');
    throw error;
  }
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
function fixture(negative = false) {
  return http.createServer((req, res) => {
    requests.fixture++;
    if (req.method !== 'GET' || !['127.0.0.1', '127.0.0.2'].includes(req.socket.remoteAddress) ||
        !['/fixture', '/control'].includes(req.url)) {
      requests.rejectedFixture++; res.writeHead(403); res.end(); return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; object-src 'none'; frame-src 'none'");
    const label = negative ? 'NEGATIVE CONTROL — DO NOT INVOKE' :
      req.url === '/control' ? 'UNINVOKED CONTROL — DO NOT INVOKE' : 'INVOKE THIS FIXTURE ONLY';
    res.end(`<!doctype html><html data-bf09="bounded-fixture-v1"><title>BF09 ${label}</title>
<link rel="icon" href="data:,"><h1>BF09 ${label}</h1>
<p>Invented local page. No account or business authority.</p>
<p>${automatedGUI ? 'Autonomous OS mouse experiment. No operator interaction required.' : 'Wait for chat instructions, then personally click the pinned BF09 observer toolbar icon.'}</p></html>`);
  });
}
function mappedWindow(pid) {
  const ids = execFileSync('xprop', ['-root', '_NET_CLIENT_LIST'], { encoding: 'utf8', timeout: 5000 }).match(/0x[0-9a-f]+/gi) || [];
  for (const id of ids) {
    let property;
    try { property = execFileSync('xprop', ['-id', id, '_NET_WM_PID'], { encoding: 'utf8', timeout: 5000 }); }
    catch { continue; }
    if (!new RegExp(`= ${pid}\\s*$`).test(property)) continue;
    const info = execFileSync('xwininfo', ['-id', id], { encoding: 'utf8', timeout: 5000 });
    if (/Map State: IsViewable/.test(info) && /Width: [1-9]\d*/.test(info) && /Height: [1-9]\d*/.test(info)) return id;
  }
  return false;
}

// AT-SPI reads only the owned Chromium application. XTEST supplies every GUI click.
function guiControl(pid, name, click = true) {
  const windowId = mappedWindow(pid);
  if (!windowId) blocked('owned_window_unavailable');
  try {
    const result = execFileSync('python3', ['-c', String.raw`
import json,sys,subprocess,pyatspi
pid,wid,label,click=int(sys.argv[1]),sys.argv[2],sys.argv[3],sys.argv[4]=='true'
def xd(*args):
 return subprocess.check_output(['xdotool',*args],text=True,timeout=3).strip()
def owned():
 p=subprocess.check_output(['xprop','-id',wid,'_NET_WM_PID'],text=True,timeout=3)
 assert p.strip().endswith('= '+str(pid))
owned()
if int(xd('getactivewindow'))!=int(wid,16): xd('windowactivate','--sync',wid)
assert int(xd('getactivewindow'))==int(wid,16)
apps=[a for a in pyatspi.Registry.getDesktop(0) if a.get_process_id()==pid]
assert len(apps)==1
found=[]; frames=[]
def walk(node,depth=0):
 assert depth<40
 state=node.getState()
 if node.getRoleName()=='frame' and state.contains(pyatspi.STATE_SHOWING): frames.append(node)
 if node.name.split('\n')[0]==label and node.getRoleName()=='push button' and node not in found and state.contains(pyatspi.STATE_SHOWING) and state.contains(pyatspi.STATE_ENABLED):
  found.append(node)
 for child in node: walk(child,depth+1)
walk(apps[0])
if len(found)!=1:
 print(json.dumps({'found':False,'matches':len(found)}));sys.exit(0)
node=found[0]
rect=node.queryComponent().getExtents(pyatspi.DESKTOP_COORDS)
assert rect.width>0 and rect.height>0
geom=dict(line.split('=',1) for line in xd('getwindowgeometry','--shell',wid).splitlines())
# Calibrate AT-SPI logical coordinates against the owned X11 drawable, not screen guesses.
frame=max(frames,key=lambda f:f.queryComponent().getExtents(pyatspi.DESKTOP_COORDS).width)
fr=frame.queryComponent().getExtents(pyatspi.DESKTOP_COORDS)
assert fr.width>0 and fr.height>0
sx,sy=int(geom['WIDTH'])/fr.width,int(geom['HEIGHT'])/fr.height
assert 0.5<sx<2 and 0.5<sy<2 and abs(sx-sy)<0.01
ax,ay=rect.x+rect.width//2,rect.y+rect.height//2
x,y=round(int(geom['X'])+(ax-fr.x)*sx),round(int(geom['Y'])+(ay-fr.y)*sy)
assert fr.x<=rect.x and fr.y<=rect.y
assert rect.x+rect.width<=fr.x+fr.width and rect.y+rect.height<=fr.y+fr.height
assert int(geom['X'])<=x<int(geom['X'])+int(geom['WIDTH'])
assert int(geom['Y'])<=y<int(geom['Y'])+int(geom['HEIGHT'])
if click:
 xd('mousemove',str(x),str(y))
 point=dict(line.split('=',1) for line in xd('getmouselocation','--shell').splitlines())
 assert int(point['X'])==x and int(point['Y'])==y
 assert int(point['WINDOW'])==int(wid,16)
 # Recheck focus, PID, control geometry and hit-test immediately before mouse-down.
 owned(); assert int(xd('getactivewindow'))==int(wid,16)
 again=node.queryComponent().getExtents(pyatspi.DESKTOP_COORDS)
 assert (again.x,again.y,again.width,again.height)==(rect.x,rect.y,rect.width,rect.height)
 assert node.queryComponent().contains(ax,ay,pyatspi.DESKTOP_COORDS)
 current=frame.queryComponent().getExtents(pyatspi.DESKTOP_COORDS)
 assert (current.x,current.y,current.width,current.height)==(fr.x,fr.y,fr.width,fr.height)
 assert xd('getwindowgeometry','--shell',wid)== '\n'.join(k+'='+v for k,v in geom.items())
 xd('click','1')
print(json.dumps({'found':True,'clicked':click,'role':node.getRoleName()}))
`, String(pid), windowId, name, String(click)], { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] });
    const value = JSON.parse(result);
    if (value.clicked) {
      observations.osMouseClicks++;
      console.log('OS_MOUSE_CLICK ' + name);
    }
    return value.found;
  } catch (error) {
    console.log('GUI_FAILURE ' + JSON.stringify({ requested: name, code: error.code, diagnostic: String(error.stderr || '').split('\n').filter(line => /File \"<string>\"|^AssertionError|^AttributeError|^TypeError/.test(line)) }));
    blocked('owned_gui_control_unavailable');
  }
}
async function guiClick(pid, name) {
  await until(() => guiControl(pid, name, false), 'verified_gui_control_not_found');
  if (!guiControl(pid, name)) blocked('verified_gui_control_changed');
}

try {
  await check('7S', 'SIMULATED', 'malformed_envelope_selfcheck', () => {
    const valid = { frameId: 0, documentId: 'invented-document', result: true };
    assert.equal(matches([valid], valid.documentId), true);
    for (const results of [null, [], [valid, valid], [{ ...valid, frameId: 1 }],
      [{ ...valid, documentId: '' }], [{ ...valid, result: false }], [{ frameId: 0, result: true }]]) {
      assert.equal(matches(results, valid.documentId), false);
    }
    assert.equal(matches([valid], 'different-invented-document'), false);
  });
  const { chromium } = await import('playwright');
  const executable = chromium.executablePath();
  if (!fs.existsSync(executable) || !process.env.DISPLAY) blocked('headed_browser_prerequisite_unavailable');
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'bf09-observer-'));
  const origin = await listen(fixture()), negativeOrigin = await listen(fixture(true), '127.0.0.2');
  const fixtureURL = `${origin}/fixture`;
  const proxy = http.createServer((req, res) => { requests.deniedProxy++; res.writeHead(403); res.end(); });
  proxy.on('connect', (req, socket) => {
    requests.deniedProxy++; socket.on('error', () => socket.destroy());
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
  });
  const proxyOrigin = await listen(proxy);
  const extension = path.join(root, 'extension'), profile = path.join(root, 'profile');
  fs.mkdirSync(extension); fs.mkdirSync(profile);
  const manifest = { manifest_version: 3, name: 'BF09 observer', version: '1.0',
    permissions: ['activeTab', 'scripting'], background: { service_worker: 'worker.js' },
    action: { default_title: 'BF09 observer' } };
  fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
  // Function body is top-level worker code; test hooks are reachable only by the external driver.
  const body = observer.toString().slice(observer.toString().indexOf('{') + 1, -1);
  fs.writeFileSync(path.join(extension, 'worker.js'),
    `const fixtureURL = ${JSON.stringify(fixtureURL)};\n${matches.toString()}\n${body}\n`);
  fs.writeFileSync(path.join(extension, 'review.html'), `<!doctype html><html lang="en"><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; object-src 'none'; frame-src 'none'">
<title>BF09 packaged review</title><h1>BF09 disposable observer</h1>
<p>Local fixture experiment only. Account verification, approval and execution authority are false.</p>
<p>${automatedGUI ? 'Autonomous OS mouse experiment. No operator interaction required.' : "Pin BF09 observer using Chrome's Extensions menu. Do not invoke or confirm until the chat requests it."}</p>
<p id="state" role="status" aria-live="polite">Waiting for a genuine fixture invocation.</p>
<button id="confirm" disabled>Confirm this fixture for one bounded read</button>
<p>No continuing context or real website identity is verified. Disconnect requires a fresh invocation.</p>
<script src="review.js"></script></html>`);
  fs.writeFileSync(path.join(extension, 'review.js'), `var reviewPort = chrome.runtime.connect({name:'bf09-review'});
var ticket = null; var trustedClicks = 0; var replies = [];
const button = document.querySelector('#confirm'), state = document.querySelector('#state');
reviewPort.onMessage.addListener(message => {
  replies.push(message.state); if (replies.length > 16) replies.shift();
  if (message.state === 'rejected') return;
  if (message.state === 'unassigned') { ticket = {kind:'confirm',boot:message.boot,captureId:message.captureId}; button.disabled = false; }
  else button.disabled = true;
  state.textContent = message.state === 'fixture_read_observed' ? 'One fixture read observed. No continuing authorization.' :
    message.state === 'unassigned' ? 'Unassigned fixture capture. Confirmation permits one bounded fixture read.' : 'Unavailable or rejected. Fresh invocation required.';
});
reviewPort.onDisconnect.addListener(() => { button.disabled = true; state.textContent = 'Disconnected. Fresh invocation required.'; });
button.addEventListener('click', event => {
  if (!event.isTrusted || !ticket || button.disabled) return;
  trustedClicks++; button.disabled = true; reviewPort.postMessage(ticket);
});\n`);
  for (const file of ['worker.js', 'review.js']) execFileSync(process.execPath, ['--check', path.join(extension, file)]);
  context = await chromium.launchPersistentContext(profile, { executablePath: executable, headless: false,
    args: [...(automatedGUI ? ['--force-renderer-accessibility'] : []), '--disable-background-networking', '--disable-component-update', '--disable-sync',
      '--no-first-run', '--no-default-browser-check', '--window-size=1280,900',
      `--proxy-server=${proxyOrigin}`, '--proxy-bypass-list=127.0.0.1;127.0.0.2',
      `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  context.setDefaultTimeout(5000);
  worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 10000 });
  const extensionOrigin = worker.url().slice(0, worker.url().indexOf('/', 'chrome-extension://'.length));
  const reviewURL = `${extensionOrigin}/review.html`;
  const allowed = new Set([fixtureURL, `${origin}/control`, `${negativeOrigin}/fixture`,
    reviewURL, `${extensionOrigin}/review.js`]);
  await context.route('**/*', route => {
    if (allowed.has(route.request().url()) && route.request().method() === 'GET') return route.continue();
    requests.unexpectedPage++; return route.abort('blockedbyclient');
  });
  console.log(`ENV ${JSON.stringify({ node: process.version, chrome: context.browser().version(), mode: 'headed',
    generatedScriptSyntax: 'PASS', permissions: manifest.permissions })}`);
  const controlReview = await context.newPage(); await controlReview.goto(reviewURL);
  const api = (fn, arg) => controlReview.evaluate(fn, arg);
  const inspect = async () => {
    const value = await worker.evaluate(() => inspectForTest());
    actionsByBoot.set(value.boot, value.stats.actions);
    observations.actionEvents = [...actionsByBoot.values()].reduce((sum, count) => sum + count, 0);
    for (const key of ['accountVerified', 'executionAuthorized', 'approvalGranted', 'trustedContinuingContext']) {
      assert.equal(value[key], false);
    }
    return value;
  };
  const create = async url => {
    const tab = await api(url => chrome.tabs.create({ url, active: false }), url);
    await until(async () => (await api(id => chrome.tabs.get(id), tab.id)).status === 'complete', 'fixture_load_unavailable');
    return tab.id;
  };
  const selected = await create(fixtureURL), duplicate = await create(`${origin}/control`), negative = await create(`${negativeOrigin}/fixture`);
  const selectedPage = context.pages().find(page => page.url() === fixtureURL);
  const inject = (tabId, documentId) => api(async ({ tabId, documentId }) => {
    try {
      return { results: await chrome.scripting.executeScript({ target: { tabId,
        ...(documentId === undefined ? {} : { documentIds: [documentId] }) },
      func: () => document.documentElement.getAttribute('data-bf09') === 'bounded-fixture-v1' }) };
    } catch (error) {
      return { denied: /Cannot access contents|Missing host permission|cannot access the page|must invoke the extension/i.test(error.message),
        missing: /No tab with id|No document with id|No frame with id/i.test(error.message) };
    }
  }, { tabId, documentId });
  const browserCDP = await context.browser().newBrowserCDPSession();
  let browserPid;
  try { browserPid = (await browserCDP.send('SystemInfo.getProcessInfo')).processInfo.find(p => p.type === 'browser').id; }
  finally { await browserCDP.detach(); }
  ownedPid = browserPid;
  // Chromium may rewrite argv as one space-separated process title on Linux.
  const ownedArgs = fs.readFileSync(`/proc/${browserPid}/cmdline`, 'utf8').split(/[\0 ]+/);
  assert.ok(ownedArgs.includes(`--user-data-dir=${profile}`));
  if (!await until(() => mappedWindow(browserPid), 'owned_window_not_mapped')) blocked('owned_window_not_mapped');
  if (!automatedGUI) {
    input = readline.createInterface({ input: process.stdin });
    input.on('line', line => {
      if (line.trim() === 'visible') visible = true;
      if (['stop', 'blocked'].includes(line.trim())) stopped = true;
    });
    console.log('GUI_READY Confirm visible disposable window and accessible pinned BF09 observer; stdin visible or blocked. Do not invoke yet.');
    await until(() => visible, 'human_gui_confirmation_unavailable', 300000);
  }
  await check('ENV', browserTier, 'headed_gui_and_minimal_permissions', async () => {
    assert.ok(mappedWindow(browserPid));
    assert.deepEqual(await api(() => chrome.permissions.getAll()), { permissions: ['activeTab', 'scripting'], origins: [] });
    assert.equal(await api(() => chrome.action.getPopup({})), '');
    assert.equal(await api(() => typeof chrome.webNavigation), 'undefined');
    assert.equal(new Set([selected, duplicate, negative]).size, 3);
  });
  await check('1', browserTier, 'pre_invocation_denial', async () => {
    assert.equal((await inspect()).stats.actions, 0);
    for (const id of [selected, duplicate, negative]) assert.equal((await inject(id)).denied, true);
    assert.equal((await inspect()).capture, null);
  });

  async function captureFromToolbar(expectedActions) {
    if (automatedGUI) {
      await selectedPage.bringToFront();
      assert.equal((await api(id => chrome.tabs.get(id), selected)).active, true);
      if (!guiControl(browserPid, 'BF09 observer', false)) {
        await guiClick(browserPid, 'Extensions');
        await guiClick(browserPid, 'Pin BF09 observer');
        await guiClick(browserPid, 'Extensions');
      }
      await guiClick(browserPid, 'BF09 observer');
      observations.toolbarMouseClicks++;
    } else console.log('HUMAN_ACTION_REQUIRED Personally activate BF09 INVOKE THIS FIXTURE ONLY and click the pinned BF09 observer once. Wait before review confirmation.');
    return until(async () => {
      const value = await inspect();
      assert.ok(value.stats.actions <= expectedActions, 'extra_action');
      if (value.stats.actions < expectedActions) return;
      if (!value.capture) blocked('genuine_action_capture_unavailable');
      assert.equal(value.capture.tabId, selected, 'wrong_invoking_tab');
      return value.owningDocument && value.capture.documentId && value;
    }, automatedGUI ? 'automated_action_unavailable' : 'genuine_human_action_unavailable', automatedGUI ? 10000 : 300000);
  }
  let captured;
  await check('2', browserTier, 'genuine_action_and_invoking_tab', async () => {
    captured = await captureFromToolbar(1);
    observations.invokingTabMatches++;
    assert.equal(captured.capture.consumed, false); assert.equal(captured.capture.observed, false);
  });
  let review = context.pages().findLast(page => page.url() === reviewURL && page !== controlReview);
  assert.ok(review);
  await check('3', browserTier, 'uninvoked_controls_deny_after_action', async () => {
    for (const id of [duplicate, negative]) assert.equal((await inject(id)).denied, true);
  });
  await check('5A', 'SIMULATED', 'wrong_review_capture_and_schema_stimuli_rejected', async () => {
    const before = await inspect();
    const wrong = await context.newPage(); await wrong.goto(reviewURL);
    await until(async () => (await wrong.evaluate(() => replies)).includes('rejected'), 'wrong_review_rejection_unavailable');
    assert.equal((await inspect()).owningDocument, before.owningDocument);
    for (const message of [
      { kind: 'confirm', boot: before.boot, captureId: 'invented-wrong-capture' },
      { kind: 'confirm', boot: 'invented-wrong-boot', captureId: before.capture.id },
      { kind: 'confirm', boot: before.boot, captureId: before.capture.id, executionAuthorized: true },
    ]) await review.evaluate(message => reviewPort.postMessage(message), message);
    await until(async () => (await inspect()).stats.rejected >= before.stats.rejected + 3, 'bad_message_rejection_unavailable');
    assert.equal((await inspect()).stats.confirmations, 0);
    assert.equal((await inspect()).capture.consumed, false);
    await wrong.close();
  });
  if (automatedGUI) { await review.bringToFront(); await guiClick(browserPid, 'Confirm this fixture for one bounded read'); }
  else console.log('HUMAN_CONFIRM_REQUIRED Personally select the current BF09 packaged review and click Confirm this fixture for one bounded read once.');
  await check('4', browserTier, automatedGUI ? 'automated_current_review_confirmation' : 'human_current_review_confirmation', async () => {
    await until(async () => (await inspect()).stats.reads === 1, 'review_confirmation_unavailable', automatedGUI ? 10000 : 300000);
    const value = await inspect(); assert.equal(value.stats.confirmations, 1);
    assert.equal(await review.evaluate(() => trustedClicks), 1);
    observations[automatedGUI ? 'automatedReviewClicks' : 'humanReviewClicks']++;
  });
  await check('7', browserTier, 'exact_document_frame_and_single_result', async () => {
    assert.ok(matches((await inject(selected, captured.capture.documentId)).results, captured.capture.documentId));
    assert.equal((await inspect()).capture.observed, true);
  });
  await check('5B', 'SIMULATED', 'duplicate_confirmation_consumed_once', async () => {
    const before = await inspect();
    await review.evaluate(() => reviewPort.postMessage(ticket));
    await until(async () => (await inspect()).stats.rejected > before.stats.rejected, 'duplicate_rejection_unavailable');
    assert.equal((await inspect()).stats.reads, 1); assert.equal((await inspect()).stats.confirmations, 1);
  });
  await check('6', 'SIMULATED', 'page_and_content_sender_forgery_rejected', async () => {
    const before = await inspect();
    await selectedPage.evaluate(() => window.postMessage({ kind: 'invoke', permission: 'granted', executionAuthorized: true }, '*'));
    const rejected = await api(async tabId => (await chrome.scripting.executeScript({ target: { tabId }, func: async () => {
      const reply = await chrome.runtime.sendMessage({ kind: 'invoke', permission: 'granted', executionAuthorized: true });
      return reply.accepted === false && reply.executionAuthorized === false;
    } }))[0].result, selected);
    assert.equal(rejected, true);
    await api(async tabId => chrome.scripting.executeScript({ target: { tabId }, func: () => {
      const port = chrome.runtime.connect({ name: 'bf09-review' });
      port.onDisconnect.addListener(() => { void chrome.runtime.lastError; });
      port.postMessage({ kind: 'confirm', boot: 'page-claim', captureId: 'page-claim' });
    } }), selected);
    await until(async () => (await inspect()).stats.rejectedConnections > before.stats.rejectedConnections, 'content_sender_rejection_unavailable');
    const after = await inspect(); assert.equal(after.stats.actions, 1); assert.equal(after.stats.reads, 1);
    assert.equal(after.owningDocument, before.owningDocument);
  });

  let cdp;
  try {
    await check('10', browserTier, 'controlled_worker_stop_and_fresh_empty_boot', async () => {
      cdp = await context.newCDPSession(controlReview);
      const versions = [];
      cdp.on('ServiceWorker.workerVersionUpdated', event => versions.push(...event.versions.filter(v => v.scriptURL === worker.url())));
      await cdp.send('ServiceWorker.enable');
      const running = await until(() => versions.findLast(v => v.runningStatus === 'running'), 'worker_version_unavailable');
      const before = await inspect();
      await cdp.send('ServiceWorker.stopWorker', { versionId: running.versionId });
      await until(() => versions.some(v => v.versionId === running.versionId && v.runningStatus === 'stopped'), 'controlled_stop_unavailable');
      observations.controlledStops++;
      await api(() => chrome.runtime.sendMessage({ kind: 'old_confirmation' }));
      // Playwright retains its Worker handle across an MV3 restart; boot identity proves new execution.
      const after = await inspect(); assert.notEqual(after.boot, before.boot);
      assert.equal(after.capture, null); assert.equal(after.owningDocument, undefined);
      assert.equal(after.stats.actions, 0); assert.equal(after.stats.confirmations, 0); assert.equal(after.stats.reads, 0);
      observations.freshBoots++;
    });
  } finally {
    if (cdp) { await cdp.send('ServiceWorker.disable').catch(() => {}); await cdp.detach(); }
  }
  await check('11', browserTier, 'surviving_access_does_not_restore_authorization', async () => {
    const result = await inject(selected, captured.capture.documentId);
    if (!result.results) blocked('surviving_access_not_observed');
    assert.ok(matches(result.results, captured.capture.documentId)); observations.retainedAccess = true;
    const before = await inspect();
    await review.evaluate(() => {
      const port = chrome.runtime.connect({ name: 'bf09-review' });
      port.onDisconnect.addListener(() => { void chrome.runtime.lastError; });
      port.postMessage(ticket);
    });
    await until(async () => (await inspect()).stats.rejectedConnections > before.stats.rejectedConnections, 'old_review_rejection_unavailable');
    assert.equal((await inspect()).capture, null); assert.equal((await inspect()).owningDocument, undefined);
    for (const id of [duplicate, negative]) assert.equal((await inject(id)).denied, true);
  });

  await check('2B', browserTier, 'fresh_genuine_action_after_restart', async () => {
    captured = await captureFromToolbar(1);
    observations.invokingTabMatches++;
  });
  const oldReview = review;
  review = context.pages().findLast(page => page.url() === reviewURL && page !== controlReview && page !== oldReview);
  assert.ok(review);
  await check('5C', 'SIMULATED', 'superseded_review_cannot_confirm_new_capture', async () => {
    const before = await inspect();
    await oldReview.evaluate(() => {
      const port = chrome.runtime.connect({ name: 'bf09-review' });
      port.onDisconnect.addListener(() => { void chrome.runtime.lastError; }); port.postMessage(ticket);
    });
    await until(async () => (await inspect()).stats.rejectedConnections > before.stats.rejectedConnections, 'superseded_review_rejection_unavailable');
    assert.equal((await inspect()).owningDocument, captured.owningDocument);
    assert.equal((await inspect()).stats.confirmations, 0);
  });
  await worker.evaluate(() => holdNextResultForTest());
  if (automatedGUI) { await review.bringToFront(); await guiClick(browserPid, 'Confirm this fixture for one bounded read'); }
  else console.log('HUMAN_CONFIRM_REQUIRED Personally click Confirm once in the NEW current BF09 packaged review. The driver will hold the real result, then reload the fixture.');
  await until(async () => (await inspect()).held, 'second_confirmation_or_result_unavailable', automatedGUI ? 10000 : 300000);
  assert.equal(await review.evaluate(() => trustedClicks), 1); observations[automatedGUI ? 'automatedReviewClicks' : 'humanReviewClicks']++;
  await check('8', browserTier, 'real_reload_rejects_old_document_target', async () => {
    await selectedPage.reload();
    await until(async () => (await inspect()).capture === null, 'reload_invalidation_unavailable');
    const value = await inspect(); observations.loadingEvents = value.stats.loadingEvents;
    assert.ok(value.stats.loadingEvents >= 1);
    assert.equal((await inject(selected, captured.capture.documentId)).missing, true);
    observations.staleTargetRejected = true;
    assert.equal(value.stats.reads, 0); assert.equal(value.owningDocument, undefined);
  });
  await check('9', 'SIMULATED', 'held_real_completion_rejected_after_invalidation', async () => {
    await worker.evaluate(() => releaseResultForTest());
    await until(async () => (await inspect()).stats.lateRejected === 1, 'delayed_rejection_unavailable');
    const value = await inspect(); assert.equal(value.capture, null); assert.equal(value.stats.reads, 0);
    observations.delayedRejections = value.stats.lateRejected;
  });
  record('LIMITS', 'SKIP', 'NOT_RUN', 'continuous_navigation_optional_grants_natural_idle_crash_restore_bfcache_prerender_real_sites_three_roles');
} catch (error) {
  console.log('DIAGNOSTIC ' + JSON.stringify({ name: error.name, location: error.stack?.match(/browser-first-observer-browser\.mjs:(\d+):\d+/)?.[1] || 'external' }));
  if (![...cases.values()].some(item => ['FAIL', 'BLOCKED'].includes(item.outcome))) {
    record('RUN', error.blocked || /Cannot find package 'playwright'/.test(error.message) ? 'BLOCKED' : 'FAIL', 'NOT_RUN',
      error.blocked ? error.message : 'environment_or_assertion_failure');
  }
} finally {
  input?.close();
  for (const id of ['1', '2', '2B', '3', '4', '5A', '5B', '5C', '6', '7', '8', '9', '10', '11']) {
    if (!cases.has(id)) record(id, 'BLOCKED', 'NOT_RUN', 'earlier_prerequisite_incomplete');
  }
  let cleanup = true;
  try {
    if (context) await context.close();
    if (ownedPid) await until(() => !fs.existsSync(`/proc/${ownedPid}`), 'owned_process_cleanup_unavailable');
  } catch { cleanup = false; }
  for (const socket of sockets) socket.destroy();
  for (const server of servers) {
    try {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close(error => error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve()));
      assert.equal(server.listening, false);
    } catch { cleanup = false; }
  }
  try {
    if (root) {
      assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith('bf09-observer-'));
      assert.equal(fs.lstatSync(root).uid, process.getuid()); fs.rmSync(root, { recursive: true });
      assert.equal(fs.existsSync(root), false);
    }
    await new Promise(resolve => setImmediate(resolve)); assert.equal(sockets.size, 0);
    assert.equal(requests.unexpectedPage, 0); assert.equal(requests.rejectedFixture, 0); assert.equal(requests.forwarded, 0);
  } catch { cleanup = false; }
  record('12', cleanup ? 'PASS' : 'FAIL', browserTier, 'network_boundary_and_owned_cleanup');
  const totals = { pass: 0, fail: 0, blocked: 0, skip: 0 };
  for (const item of cases.values()) totals[item.outcome.toLowerCase()]++;
  console.log(`RESULT ${JSON.stringify({ totals, cases: [...cases.values()], observations, requests, cleanup,
    accountVerified: false, executionAuthorized: false, approvalGranted: false, trustedContinuingContext: false })}`);
  if (totals.fail || totals.blocked) process.exitCode = 1;
}
