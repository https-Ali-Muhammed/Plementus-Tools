import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

// BF-11 disposable three-role experiment. BF-10-R1 GUI safeguards remain unchanged.
// No BF-07 import, production module or public test-command endpoint.
function matches(results, documentId) {
  return Array.isArray(results) && results.length === 1 && results[0]?.frameId === 0 &&
    typeof results[0].documentId === 'string' && results[0].documentId.length > 0 &&
    results[0].documentId.length <= 256 && results[0].result === true &&
    (documentId === undefined || results[0].documentId === documentId);
}

function observer() {
  const boot = crypto.randomUUID();
  const roles = ['Plementus', 'GitHub', 'Odoo.sh'];
  const bindings = Object.fromEntries(roles.map(role => [role, null]));
  const entries = new Set(), pending = new Set(), events = [];
  const diagnostics = [], diagnosticTabs = new Set();
  let diagnosticSequence = 0;
  const diagnose = (type, detail) => {
    diagnostics.push({ sequence: ++diagnosticSequence, time: Date.now(), type, ...detail });
    if (diagnostics.length > 96) diagnostics.shift();
  };
  const tabView = tab => ({ tabId: tab.id, windowId: tab.windowId, active: tab.active,
    status: tab.status, url: tab.url, pendingUrl: tab.pendingUrl });
  let capture = null, generation = 0, captureGeneration = 0, reviewGeneration = 0;
  let lastInvalidation = null, lastAction = null, lastLifecycle = null, discoveryFailure = null, holdNext = false, delayed = null;
  const stats = { actions: 0, discoveries: 0, confirmations: 0, reads: 0, rejected: 0,
    rejectedConnections: 0, invalidations: 0, loadingEvents: 0, lateRejected: 0, conflicts: 0 };
  const flags = { accountVerified: false, executionAuthorized: false, approvalGranted: false,
    trustedContinuingContext: false };
  const event = type => { events.push(type); if (events.length > 64) events.shift(); };
  const view = entry => entry && ({ id: entry.id, tabId: entry.tabId, windowId: entry.windowId,
    documentId: entry.documentId, reviewTab: entry.reviewTab, role: entry.role,
    captureGeneration: entry.captureGeneration, reviewGeneration: entry.reviewGeneration,
    consumed: entry.consumed, observed: entry.observed, owningDocument: entry.owner?.documentId });
  function inspectForTest() {
    return { boot, generation, captureGeneration, reviewGeneration, lastInvalidation, lastAction, lastLifecycle, discoveryFailure,
      events: [...events], diagnostics: [...diagnostics], capture: view(capture), bindings: Object.fromEntries(roles.map(role => [role, view(bindings[role])])),
      fixtureContextReady: !capture && !pending.size && roles.every(role => bindings[role]?.observed),
      pending: pending.size, held: Boolean(delayed), stats: { ...stats }, ...flags };
  }
  function send(port, value) { try { port.postMessage(value); } catch {} }
  function invalidate(reason) {
    // Clear every application binding and pending ticket synchronously before any port callback or await.
    generation++; lastInvalidation = reason; capture = null; pending.clear();
    diagnose('invalidate', { reason, generation });
    for (const role of roles) bindings[role] = null;
    const previous = [...entries]; entries.clear(); stats.invalidations++;
    for (const entry of previous) {
      const owner = entry.owner; entry.owner = null;
      if (owner) { send(owner.port, { state: 'unbound', reason, ...flags }); owner.port.disconnect(); }
    }
  }
  const live = (entry, epoch) => entries.has(entry) && generation === epoch;
  const eligible = (tab, entry) => tab.id === entry.tabId && tab.windowId === entry.windowId &&
    tab.url === entry.url && tab.status === 'complete' && tab.incognito === false && tab.discarded === false;
  const current = (entry, connection, epoch) => live(entry, epoch) && entry.owner === connection && pending.has(entry);

  chrome.action.onClicked.addListener(tab => {
    const entry = { id: crypto.randomUUID(), tabId: tab.id, windowId: tab.windowId, url: tab.url,
      captureGeneration: ++captureGeneration, reviewGeneration: ++reviewGeneration,
      documentId: null, reviewTab: null, role: null, consumed: false, observed: false, owner: null };
    stats.actions++; event('action.onClicked');
    diagnosticTabs.add(tab.id);
    diagnose('action.onClicked', { captureId: entry.id, ...tabView(tab) });
    lastAction = { tabId: entry.tabId, windowId: entry.windowId, eligibleURL: Object.values(fixtureURLs).includes(entry.url) };
    if (capture) invalidate('pending_capture_superseded');
    if (!Object.values(fixtureURLs).includes(entry.url) || !Number.isSafeInteger(entry.tabId) || entry.tabId < 0 ||
        !Number.isSafeInteger(entry.windowId) || entry.windowId < 0 || tab.incognito !== false || tab.discarded !== false) {
      invalidate('unsupported_invocation'); return;
    }
    capture = entry; entries.add(entry);
    void discover(entry);
  });
  async function discover(entry) {
    const epoch = generation;
    try {
      diagnose('discovery.request', { captureId: entry.id, tabId: entry.tabId, windowId: entry.windowId });
      const results = await chrome.scripting.executeScript({ target: { tabId: entry.tabId }, func: () => true });
      diagnose('discovery.result', { captureId: entry.id, results });
      if (!live(entry, epoch)) return;
      if (!matches(results)) throw new Error('unsupported_document');
      entry.documentId = results[0].documentId; stats.discoveries++;
      if (!eligible(await chrome.tabs.get(entry.tabId), entry)) throw new Error('context_changed');
      if (!live(entry, epoch)) return;
      const page = await chrome.tabs.create({ url: 'about:blank', active: false });
      if (!live(entry, epoch)) { await chrome.tabs.remove(page.id); return; }
      entry.reviewTab = page.id;
      await chrome.tabs.update(page.id, { url: chrome.runtime.getURL('review.html'), active: true });
    } catch (error) {
      // Exact errors are retained only for this owned, invented loopback experiment.
      diagnose('discovery.error', { captureId: entry.id, name: error.name, message: error.message.slice(0, 512) });
      discoveryFailure = ['unsupported_document', 'context_changed'].includes(error.message) ? error.message :
        /Cannot access contents|Missing host permission|cannot access the page|must invoke the extension/i.test(error.message) ? 'access_denied' : 'api_failure';
      if (live(entry, epoch)) invalidate('discovery_unavailable');
    }
  }
  chrome.runtime.onConnect.addListener(port => {
    let connection = null, entry = null, connected = true;
    port.onMessage.addListener(message => {
      if (!connection || !entry || !entries.has(entry) || entry.owner !== connection || capture !== entry ||
          !message || typeof message !== 'object' || Object.keys(message).length !== 5 ||
          message.kind !== 'confirm' || message.boot !== boot || message.captureId !== entry.id ||
          message.reviewGeneration !== entry.reviewGeneration || !roles.includes(message.role) || entry.consumed) {
        stats.rejected++; send(port, { state: 'rejected', ...flags }); return;
      }
      entry.consumed = true; stats.confirmations++;
      if (bindings[message.role] || Object.values(bindings).some(binding => binding &&
          (binding.tabId === entry.tabId || binding.documentId === entry.documentId))) {
        stats.conflicts++; invalidate('role_or_tab_conflict'); return;
      }
      if (fixtureURLs[message.role] !== entry.url) { invalidate('role_origin_mismatch'); return; }
      entry.role = message.role; pending.add(entry);
      void probe(entry, connection, generation);
    });
    port.onDisconnect.addListener(() => {
      connected = false; event('runtime.Port.onDisconnect');
      if (entry && entries.has(entry) && entry.owner === connection) invalidate('review_disconnected');
    });
    void admit();
    async function admit() {
      const sender = port.sender, candidate = capture, epoch = generation;
      try {
        if (!candidate || candidate.owner || port.name !== 'bf11-review' || sender?.id !== chrome.runtime.id ||
            sender.url !== chrome.runtime.getURL('review.html') || sender.origin !== chrome.runtime.getURL('').slice(0, -1) ||
            typeof sender.documentId !== 'string' || !sender.documentId || sender.documentLifecycle !== 'active') {
          throw new Error('wrong_review');
        }
        const contexts = await chrome.runtime.getContexts({ documentIds: [sender.documentId], contextTypes: ['TAB'] });
        if (!connected || !live(candidate, epoch) || capture !== candidate || candidate.owner || contexts.length !== 1 ||
            contexts[0].tabId !== candidate.reviewTab || contexts[0].documentId !== sender.documentId ||
            contexts[0].documentUrl !== chrome.runtime.getURL('review.html') || contexts[0].incognito !== false) {
          throw new Error('wrong_review_context');
        }
        entry = candidate; connection = { port, documentId: sender.documentId }; entry.owner = connection;
        send(port, { state: 'unassigned', boot, captureId: entry.id, reviewGeneration: entry.reviewGeneration, ...flags });
      } catch { stats.rejectedConnections++; send(port, { state: 'rejected', ...flags }); port.disconnect(); }
    }
  });
  async function probe(entry, connection, epoch) {
    const timeout = setTimeout(() => { if (current(entry, connection, epoch)) invalidate('probe_timeout'); }, 10000);
    try {
      if (!eligible(await chrome.tabs.get(entry.tabId), entry) || !current(entry, connection, epoch)) throw new Error('context_changed');
      const results = await chrome.scripting.executeScript({ target: { tabId: entry.tabId, documentIds: [entry.documentId] },
        func: () => document.documentElement.getAttribute('data-bf11') === 'bounded-fixture-v1' });
      // Test-driver delay holds a real result; it is SIMULATED scheduling, never a browser lifecycle event.
      if (holdNext) { holdNext = false; await new Promise(resolve => { delayed = resolve; }); }
      if (!current(entry, connection, epoch)) { stats.lateRejected++; return; }
      if (!matches(results, entry.documentId)) throw new Error('result_mismatch');
      // Freshly sample every bound document before the aggregate commit; no atomic/continuous claim.
      for (const binding of [...Object.values(bindings).filter(Boolean), entry]) {
        if (!eligible(await chrome.tabs.get(binding.tabId), binding)) throw new Error('context_changed');
        if (!current(entry, connection, epoch)) { stats.lateRejected++; return; }
        const proof = await chrome.scripting.executeScript({ target: { tabId: binding.tabId, documentIds: [binding.documentId] }, func: () => true });
        if (!current(entry, connection, epoch)) { stats.lateRejected++; return; }
        if (!matches(proof, binding.documentId) || !eligible(await chrome.tabs.get(binding.tabId), binding)) throw new Error('stale_binding');
        if (!current(entry, connection, epoch)) { stats.lateRejected++; return; }
      }
      pending.delete(entry); capture = null; bindings[entry.role] = entry; entry.observed = true; stats.reads++;
      send(connection.port, { state: 'fixture_read_observed', role: entry.role, ...flags });
    } catch {
      if (current(entry, connection, epoch)) invalidate('probe_unavailable'); else stats.lateRejected++;
    } finally { clearTimeout(timeout); }
  }
  function holdNextResultForTest() { holdNext = true; }
  function releaseResultForTest() { const resolve = delayed; delayed = null; resolve?.(); }
  chrome.runtime.onMessage.addListener((message, sender, reply) => { stats.rejected++; reply({ accepted: false, ...flags }); });
  chrome.tabs.onUpdated.addListener((id, change, tab) => {
    if (diagnosticTabs.has(id)) diagnose('tabs.onUpdated', { ...tabView(tab),
      changedStatus: change.status, changedURL: change.url, discarded: change.discarded });
    if ([...entries].some(entry => entry.tabId === id || (entry.owner && entry.reviewTab === id)) &&
        (change.status === 'loading' || typeof change.url === 'string' || change.discarded === true)) {
      lastLifecycle = { tabId: id, status: change.status, urlChanged: typeof change.url === 'string', discarded: change.discarded === true };
      event('tabs.onUpdated'); stats.loadingEvents++; invalidate('tab_changed');
    }
  });
  chrome.tabs.onRemoved.addListener(id => {
    if ([...entries].some(entry => entry.tabId === id || entry.reviewTab === id)) {
      event('tabs.onRemoved'); invalidate('tab_removed');
    }
  });
}

