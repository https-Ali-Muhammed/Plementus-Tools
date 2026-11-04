import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

// BF-10 disposable lifecycle experiment. BF-09 observer/GUI patterns stay isolated here.
// No BF-07 import, production module or public test-command endpoint.
function matches(results, documentId) {
  return Array.isArray(results) && results.length === 1 && results[0]?.frameId === 0 &&
    typeof results[0].documentId === 'string' && results[0].documentId.length > 0 &&
    results[0].documentId.length <= 256 && results[0].result === true &&
    (documentId === undefined || results[0].documentId === documentId);
}

function observer() {
  const boot = crypto.randomUUID();
  let lastInvalidation = null;
  const events = [];
  const event = type => { events.push(type); if (events.length > 64) events.shift(); };
  let capture = null, owner = null, generation = 0, holdNext = false, delayed = null;
  const stats = { actions: 0, discoveries: 0, confirmations: 0, reads: 0, rejected: 0,
    rejectedConnections: 0, invalidations: 0, loadingEvents: 0, lateRejected: 0 };
  const flags = { accountVerified: false, executionAuthorized: false, approvalGranted: false,
    trustedContinuingContext: false };
  function inspectForTest() {
    return { boot, generation, lastInvalidation, events: [...events], capture: capture && { id: capture.id, tabId: capture.tabId,
      documentId: capture.documentId, reviewTab: capture.reviewTab,
      consumed: capture.consumed, observed: capture.observed },
      owningDocument: owner?.documentId, held: Boolean(delayed), stats: { ...stats }, ...flags };
  }
  function send(port, value) { try { port.postMessage(value); } catch {} }
  function invalidate(reason) {
    generation++;
    lastInvalidation = reason;
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
    stats.actions++; event('action.onClicked');
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
      connected = false; event('runtime.Port.onDisconnect');
      if (connection && owner === connection) invalidate('review_disconnected');
    });
    void admit();
    async function admit() {
      const sender = port.sender, entry = capture, epoch = generation;
      try {
        if (!entry || owner || port.name !== 'bf10-review' || sender?.id !== chrome.runtime.id ||
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
        func: () => document.documentElement.getAttribute('data-bf10') === 'bounded-fixture-v1',
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
      event('tabs.onUpdated'); stats.loadingEvents++; invalidate('tab_changed');
    }
  });
  chrome.tabs.onRemoved.addListener(id => {
    if (id === capture?.tabId || id === capture?.reviewTab) {
      event('tabs.onRemoved'); invalidate('tab_removed');
    }
  });
}

const browserTier = 'AUTOMATED_GUI_BROWSER_TESTED';
const cases = new Map();
const requests = { fixture: 0, rejectedFixture: 0, unexpectedPage: 0, deniedProxy: 0, forwarded: 0 };
const servers = [], sockets = new Set();
const actionsByBoot = new Map();
const observations = { actionEvents: 0, invokingTabMatches: 0, automatedReviewClicks: 0, toolbarMouseClicks: 0, osMouseClicks: 0,
  controlledStops: 0, freshBoots: 0, retainedAccess: false, staleTargetRejected: false,
  loadingEvents: 0, delayedRejections: 0 };