const browserTier = 'AUTOMATED_GUI_BROWSER_TESTED';
const diagnosticOnly = process.argv.includes('--diagnostic');
const cases = new Map();
const requiredCases = diagnosticOnly ? ['ENV', '1', 'S1', 'R1_A', 'R1_B', 'R1_C', 'R1_D'] : ['ENV', '1', '2', '3', '4', '5', '6', '6R', '7', '7R',
  ...['Plementus', 'GitHub', 'Odoo.sh'].flatMap(role => [`8_${role}`, `8R_${role}`]),
  '9', '9R', '10A', '10', '11C', '11R', '11D', '11DR', '12', '13', '14', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const requests = { fixture: 0, rejectedFixture: 0, unexpectedPage: 0, deniedProxy: 0, forwarded: 0 };
const servers = [], sockets = new Set();
const actionsByBoot = new Map();
const observations = { actionEvents: 0, invokingTabMatches: 0, automatedReviewClicks: 0, roleSelectionClicks: 0, completedConfirmations: 0, toolbarMouseClicks: 0, osMouseClicks: 0,
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
function fixture(label) {
  return http.createServer((req, res) => {
    requests.fixture++;
    if (req.method !== 'GET' || !['127.0.0.1', '127.0.0.2'].includes(req.socket.remoteAddress) ||
        !['/fixture', '/control'].includes(req.url)) {
      requests.rejectedFixture++; res.writeHead(403); res.end(); return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; object-src 'none'; frame-src 'none'");
    res.end(`<!doctype html><html data-bf11="bounded-fixture-v1"><title>BF11 ${label}</title>
<link rel="icon" href="data:,"><h1>BF11 ${label}</h1>
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
import ctypes,json,sys,subprocess,pyatspi
pid,wid,label,click=int(sys.argv[1]),sys.argv[2],sys.argv[3],sys.argv[4]=='true'
diagnostic={'ownedWindow':int(wid,16),'control':label,'clickRequested':click}
def emit():
 print('GUI_DIAGNOSTIC '+json.dumps(diagnostic),file=sys.stderr,flush=True)
def xd(*args):
 diagnostic['command']=args[0]
 try: return subprocess.check_output(['xdotool',*args],text=True,timeout=3).strip()
 except (subprocess.CalledProcessError,subprocess.TimeoutExpired):
  emit(); raise
# Read IDs/ancestry only; never read the contents or titles of another application.
def ancestry(window):
 lib=ctypes.CDLL('libX11.so.6'); W=ctypes.c_ulong; P=ctypes.POINTER
 lib.XOpenDisplay.argtypes=[ctypes.c_char_p];lib.XOpenDisplay.restype=ctypes.c_void_p
 lib.XQueryTree.argtypes=[ctypes.c_void_p,W,P(W),P(W),P(P(W)),P(ctypes.c_uint)]
 lib.XFree.argtypes=[ctypes.c_void_p];lib.XCloseDisplay.argtypes=[ctypes.c_void_p]
 display=lib.XOpenDisplay(None);assert display,'x11_display_unavailable'
 chain=[]
 try:
  for _ in range(16):
   if not window or window in chain: break
   chain.append(window)
   root,parent,children,count=W(),W(),P(W)(),ctypes.c_uint()
   assert lib.XQueryTree(display,window,ctypes.byref(root),ctypes.byref(parent),ctypes.byref(children),ctypes.byref(count)), 'x11_tree_unavailable'
   if children:lib.XFree(children)
   if window==root.value:break
   window=parent.value
  return chain
 finally:lib.XCloseDisplay(display)
def owned():
 p=subprocess.check_output(['xprop','-id',wid,'_NET_WM_PID'],text=True,timeout=3)
 assert p.strip().endswith('= '+str(pid))
owned()
diagnostic['activeBefore']=int(xd('getactivewindow'))
if diagnostic['activeBefore']!=int(wid,16): xd('windowactivate','--sync',wid)
diagnostic['activeAfter']=int(xd('getactivewindow'))
diagnostic['focus']=int(xd('getwindowfocus','-f'))
emit()
assert diagnostic['activeAfter']==int(wid,16)
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
diagnostic.update({'frame':[fr.x,fr.y,fr.width,fr.height],
 'controlRect':[rect.x,rect.y,rect.width,rect.height], 'geometry':geom,
 'scale':[sx,sy],'target':[x,y]})
if click:
 xd('mousemove',str(x),str(y))
 point=dict(line.split('=',1) for line in xd('getmouselocation','--shell').splitlines())
 diagnostic['pointer']=point
 diagnostic['pointerAncestry']=ancestry(int(point['WINDOW']))
 diagnostic['ownedAncestry']=ancestry(int(wid,16))
 emit()
 assert int(point['X'])==x and int(point['Y'])==y, 'pointer_position_mismatch'
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
 diagnostic['rechecked']=True
 emit()
 xd('click','1')
print(json.dumps({'found':True,'clicked':click,'role':node.getRoleName(),'diagnostic':diagnostic}))
`, String(pid), windowId, name, String(click)], { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] });
    const value = JSON.parse(result);
    if (value.diagnostic) console.log('GUI_DIAGNOSTIC ' + JSON.stringify(value.diagnostic));
    if (value.clicked) {
      observations.osMouseClicks++;
      console.log('OS_MOUSE_CLICK ' + name);
    }
    return value.found;
  } catch (error) {
    console.log('GUI_FAILURE ' + JSON.stringify({ requested: name, code: error.code, diagnostic: String(error.stderr || '').split('\n').filter(line => /^GUI_DIAGNOSTIC |File \"<string>\"|^AssertionError|^AttributeError|^TypeError|^subprocess\.(TimeoutExpired|CalledProcessError)/.test(line)) }));
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
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'bf11-observer-'));
  const roles = ['Plementus', 'GitHub', 'Odoo.sh'];
  const origins = {};
  for (const role of roles) origins[role] = await listen(fixture(`${role} INVENTED LOCAL FIXTURE`));
  const negativeOrigin = await listen(fixture('NEGATIVE CONTROL — DO NOT INVOKE'), '127.0.0.2');
  const fixtureURLs = Object.fromEntries(roles.map(role => [role, `${origins[role]}/fixture`]));
  const proxy = http.createServer((req, res) => { requests.deniedProxy++; res.writeHead(403); res.end(); });
  proxy.on('connect', (req, socket) => {
    requests.deniedProxy++; socket.on('error', () => socket.destroy());
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
  });
  const proxyOrigin = await listen(proxy);
  const extension = path.join(root, 'extension'), profile = path.join(root, 'profile');
  fs.mkdirSync(extension); fs.mkdirSync(profile);
  const manifest = { manifest_version: 3, name: 'BF11 observer', version: '1.0',
    permissions: ['activeTab', 'scripting'], background: { service_worker: 'worker.js' },
    action: { default_title: 'BF11 observer' } };
  fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
  // Function body is top-level worker code; test hooks are reachable only by the external driver.
  const body = observer.toString().slice(observer.toString().indexOf('{') + 1, -1);
  fs.writeFileSync(path.join(extension, 'worker.js'),
    `const fixtureURLs = ${JSON.stringify(fixtureURLs)};\n${matches.toString()}\n${body}\n`);
  fs.writeFileSync(path.join(extension, 'review.html'), `<!doctype html><html lang="en"><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; object-src 'none'; frame-src 'none'">
<title>BF11 packaged review</title><h1>BF11 disposable three-role review</h1>
<p>Invented local fixtures only. All account, approval and execution flags remain false.</p>
<p id="state" role="status" aria-live="polite">Waiting for a genuine fixture invocation.</p>
<p>Explicitly select this capture's fixture role. Labels are not verified providers.</p>
${roles.map(role => `<button data-role="${role}" disabled>Select ${role} fixture role</button>`).join('\n')}
<p id="selection">No role selected.</p><button id="confirm" disabled>Confirm selected fixture role</button>
<p>No continuing context or real website identity is verified.</p><script src="review.js"></script></html>`);
  fs.writeFileSync(path.join(extension, 'review.js'), `var reviewPort = chrome.runtime.connect({name:'bf11-review'});
var ticket = null; var selectedRole = null; var trustedClicks = 0; var roleClicks = 0; var replies = [];
const button = document.querySelector('#confirm'), state = document.querySelector('#state');
const choices = [...document.querySelectorAll('[data-role]')];
function disable() { button.disabled = true; choices.forEach(choice => { choice.disabled = true; }); }
reviewPort.onMessage.addListener(message => {
  replies.push(message.state); if (replies.length > 16) replies.shift();
  if (message.state === 'unassigned') {
    ticket = {kind:'confirm',boot:message.boot,captureId:message.captureId,reviewGeneration:message.reviewGeneration};
    selectedRole = null; choices.forEach(choice => { choice.disabled = false; }); button.disabled = true;
  } else disable();
  state.textContent = message.state === 'fixture_read_observed' ? 'One fixture role observed. No authority granted.' :
    message.state === 'unassigned' ? 'Choose a role, then confirm this capture.' : 'Unavailable. Fresh invocation required.';
});
reviewPort.onDisconnect.addListener(() => { disable(); state.textContent = 'Disconnected. Fresh invocations required.'; });
choices.forEach(choice => choice.addEventListener('click', event => {
  if (!event.isTrusted || !ticket || choice.disabled) return;
  roleClicks++; selectedRole = choice.dataset.role;
  document.querySelector('#selection').textContent = 'Selected fixture role: ' + selectedRole; button.disabled = false;
}));
button.addEventListener('click', event => {
  if (!event.isTrusted || !ticket || !selectedRole || button.disabled) return;
  trustedClicks++; disable(); reviewPort.postMessage({...ticket,role:selectedRole});
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
  const allowed = new Set([...Object.values(fixtureURLs), `${origins.Plementus}/control`, `${negativeOrigin}/fixture`,
    reviewURL, `${extensionOrigin}/review.js`]);
  await context.route('**/*', route => {
    if (allowed.has(route.request().url()) && route.request().method() === 'GET') return route.continue();
    requests.unexpectedPage++; return route.abort('blockedbyclient');
  });
  console.log(`ENV ${JSON.stringify({ node: process.version, chrome: context.browser().version(), mode: 'headed',
    generatedScriptSyntax: 'PASS', diagnosticOnly, permissions: manifest.permissions,
    sourceHash: createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex'),
    generatedHashes: Object.fromEntries(['manifest.json', 'worker.js', 'review.html', 'review.js'].map(file =>
      [file, createHash('sha256').update(fs.readFileSync(path.join(extension, file))).digest('hex')])) })}`);
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
  const tabs = {}, pages = {};
  for (const role of roles) {
    tabs[role] = await create(fixtureURLs[role]);
    pages[role] = context.pages().find(page => page.url() === fixtureURLs[role]);
  }
  const duplicate = await create(`${origins.Plementus}/control`), negative = await create(`${negativeOrigin}/fixture`);
  const inject = (tabId, documentId) => api(async ({ tabId, documentId }) => {
    try {
      return { results: await chrome.scripting.executeScript({ target: { tabId,
        ...(documentId === undefined ? {} : { documentIds: [documentId] }) },
      func: () => document.documentElement.getAttribute('data-bf11') === 'bounded-fixture-v1' }) };
    } catch (error) {
      return { error: { name: error.name, message: error.message.slice(0, 512) },
        denied: /Cannot access contents|Missing host permission|cannot access the page|must invoke the extension/i.test(error.message),
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
  const boundCount = state => Object.values(state.bindings).filter(Boolean).length;
  async function unbound(label) {
    await until(async () => { const s = await inspect(); return s.capture === null && boundCount(s) === 0; }, `${label}_invalidation_unavailable`);
    const state = await snapshot(label);
    assert.equal(state.fixtureContextReady, false); assert.equal(state.pending, 0);
    assert.ok(Object.values(state.bindings).every(value => value === null));
    return state;
  }
  async function access(label, tabId, documentId) {
    const result = await inject(tabId, documentId);
    const status = result.results ? 'RETAINED' : result.denied ? 'DENIED' : 'UNAVAILABLE';
    if (result.results) assert.ok(matches(result.results, documentId));
    const observation = { label, tabId, status, error: result.error,
      missingTarget: result.missing === true, documentId: result.results?.[0]?.documentId };
    accessLog.push(observation); console.log('ACCESS ' + JSON.stringify(observation)); return observation;
  }
  async function isolated(label) {
    for (const [role, id] of [['duplicate', duplicate], ['negative', negative]]) {
      assert.equal((await access(`${label}_${role}`, id)).status, 'DENIED');
    }
  }
  let review, captured;
  const seenReviews = new Set();
  async function documentDiagnostic(role, label) {
    const cdp = await context.newCDPSession(pages[role]);
    try {
      const { frameTree: { frame } } = await cdp.send('Page.getFrameTree');
      const tab = await api(id => chrome.tabs.get(id), tabs[role]);
      const active = await api(windowId => chrome.tabs.query({ windowId, active: true }), tab.windowId);
      const document = await pages[role].evaluate(() => ({ readyState: document.readyState, timeOrigin: performance.timeOrigin }));
      console.log('DOCUMENT_DIAGNOSTIC ' + JSON.stringify({ label, time: Date.now(), tabId: tab.id,
        windowId: tab.windowId, active: tab.active, status: tab.status, url: tab.url, pendingUrl: tab.pendingUrl,
        activeTabs: active.map(item => ({ tabId: item.id, windowId: item.windowId })),
        committedURL: frame.url, frameId: frame.id, loaderId: frame.loaderId, document }));
      return { tab, frame, document };
    } finally { await cdp.detach(); }
  }
  async function invoke(role, label) {
    const before = await inspect();
    await pages[role].bringToFront();
    const selected = await api(id => chrome.tabs.get(id), tabs[role]);
    assert.equal(selected.active, true);
    await documentDiagnostic(role, `${label}_before_action`);
    if (!guiControl(browserPid, 'BF11 observer', false)) {
      await guiClick(browserPid, 'Extensions'); await guiClick(browserPid, 'Pin BF11 observer');
      await guiClick(browserPid, 'Extensions');
    }
    await guiClick(browserPid, 'BF11 observer'); observations.toolbarMouseClicks++;
    captured = await until(async () => {
      const state = await inspect(); assert.equal(state.boot, before.boot);
      assert.ok(state.stats.actions <= before.stats.actions + 1, 'extra_action');
      if (state.stats.actions === before.stats.actions) return;
      if (!state.capture) {
        await snapshot('action_capture_unavailable');
        await documentDiagnostic(role, `${label}_after_unavailable`);
        blocked('real_action_capture_unavailable');
      }
      assert.equal(state.capture.tabId, tabs[role]); assert.equal(state.capture.windowId, selected.windowId);
      return state.capture.owningDocument && state.capture.documentId && state;
    }, 'automated_action_unavailable', 10000);
    observations.invokingTabMatches++;
    assert.equal(captured.capture.consumed, false); assert.equal(captured.capture.observed, false);
    assert.equal(captured.fixtureContextReady, false);
    assert.deepEqual(captured.bindings, before.bindings);
    review = await until(() => context.pages().find(page => page.url() === reviewURL && page !== controlReview &&
      !page.isClosed() && !seenReviews.has(page)), 'owning_review_unavailable');
    seenReviews.add(review);
    assert.equal(await review.evaluate(() => ticket.captureId), captured.capture.id);
    assert.equal(await review.evaluate(() => selectedRole), null);
    assert.equal(await review.evaluate(() => button.disabled), true);
    await snapshot(label); await isolated(label);
  }
  async function confirm(role, mode = 'accepted') {
    const before = await inspect();
    await review.bringToFront();
    await guiClick(browserPid, `Select ${role} fixture role`); observations.roleSelectionClicks++;
    assert.equal(await review.evaluate(() => selectedRole), role);
    await guiClick(browserPid, 'Confirm selected fixture role'); observations.automatedReviewClicks++;
    await until(async () => {
      const state = await inspect();
      return mode === 'held' ? state.held : mode === 'conflict' ? state.stats.conflicts === before.stats.conflicts + 1 :
        state.stats.reads === before.stats.reads + 1;
    }, 'current_review_confirmation_unavailable', 10000);
    const after = await inspect();
    assert.equal(after.stats.confirmations, before.stats.confirmations + 1);
    assert.equal(await review.evaluate(() => trustedClicks), 1); assert.equal(await review.evaluate(() => roleClicks), 1);
    observations.completedConfirmations++;
    if (mode === 'accepted') {
      assert.equal(after.bindings[role].observed, true); assert.equal(after.bindings[role].consumed, true);
      assert.equal(after.bindings[role].tabId, captured.capture.tabId);
      assert.equal(after.bindings[role].documentId, captured.capture.documentId);
      assert.equal((await access(`confirmed_${role}`, tabs[role], captured.capture.documentId)).status, 'RETAINED');
      for (const other of roles.filter(item => item !== role)) assert.deepEqual(after.bindings[other], before.bindings[other]);
      const bindings = Object.values(after.bindings).filter(Boolean);
      assert.equal(new Set(bindings.map(item => item.tabId)).size, bindings.length);
      assert.equal(new Set(bindings.map(item => item.documentId)).size, bindings.length);
      assert.equal(after.fixtureContextReady, bindings.length === 3);
    }
    await snapshot(`confirmed_${role}_${mode}`);
  }
  async function recover(label) {
    const before = await unbound(`${label}_start`);
    for (const [i, role] of roles.entries()) {
      await invoke(role, `${label}_${role}`); await confirm(role);
      const state = await inspect();
      assert.equal(boundCount(state), i + 1); assert.equal(state.fixtureContextReady, i === 2);
    }
    const after = await snapshot(`${label}_ready`);
    assert.equal(after.stats.actions, before.stats.actions + 3);
    assert.equal(after.stats.confirmations, before.stats.confirmations + 3);
    assert.equal(after.stats.reads, before.stats.reads + 3);
  }
  async function replayOldTicket(page, label) {
    const before = await inspect();
    await page.evaluate(() => {
      const port = chrome.runtime.connect({ name: 'bf11-review' });
      port.onDisconnect.addListener(() => { void chrome.runtime.lastError; });
      port.postMessage({ ...ticket, role: selectedRole });
    });
    await until(async () => (await inspect()).stats.rejectedConnections > before.stats.rejectedConnections, 'old_capture_rejection_unavailable');
    const after = await snapshot(label);
    assert.deepEqual(after.bindings, before.bindings); assert.deepEqual(after.capture, before.capture);
    assert.equal(after.stats.reads, before.stats.reads); assert.equal(after.stats.confirmations, before.stats.confirmations);
  }
  await check('ENV', 'LOCAL_BROWSER_TESTED', 'owned_headed_gui_minimal_permissions_three_distinct_origins', async () => {
    assert.ok(mappedWindow(browserPid));
    assert.deepEqual(await api(() => chrome.permissions.getAll()), { permissions: ['activeTab', 'scripting'], origins: [] });
    assert.equal(await api(() => chrome.action.getPopup({})), '');
    assert.equal(await api(() => typeof chrome.webNavigation), 'undefined');
    assert.equal(new Set([...Object.values(tabs), duplicate, negative]).size, 5);
    assert.equal(new Set(Object.values(origins)).size, 3);
  });
  await check('1', 'LOCAL_BROWSER_TESTED', 'all_five_uninvoked_tabs_deny_scripting', async () => {
    assert.equal((await inspect()).stats.actions, 0);
    for (const role of roles) assert.equal((await access(`before_${role}`, tabs[role])).status, 'DENIED');
    await isolated('before'); await unbound('before');
  });
  if (diagnosticOnly) {
    await check('R1_A', browserTier, 'fresh_new_tab_invocation', async () => {
      await invoke('Odoo.sh', 'R1_A'); await confirm('Odoo.sh');
    });
    await check('R1_B', browserTier, 'fresh_invocation_after_same_origin_reload', async () => {
      await pages['Odoo.sh'].reload(); await unbound('R1_B_reload');
      await invoke('Odoo.sh', 'R1_B'); await confirm('Odoo.sh');
    });
    await check('R1_C', browserTier, 'fresh_invocation_after_cross_origin_return', async () => {
      await pages['Odoo.sh'].goto(`${negativeOrigin}/fixture`); await unbound('R1_C_departed');
      assert.equal((await access('R1_C_departed', tabs['Odoo.sh'])).status, 'DENIED');
      await documentDiagnostic('Odoo.sh', 'R1_C_departed');
      await pages['Odoo.sh'].goto(fixtureURLs['Odoo.sh']); await unbound('R1_C_returned');
      assert.equal((await access('R1_C_returned', tabs['Odoo.sh'])).status, 'DENIED');
      await invoke('Odoo.sh', 'R1_C'); await confirm('Odoo.sh');
    });
    await check('R1_D', browserTier, 'return_after_multiple_distinct_role_invocations', async () => {
      for (const role of ['Plementus', 'GitHub']) { await invoke(role, `R1_D_${role}`); await confirm(role); }
      assert.equal((await inspect()).fixtureContextReady, true);
      await pages['Odoo.sh'].goto(`${negativeOrigin}/fixture`); await unbound('R1_D_departed');
      await pages['Odoo.sh'].goto(fixtureURLs['Odoo.sh']); await unbound('R1_D_returned');
      assert.equal((await access('R1_D_returned', tabs['Odoo.sh'])).status, 'DENIED');
      await recover('R1_D_recovery');
    });
  } else {
  await check('2', browserTier, 'first_exact_action_explicit_role_confirmation', async () => {
    await invoke('Plementus', 'first'); await confirm('Plementus');
    assert.equal(boundCount(await inspect()), 1);
  });
  await check('3', browserTier, 'second_distinct_role_preserves_first_binding', async () => {
    await invoke('GitHub', 'second'); await confirm('GitHub'); assert.equal(boundCount(await inspect()), 2);
  });
  await check('4', browserTier, 'third_distinct_role_establishes_bounded_fixture_readiness', async () => {
    await invoke('Odoo.sh', 'third'); await confirm('Odoo.sh'); assert.equal((await inspect()).fixtureContextReady, true);
  });
  await check('5', browserTier, 'readiness_false_at_zero_one_two_and_true_only_at_three', async () => {
    for (const count of [0, 1, 2, 3]) {
      const states = stateLog.filter(s => boundCount(s) === count && !s.capture);
      assert.ok(states.length > 0); assert.ok(states.every(s => s.fixtureContextReady === (count === 3)));
    }
  });
  await check('6', browserTier, 'duplicate_role_confirmation_globally_invalidates', async () => {
    await pages.Plementus.reload(); await unbound('prepare_duplicate_role');
    await invoke('Plementus', 'duplicate_role_first'); await confirm('Plementus');
    await invoke('GitHub', 'duplicate_role_distinct_tab');
    assert.equal(captured.bindings.GitHub, null);
    assert.notEqual(captured.capture.tabId, captured.bindings.Plementus.tabId);
    await confirm('Plementus', 'conflict');
    assert.equal((await unbound('duplicate_role_rejected')).lastInvalidation, 'role_or_tab_conflict');
  });
  await check('6R', browserTier, 'all_three_fresh_after_duplicate_role', () => recover('duplicate_recovery'));
  await check('7', browserTier, 'same_tab_for_second_role_rejected', async () => {
    // Use only one occupied role so the distinct GitHub role itself is not a duplicate.
    await pages.Plementus.reload(); await unbound('prepare_tab_conflict');
    await invoke('Plementus', 'one_role'); await confirm('Plementus');
    await invoke('Plementus', 'same_tab_other_role'); await confirm('GitHub', 'conflict');
    assert.equal((await unbound('same_tab_rejected')).lastInvalidation, 'role_or_tab_conflict');
  });
  await check('7R', browserTier, 'all_three_fresh_after_tab_conflict', () => recover('tab_conflict_recovery'));
  for (const role of roles) {
    await check(`8_${role}`, browserTier, 'assigned_role_reload_globally_invalidates_all_three', async () => {
      const before = await inspect(), oldDocument = before.bindings[role].documentId;
      await pages[role].reload();
      const after = await unbound(`reload_${role}`);
      assert.ok(after.generation > before.generation); assert.ok(after.stats.loadingEvents > before.stats.loadingEvents);
      assert.equal(after.stats.reads, before.stats.reads);
      for (const other of roles) assert.equal((await access(`reload_${role}_${other}`, tabs[other])).status, 'RETAINED');
      const fresh = await access(`reload_${role}_new_document`, tabs[role]); assert.notEqual(fresh.documentId, oldDocument);
      const stale = await access(`reload_${role}_stale_document`, tabs[role], oldDocument);
      assert.equal(stale.status, 'UNAVAILABLE'); assert.equal(stale.missingTarget, true);
      observations.staleTargetRejected = true; await isolated(`reload_${role}`);
    });
    await check(`8R_${role}`, browserTier, 'each_role_reload_requires_three_new_invocations', () => recover(`reload_${role}_recovery`));
  }
  const oldReview = review;
  await check('9', browserTier, 'cross_origin_departure_return_never_restores_application_bindings', async () => {
    const before = await inspect(); await pages['Odoo.sh'].goto(`${negativeOrigin}/fixture`);
    await unbound('cross_origin'); assert.equal((await access('departed', tabs['Odoo.sh'])).status, 'DENIED');
    await pages['Odoo.sh'].goto(fixtureURLs['Odoo.sh']); await unbound('returned');
    assert.equal((await access('returned', tabs['Odoo.sh'])).status, 'DENIED');
    assert.equal((await inspect()).stats.actions, before.stats.actions); await isolated('returned');
  });
  await check('S2', 'SIMULATED', 'old_ticket_reconnect_after_navigation_rejected', () => replayOldTicket(oldReview, 'old_review_rejected'));
  await check('9R', browserTier, 'three_fresh_after_cross_origin_return', () => recover('return_recovery'));
  await check('11C', browserTier, 'owning_review_closure_globally_invalidates', async () => {
    const before = await inspect(); await review.close(); const after = await unbound('review_closed');
    assert.ok(['tab_removed', 'review_disconnected'].includes(after.lastInvalidation));
    for (const role of roles) assert.equal((await access(`review_closed_${role}`, tabs[role], before.bindings[role].documentId)).status, 'RETAINED');
    const replacement = await context.newPage(); await replacement.goto(reviewURL);
    await until(async () => (await replacement.evaluate(() => replies)).includes('rejected'), 'replacement_review_not_rejected');
    await unbound('replacement_review_rejected'); await replacement.close();
  });
  await check('S3', 'SIMULATED', 'old_review_cannot_reclaim_fresh_pending_capture', async () => {
    await invoke('Plementus', 'fresh_pending_for_replay');
    const owner = (await inspect()).capture.owningDocument; assert.ok(owner);
    await replayOldTicket(oldReview, 'old_review_against_pending_capture');
    assert.equal((await inspect()).capture.owningDocument, owner);
  });
  await check('11R', browserTier, 'three_fresh_after_review_closure', async () => {
    await confirm('Plementus'); assert.equal((await inspect()).fixtureContextReady, false);
    for (const role of ['GitHub', 'Odoo.sh']) { await invoke(role, `review_recovery_${role}`); await confirm(role); }
    assert.equal((await inspect()).fixtureContextReady, true);
  });
  await check('11D', browserTier, 'old_review_closure_cannot_disturb_new_bindings', async () => {
    const before = await inspect(); await oldReview.close();
    assert.deepEqual((await inspect()).bindings, before.bindings); assert.equal((await inspect()).fixtureContextReady, true);
  });
  await check('S4', 'SIMULATED', 'driver_requested_port_disconnect_clears_all_roles', async () => {
    await review.evaluate(() => reviewPort.disconnect());
    const after = await unbound('explicit_port_disconnect'); assert.equal(after.lastInvalidation, 'review_disconnected');
  });
  await check('11DR', browserTier, 'three_fresh_after_port_disconnect', () => recover('disconnect_recovery'));
  let cdp;
  try {
    await check('12', browserTier, 'controlled_worker_restart_unbound_despite_surviving_chrome_grants', async () => {
      cdp = await context.newCDPSession(controlReview); const versions = [];
      cdp.on('ServiceWorker.workerVersionUpdated', event => versions.push(...event.versions.filter(v => v.scriptURL === worker.url())));
      await cdp.send('ServiceWorker.enable');
      const running = await until(() => versions.findLast(v => v.runningStatus === 'running'), 'worker_version_unavailable');
      const before = await snapshot('before_worker_stop');
      await cdp.send('ServiceWorker.stopWorker', { versionId: running.versionId });
      await until(() => versions.some(v => v.versionId === running.versionId && v.runningStatus === 'stopped'), 'controlled_stop_unavailable');
      observations.controlledStops++;
      await api(() => chrome.runtime.sendMessage({ kind: 'wake_diagnostic_only' }));
      const after = await unbound('worker_restarted'); assert.notEqual(after.boot, before.boot); observations.freshBoots++;
      assert.equal(after.stats.actions, 0); assert.equal(after.stats.confirmations, 0); assert.equal(after.stats.reads, 0);
      assert.equal(after.held, false);
      for (const role of roles) assert.equal((await access(`restart_${role}`, tabs[role], before.bindings[role].documentId)).status, 'RETAINED');
      observations.retainedAccess = true; await unbound('surviving_grants'); await isolated('restart');
      await until(async () => await review.evaluate(() => button.disabled), 'old_review_not_disabled');
    });
  } finally { if (cdp) { await cdp.send('ServiceWorker.disable').catch(() => {}); await cdp.detach(); } }
  await check('S5', 'SIMULATED', 'old_boot_review_confirmation_rejected', () => replayOldTicket(review, 'restart_ticket_rejected'));
  await check('10A', browserTier, 'fresh_post_restart_roles_and_third_review_read_started', async () => {
    for (const role of ['Plementus', 'GitHub']) { await invoke(role, `post_restart_${role}`); await confirm(role); }
    await invoke('Odoo.sh', 'pending_third'); await worker.evaluate(() => holdNextResultForTest()); await confirm('Odoo.sh', 'held');
    const state = await inspect(); assert.equal(boundCount(state), 2); assert.equal(state.fixtureContextReady, false);
    assert.equal(state.pending, 1);
  });
  await check('10', browserTier, 'real_reload_clears_other_roles_and_pending_third_before_completion', async () => {
    const oldDocument = captured.capture.documentId; await pages['Odoo.sh'].reload();
    const state = await unbound('pending_reload'); assert.equal(state.stats.reads, 2); assert.equal(state.pending, 0);
    const fresh = await access('pending_new_document', tabs['Odoo.sh']); assert.notEqual(fresh.documentId, oldDocument);
    const stale = await access('pending_stale_document', tabs['Odoo.sh'], oldDocument);
    assert.equal(stale.status, 'UNAVAILABLE'); assert.equal(stale.missingTarget, true);
  });
  await check('S6', 'SIMULATED', 'held_real_completion_cannot_restore_any_invalidated_binding', async () => {
    await worker.evaluate(() => releaseResultForTest());
    await until(async () => (await inspect()).stats.lateRejected === 1, 'late_result_not_rejected');
    const state = await unbound('late_rejected'); assert.equal(state.stats.reads, 2); assert.equal(state.held, false);
    observations.delayedRejections = state.stats.lateRejected;
  });
  await check('14', browserTier, 'final_recovery_requires_all_three_new_invocations_and_confirmations', () => recover('final_recovery'));
  await check('13', browserTier, 'controls_isolated_and_action_review_counters_reconciled', async () => {
    await isolated('final'); assert.equal((await inspect()).fixtureContextReady, true);
    assert.equal(observations.toolbarMouseClicks, observations.actionEvents);
    assert.equal(observations.invokingTabMatches, observations.actionEvents);
    assert.equal(observations.automatedReviewClicks, observations.actionEvents);
    assert.equal(observations.roleSelectionClicks, observations.actionEvents);
    assert.equal(observations.completedConfirmations, observations.actionEvents);
    observations.loadingEvents = stateLog.filter((s, i, all) => all.findLastIndex(v => v.boot === s.boot) === i)
      .reduce((sum, s) => sum + s.stats.loadingEvents, 0);
  });
  }

} catch (error) {
  console.log('DIAGNOSTIC ' + JSON.stringify({ name: error.name,
    location: error.stack?.match(/browser-first-three-role-browser\.mjs:(\d+):\d+/)?.[1] || 'external' }));
  if (![...cases.values()].some(item => ['FAIL', 'BLOCKED'].includes(item.outcome))) {
    record('RUN', error.blocked || /Cannot find package 'playwright'/.test(error.message) ? 'BLOCKED' : 'FAIL', 'NOT_RUN',
      error.blocked ? error.message : 'environment_or_assertion_failure');
  }
} finally {
  for (const id of requiredCases) {
    if (!cases.has(id)) record(id, 'BLOCKED', 'NOT_RUN', 'earlier_prerequisite_incomplete');
  }
  for (const limit of ['optional_grant_removal', 'natural_idle', 'crash_session_restore', 'bfcache_prerender_onReplaced',
    'browser_permission_prompts', 'hostile_real_pages', 'bf07_runtime_integration', 'continuous_navigation_monitoring']) {
    record(`LIMIT_${limit}`, 'NOT_RUN', 'NOT_RUN', 'outside_authorized_experiment');
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
      assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith('bf11-observer-'));
      assert.equal(fs.lstatSync(root).uid, process.getuid()); fs.rmSync(root, { recursive: true });
      assert.equal(fs.existsSync(root), false);
    }
    await new Promise(resolve => setImmediate(resolve)); assert.equal(sockets.size, 0);
    assert.equal(requests.unexpectedPage, 0); assert.equal(requests.rejectedFixture, 0); assert.equal(requests.forwarded, 0);
  } catch { cleanup = false; }
  record('15', cleanup ? 'PASS' : 'FAIL', observations.actionEvents ? browserTier : 'LOCAL_BROWSER_TESTED', 'network_boundary_and_owned_cleanup');
  const totals = { pass: 0, fail: 0, blocked: 0, not_run: 0 };
  for (const item of cases.values()) totals[item.outcome.toLowerCase()]++;
  console.log(`RESULT ${JSON.stringify({ totals, cases: [...cases.values()], observations, accessLog, stateLog,
    requests, resources, cleanup, humanClicks: 0,
    accountVerified: false, executionAuthorized: false, approvalGranted: false, trustedContinuingContext: false })}`);
  if (totals.fail || totals.blocked) process.exitCode = 1;
}