let root, context, worker, ownedPid, stopped = false;
const accessLog = [], stateLog = [], resources = { ports: [] };
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
  if (tier === browserTier && observations.actionEvents === 0) tier = 'LOCAL_BROWSER_TESTED';
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
  resources.ports.push({ host, port: server.address().port });
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
    res.end(`<!doctype html><html data-bf10="bounded-fixture-v1"><title>BF10 ${label}</title>
<link rel="icon" href="data:,"><h1>BF10 ${label}</h1>
<p>Invented local page. No account or business authority.</p>
<p>Autonomous OS mouse experiment. No operator interaction required.</p></html>`);
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
 if int(point['WINDOW'])!=int(wid,16):
  prop=subprocess.check_output(['xprop','-id',point['WINDOW'],'_NET_WM_PID'],text=True,timeout=3)
  raise AssertionError('pointer_window_mismatch owned_pid='+str(prop.strip().endswith('= '+str(pid))))
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
    console.log('GUI_FAILURE ' + JSON.stringify({ requested: name, code: error.code, diagnostic: String(error.stderr || '').split('\n').filter(line => /File \"<string>\"|^AssertionError|^AttributeError|^TypeError|^subprocess\.(TimeoutExpired|CalledProcessError)/.test(line)) }));
    blocked('owned_gui_control_unavailable');
  }
}
async function guiClick(pid, name) {
  await until(() => guiControl(pid, name, false), 'verified_gui_control_not_found');
  if (!guiControl(pid, name)) blocked('verified_gui_control_changed');
}

try {
  await check('S1', 'SIMULATED', 'malformed_envelope_selfcheck', () => {
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
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'bf10-observer-'));
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
  const manifest = { manifest_version: 3, name: 'BF10 observer', version: '1.0',
    permissions: ['activeTab', 'scripting'], background: { service_worker: 'worker.js' },
    action: { default_title: 'BF10 observer' } };
  fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
  // Function body is top-level worker code; test hooks are reachable only by the external driver.
  const body = observer.toString().slice(observer.toString().indexOf('{') + 1, -1);
  fs.writeFileSync(path.join(extension, 'worker.js'),
    `const fixtureURL = ${JSON.stringify(fixtureURL)};\n${matches.toString()}\n${body}\n`);
  fs.writeFileSync(path.join(extension, 'review.html'), `<!doctype html><html lang="en"><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; object-src 'none'; frame-src 'none'">
<title>BF10 packaged review</title><h1>BF10 disposable observer</h1>
<p>Local fixture experiment only. Account verification, approval and execution authority are false.</p>
<p>Autonomous OS mouse experiment. No operator interaction required.</p>
<p id="state" role="status" aria-live="polite">Waiting for a genuine fixture invocation.</p>
<button id="confirm" disabled>Confirm this fixture for one bounded read</button>
<p>No continuing context or real website identity is verified. Disconnect requires a fresh invocation.</p>
<script src="review.js"></script></html>`);
  fs.writeFileSync(path.join(extension, 'review.js'), `var reviewPort = chrome.runtime.connect({name:'bf10-review'});
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
    args: ['--force-renderer-accessibility', '--disable-background-networking', '--disable-component-update', '--disable-sync',
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
  let selected = await create(fixtureURL);
  const duplicate = await create(`${origin}/control`), negative = await create(`${negativeOrigin}/fixture`);
  let selectedPage = context.pages().find(page => page.url() === fixtureURL);
  const inject = (tabId, documentId) => api(async ({ tabId, documentId }) => {
    try {
      return { results: await chrome.scripting.executeScript({ target: { tabId,
        ...(documentId === undefined ? {} : { documentIds: [documentId] }) },
      func: () => document.documentElement.getAttribute('data-bf10') === 'bounded-fixture-v1' }) };
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
  assert.ok(ownedArgs.includes(`--load-extension=${extension}`));
  assert.equal(ownedArgs.some(arg => arg.startsWith('--headless')), false);
  Object.assign(resources, { root, pid: browserPid });
  console.log('OWNED ' + JSON.stringify(resources));
  if (!await until(() => mappedWindow(browserPid), 'owned_window_not_mapped')) blocked('owned_window_not_mapped');
  async function snapshot(label) {
    const state = await inspect();
    stateLog.push({ label, ...state });
    console.log('STATE ' + JSON.stringify({ label, ...state }));
    return state;
  }
  async function unbound(label) {
    await until(async () => (await inspect()).capture === null, `${label}_invalidation_unavailable`);
    const state = await snapshot(label);
    assert.equal(state.capture, null); assert.equal(state.owningDocument, undefined);
    return state;
  }
  async function access(label, tabId, documentId) {
    const result = await inject(tabId, documentId);
    const status = result.results ? 'RETAINED' : result.denied ? 'DENIED' : 'UNAVAILABLE';
    if (result.results) assert.ok(matches(result.results, documentId));
    const observation = { label, tabId, status, missingTarget: result.missing === true,
      documentId: result.results?.[0]?.documentId };
    accessLog.push(observation); console.log('ACCESS ' + JSON.stringify(observation));
    return observation;
  }
  async function isolated(label) {
    for (const [role, id] of [['duplicate', duplicate], ['negative', negative]]) {
      assert.equal((await access(`${label}_${role}`, id)).status, 'DENIED');
    }
  }
  let review, captured;
  async function invoke(label) {
    const before = await inspect();
    await selectedPage.bringToFront();
    assert.equal((await api(id => chrome.tabs.get(id), selected)).active, true);
    if (!guiControl(browserPid, 'BF10 observer', false)) {
      await guiClick(browserPid, 'Extensions');
      await guiClick(browserPid, 'Pin BF10 observer');
      await guiClick(browserPid, 'Extensions');
    }
    await guiClick(browserPid, 'BF10 observer'); observations.toolbarMouseClicks++;
    captured = await until(async () => {
      const state = await inspect();
      assert.equal(state.boot, before.boot);
      assert.ok(state.stats.actions <= before.stats.actions + 1, 'extra_action');
      if (state.stats.actions === before.stats.actions) return;
      if (!state.capture) blocked('real_action_capture_unavailable');
      assert.equal(state.capture.tabId, selected);
      return state.owningDocument && state.capture.documentId && state;
    }, 'automated_action_unavailable', 10000);
    observations.invokingTabMatches++;
    assert.equal(captured.capture.consumed, false); assert.equal(captured.capture.observed, false);
    review = await until(() => context.pages().find(page => page.url() === reviewURL &&
      page !== controlReview && !page.isClosed() && !seenReviews.has(page)), 'owning_review_unavailable');
    seenReviews.add(review);
    assert.equal(await review.evaluate(() => ticket.captureId), captured.capture.id);
    await snapshot(label);
    await isolated(label);
  }
  const seenReviews = new Set();
  async function confirm(held = false) {
    const before = await inspect();
    await review.bringToFront();
    await guiClick(browserPid, 'Confirm this fixture for one bounded read');
    await until(async () => {
      const state = await inspect();
      return held ? state.held : state.stats.reads === before.stats.reads + 1;
    }, 'current_review_confirmation_unavailable', 10000);
    const after = await inspect();
    assert.equal(after.stats.confirmations, before.stats.confirmations + 1);
    assert.equal(await review.evaluate(() => trustedClicks), 1);
    observations.automatedReviewClicks++;
    if (!held) {
      assert.equal(after.capture.observed, true);
      assert.equal(after.capture.consumed, true);
      assert.equal((await access('confirmed_document', selected, captured.capture.documentId)).status, 'RETAINED');
    }
  }
  async function replayOldTicket(page, label) {
    const before = await inspect();
    await page.evaluate(() => {
      const port = chrome.runtime.connect({ name: 'bf10-review' });
      port.onDisconnect.addListener(() => { void chrome.runtime.lastError; });
      port.postMessage(ticket);
    });
    await until(async () => (await inspect()).stats.rejectedConnections > before.stats.rejectedConnections,
      'old_capture_rejection_unavailable');
    const after = await unbound(label);
    assert.equal(after.stats.reads, before.stats.reads);
    assert.equal(after.stats.confirmations, before.stats.confirmations);
  }

  await check('ENV', 'LOCAL_BROWSER_TESTED', 'owned_headed_gui_minimal_permissions', async () => {
    assert.ok(mappedWindow(browserPid));
    assert.deepEqual(await api(() => chrome.permissions.getAll()), { permissions: ['activeTab', 'scripting'], origins: [] });
    assert.equal(await api(() => chrome.action.getPopup({})), '');
    assert.equal(await api(() => typeof chrome.webNavigation), 'undefined');
    assert.equal(new Set([selected, duplicate, negative]).size, 3);
  });
  await check('1', 'LOCAL_BROWSER_TESTED', 'pre_invocation_scripting_denial', async () => {
    assert.equal((await inspect()).stats.actions, 0);
    assert.equal((await access('pre_invocation_selected', selected)).status, 'DENIED');
    await isolated('pre_invocation'); await unbound('pre_invocation');
  });
  await check('2', browserTier, 'automated_toolbar_correct_tab_capture', () => invoke('initial_capture'));
  await check('3', browserTier, 'current_review_bounded_document_read', () => confirm());
  await check('4', browserTier, 'same_origin_reload_retained_grant_requires_revalidation', async () => {
    const before = await inspect();
    await selectedPage.reload();
    const after = await unbound('same_origin_reload');
    assert.ok(after.stats.loadingEvents > before.stats.loadingEvents);
    assert.ok(after.events.includes('tabs.onUpdated'));
    assert.equal(after.stats.reads, before.stats.reads);
    const current = await access('same_origin_reload', selected);
    assert.equal(current.status, 'RETAINED'); assert.notEqual(current.documentId, captured.capture.documentId);
    const stale = await access('same_origin_stale_document', selected, captured.capture.documentId);
    assert.equal(stale.status, 'UNAVAILABLE'); assert.equal(stale.missingTarget, true);
    await isolated('reload');
  });
  await check('S2', 'SIMULATED', 'old_review_ticket_after_real_reload_rejected', () => replayOldTicket(review, 'reload_replay'));
  await check('4R', browserTier, 'fresh_invocation_and_review_after_reload', async () => { await invoke('reload_revalidation'); await confirm(); });
  await check('5', browserTier, 'cross_origin_navigation_access_denied_and_capture_cleared', async () => {
    const before = await inspect();
    await selectedPage.goto(`${negativeOrigin}/fixture`);
    const after = await unbound('cross_origin');
    assert.ok(after.stats.loadingEvents > before.stats.loadingEvents);
    assert.equal((await access('cross_origin', selected)).status, 'DENIED');
    await isolated('cross_origin');
  });
  await check('6', browserTier, 'return_original_origin_without_access_or_authority_restoration', async () => {
    const before = await inspect();
    await selectedPage.goto(fixtureURL);
    await unbound('return_original');
    assert.equal((await access('return_original', selected)).status, 'DENIED');
    assert.equal((await inspect()).stats.actions, before.stats.actions);
    assert.equal((await inspect()).stats.reads, before.stats.reads);
    await isolated('return');
  });
  await check('6R', browserTier, 'fresh_invocation_and_review_after_return', async () => { await invoke('return_revalidation'); await confirm(); });
  await check('7', browserTier, 'selected_tab_closure_replacement_without_inheritance', async () => {
    const oldId = selected;
    await selectedPage.close();
    const after = await unbound('selected_tab_closed');
    assert.ok(after.events.includes('tabs.onRemoved'));
    const old = await access('closed_selected_tab', oldId);
    assert.equal(old.status, 'UNAVAILABLE'); assert.equal(old.missingTarget, true);
    selected = await create(fixtureURL);
    selectedPage = await until(() => context.pages().find(page => page.url() === fixtureURL && !page.isClosed()), 'replacement_page_unavailable');
    assert.notEqual(selected, oldId); assert.notEqual(selected, duplicate);
    assert.equal((await access('replacement_uninvoked', selected)).status, 'DENIED');
    await unbound('replacement_uninvoked'); await isolated('replacement');
  });
  await check('7R', browserTier, 'replacement_requires_fresh_invocation_and_review', async () => { await invoke('replacement_revalidation'); await confirm(); });
  await check('8', browserTier, 'packaged_review_closure_invalidates_ownership_with_retained_access', async () => {
    await review.close();
    const after = await unbound('review_closed');
    assert.ok(['review_disconnected', 'tab_removed'].includes(after.lastInvalidation));
    assert.equal((await access('review_closed', selected, captured.capture.documentId)).status, 'RETAINED');
    const replacementReview = await context.newPage(); await replacementReview.goto(reviewURL);
    await until(async () => (await replacementReview.evaluate(() => replies)).includes('rejected'), 'replacement_review_rejection_unavailable');
    await unbound('replacement_review_rejected'); await replacementReview.close();
    await isolated('review_closed');
  });
  await check('8R', browserTier, 'review_loss_requires_fresh_invocation_and_confirmation', async () => { await invoke('review_revalidation'); await confirm(); });
  let cdp;
  try {
    await check('9', browserTier, 'controlled_worker_stop_different_boot_empty_authority', async () => {
      cdp = await context.newCDPSession(controlReview);
      const versions = [];
      cdp.on('ServiceWorker.workerVersionUpdated', event => versions.push(...event.versions.filter(v => v.scriptURL === worker.url())));
      await cdp.send('ServiceWorker.enable');
      const running = await until(() => versions.findLast(v => v.runningStatus === 'running'), 'worker_version_unavailable');
      const before = await snapshot('before_worker_stop');
      await cdp.send('ServiceWorker.stopWorker', { versionId: running.versionId });
      await until(() => versions.some(v => v.versionId === running.versionId && v.runningStatus === 'stopped'), 'controlled_stop_unavailable');
      observations.controlledStops++;
      await api(() => chrome.runtime.sendMessage({ kind: 'wake_diagnostic_only' }));
      // BF-09 proved that Playwright retains this handle; boot proves new worker execution.
      const after = await unbound('new_worker_boot');
      assert.notEqual(after.boot, before.boot);
      assert.equal(after.stats.actions, 0); assert.equal(after.stats.confirmations, 0); assert.equal(after.stats.reads, 0);
      assert.equal(after.held, false); observations.freshBoots++;
      await until(async () => await review.evaluate(() => button.disabled), 'review_disconnect_display_unavailable');
    });
  } finally {
    if (cdp) { await cdp.send('ServiceWorker.disable').catch(() => {}); await cdp.detach(); }
  }
  await check('10', browserTier, 'surviving_chrome_access_does_not_restore_old_capture', async () => {
    assert.equal((await access('after_worker_restart', selected, captured.capture.documentId)).status, 'RETAINED');
    observations.retainedAccess = true;
    await unbound('surviving_grant_empty_authority'); await isolated('worker_restart');
  });
  await check('S3', 'SIMULATED', 'old_review_ticket_after_worker_restart_rejected', () => replayOldTicket(review, 'restart_replay'));
  await check('11A', browserTier, 'fresh_post_restart_invocation_and_trusted_review_click', async () => {
    await invoke('post_restart_capture');
    await worker.evaluate(() => holdNextResultForTest());
    await confirm(true);
    assert.equal((await inspect()).stats.reads, 0);
  });
  await check('11', browserTier, 'real_navigation_changes_document_and_rejects_stale_target', async () => {
    await selectedPage.reload();
    const state = await unbound('navigation_with_pending_completion');
    assert.equal(state.stats.reads, 0); assert.ok(state.stats.loadingEvents >= 1);
    const current = await access('delayed_navigation_current', selected);
    assert.equal(current.status, 'RETAINED'); assert.notEqual(current.documentId, captured.capture.documentId);
    const old = await access('delayed_navigation_old_document', selected, captured.capture.documentId);
    assert.equal(old.status, 'UNAVAILABLE'); assert.equal(old.missingTarget, true);
    observations.staleTargetRejected = true;
    observations.loadingEvents = stateLog.reduce((sum, s, i, arr) =>
      arr.findLastIndex(v => v.boot === s.boot) === i ? sum + s.stats.loadingEvents : sum, 0);
  });
  await check('S4', 'SIMULATED', 'held_real_completion_rejected_after_real_navigation', async () => {
    await worker.evaluate(() => releaseResultForTest());
    await until(async () => (await inspect()).stats.lateRejected === 1, 'late_completion_rejection_unavailable');
    const state = await unbound('late_completion_rejected');
    assert.equal(state.stats.reads, 0); assert.equal(state.held, false);
    observations.delayedRejections = state.stats.lateRejected;
  });
  await check('12', browserTier, 'uninvoked_duplicate_and_negative_isolation_through_lifecycle', async () => {
    await isolated('final');
    assert.equal(observations.toolbarMouseClicks, observations.actionEvents);
    assert.equal(observations.invokingTabMatches, observations.actionEvents);
    assert.equal(observations.automatedReviewClicks, observations.actionEvents);
  });
} catch (error) {
  console.log('DIAGNOSTIC ' + JSON.stringify({ name: error.name,
    location: error.stack?.match(/browser-first-lifecycle-browser\.mjs:(\d+):\d+/)?.[1] || 'external' }));
  if (![...cases.values()].some(item => ['FAIL', 'BLOCKED'].includes(item.outcome))) {
    record('RUN', error.blocked || /Cannot find package 'playwright'/.test(error.message) ? 'BLOCKED' : 'FAIL', 'NOT_RUN',
      error.blocked ? error.message : 'environment_or_assertion_failure');
  }
} finally {
  for (const id of ['ENV', '1', '2', '3', '4', '4R', '5', '6', '6R', '7', '7R', '8', '8R', '9', '10', '11A', '11', '12', 'S1', 'S2', 'S3', 'S4']) {
    if (!cases.has(id)) record(id, 'BLOCKED', 'NOT_RUN', 'earlier_prerequisite_incomplete');
  }
  for (const limit of ['optional_grant_removal', 'natural_idle', 'crash_session_restore', 'bfcache_prerender_onReplaced',
    'browser_permission_prompts', 'hostile_real_pages', 'multi_role_integration', 'continuous_navigation_monitoring']) {
    record(`LIMIT_${limit}`, 'SKIP', 'NOT_RUN', 'outside_authorized_experiment');
  }
  let cleanup = true;
  try {
    if (context) await context.close();
    if (ownedPid) {
      const deadline = Date.now() + 5000;
      while (fs.existsSync(`/proc/${ownedPid}`) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal(fs.existsSync(`/proc/${ownedPid}`), false);
    }
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
      assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith('bf10-observer-'));
      assert.equal(fs.lstatSync(root).uid, process.getuid()); fs.rmSync(root, { recursive: true });
      assert.equal(fs.existsSync(root), false);
    }
    await new Promise(resolve => setImmediate(resolve)); assert.equal(sockets.size, 0);
    assert.equal(requests.unexpectedPage, 0); assert.equal(requests.rejectedFixture, 0); assert.equal(requests.forwarded, 0);
  } catch { cleanup = false; }
  record('13', cleanup ? 'PASS' : 'FAIL', observations.actionEvents ? browserTier : 'LOCAL_BROWSER_TESTED', 'network_boundary_and_owned_cleanup');
  const totals = { pass: 0, fail: 0, blocked: 0, skip: 0 };
  for (const item of cases.values()) totals[item.outcome.toLowerCase()]++;
  console.log(`RESULT ${JSON.stringify({ totals, cases: [...cases.values()], observations, accessLog, stateLog,
    requests, resources, cleanup, humanClicks: 0,
    accountVerified: false, executionAuthorized: false, approvalGranted: false, trustedContinuingContext: false })}`);
  if (totals.fail || totals.blocked) process.exitCode = 1;
}
