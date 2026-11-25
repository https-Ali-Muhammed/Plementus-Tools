import test from "node:test";
import assert from "node:assert/strict";
import { createSandboxPreparationController, RECORD_KEY } from "../src/background/sandbox-preparation-controller.mjs";
import { prepareWorkspaceBranch } from "../src/popup/workspace-branch-preparation.mjs";

const sender = { id: "extension-id", origin: "chrome-extension://extension-id",
  url: "chrome-extension://extension-id/src/popup/popup.html?workspace=1",
  tab: { id: 7, incognito: false } };
const start = { type: "SANDBOX_PREPARATION_START", operationId: "123e4567-e89b-42d3-a456-426614174000",
  repository: "fixture-owner/disposable-repo", sourceBranch: "main",
  newBranch: "plementus-mvp-check", acknowledged: true };
const deferred = () => { let resolve; let reject; const promise = new Promise((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; };

function fixture({ run = async () => "FORM_PREPARED", set = async () => {}, get = async () => ({}) } = {}) {
  const writes = [];
  let record;
  let calls = 0;
  const api = { runtime: { id: "extension-id", getURL: path => `chrome-extension://extension-id/${path}` },
    permissions: { contains: async () => true },
    storage: { session: {
      get: async key => get(key, record),
      set: async value => { await set(value); record = value[RECORD_KEY]; writes.push(record); },
      setAccessLevel: async () => {},
    } },
  };
  const controller = createSandboxPreparationController(api, async options => { calls++; return run(options); }, { waitMs: 75 });
  return { api, controller, writes, get calls() { return calls; }, get record() { return record; } };
}

function engineFixture({ set = async () => {}, get = async () => ({}), timeoutMs } = {}) {
  const calls = [];
  let record;
  const destination = "https://github.com/fixture-owner/disposable-repo/branches";
  const listeners = { addListener() {}, removeListener() {} };
  const api = {
    runtime: { id: "extension-id", getURL: path => `chrome-extension://extension-id/${path}` },
    permissions: { contains: async () => true },
    storage: { session: {
      get: key => get(key, record),
      set: async value => { await set(value); record = value[RECORD_KEY]; },
      setAccessLevel: async () => {},
    } },
    tabs: { create: async options => { calls.push("tabs.create"); return { id: 42, url: options.url }; },
      get: async () => ({ id: 42, windowId: 7, incognito: false, status: "complete", url: destination }),
      onUpdated: listeners, onRemoved: listeners },
    scripting: { executeScript: async options => {
      calls.push(options.func.name);
      return [{ frameId: 0, documentId: "fixture-document", result:
        options.func.name === "inspectWorkspaceBranchPage" ? true :
          options.func.name === "openNativeBranchDialog" ? "DIALOG_OPENED" :
          options.func.name === "prepareNativeBranchForm" ? "FORM_PREPARED" : true }];
    } },
  };
  const execute = timeoutMs === undefined ? prepareWorkspaceBranch :
    options => prepareWorkspaceBranch({ ...options, timeoutMs });
  return { api, calls, controller: createSandboxPreparationController(api, execute, { waitMs: 75 }),
    get record() { return record; } };
}

test("B03 actual engine rechecks revoked permission after each persistence checkpoint", async () => {
  const prefixes = new Map([
    ["NAVIGATION_PENDING", []],
    ["OPENING_DIALOG", ["tabs.create", "inspectWorkspaceBranchPage"]],
    ["PREPARING_FORM", ["tabs.create", "inspectWorkspaceBranchPage", "openNativeBranchDialog", "waitForNativeBranchDialog"]],
  ]);
  for (const [state, before] of prefixes) {
    const gate = deferred();
    const reached = deferred();
    const f = engineFixture({ set: async value => {
      if (value[RECORD_KEY].state === state) { reached.resolve(); await gate.promise; }
    } });
    let granted = true;
    f.api.permissions.contains = async () => granted;
    assert.equal((await f.controller.handle(start, sender)).ok, true, state);
    await reached.promise;
    granted = false;
    gate.resolve();
    await f.controller.idle();
    assert.deepEqual(f.calls, before, state);
    assert.equal(f.record.state, "PERMISSION_MISSING", state);
  }
});

test("B03 changed target tab after opener checkpoint prevents scripting dispatch", async () => {
  const gate = deferred();
  const reached = deferred();
  const f = engineFixture({ set: async value => {
    if (value[RECORD_KEY].state === "OPENING_DIALOG") { reached.resolve(); await gate.promise; }
  } });
  assert.equal((await f.controller.handle(start, sender)).ok, true);
  await reached.promise;
  f.api.tabs.get = async () => ({ id: 42, windowId: 7, incognito: false,
    status: "complete", url: "https://github.com/fixture-owner/disposable-repo/settings" });
  gate.resolve();
  await f.controller.idle();
  assert.deepEqual(f.calls, ["tabs.create", "inspectWorkspaceBranchPage"]);
  assert.equal(f.record.state, "UNSUPPORTED_PAGE");
});

test("B03 revocation during target-tab revalidation prevents opener dispatch", async () => {
  const checkpointGate = deferred();
  const checkpointReached = deferred();
  const tabGate = deferred();
  const tabReached = deferred();
  const f = engineFixture({ set: async value => {
    if (value[RECORD_KEY].state === "OPENING_DIALOG") { checkpointReached.resolve(); await checkpointGate.promise; }
  } });
  let granted = true;
  let holdTab = false;
  const originalGet = f.api.tabs.get;
  f.api.permissions.contains = async () => granted;
  f.api.tabs.get = async id => {
    if (holdTab) { tabReached.resolve(); await tabGate.promise; }
    return originalGet(id);
  };
  assert.equal((await f.controller.handle(start, sender)).ok, true);
  await checkpointReached.promise;
  holdTab = true;
  checkpointGate.resolve();
  await tabReached.promise;
  granted = false;
  tabGate.resolve();
  await f.controller.idle();
  assert.deepEqual(f.calls, ["tabs.create", "inspectWorkspaceBranchPage"]);
  assert.equal(f.record.state, "PERMISSION_MISSING");
});

test("B03 unresolved post-checkpoint permission check prevents navigation", async () => {
  const gate = deferred();
  const reached = deferred();
  const f = engineFixture({ timeoutMs: 300, set: async value => {
    if (value[RECORD_KEY].state === "NAVIGATION_PENDING") { reached.resolve(); await gate.promise; }
  } });
  let stall = false;
  f.api.permissions.contains = () => stall ? new Promise(() => {}) : Promise.resolve(true);
  assert.equal((await f.controller.handle(start, sender)).ok, true);
  await reached.promise;
  stall = true;
  gate.resolve();
  await f.controller.idle();
  assert.deepEqual(f.calls, []);
  assert.equal(f.record.state, "NAVIGATION_TIMEOUT");
});

test("B03 malformed post-checkpoint permission response prevents navigation", async () => {
  const gate = deferred();
  const reached = deferred();
  const f = engineFixture({ set: async value => {
    if (value[RECORD_KEY].state === "NAVIGATION_PENDING") { reached.resolve(); await gate.promise; }
  } });
  let malformed = false;
  f.api.permissions.contains = async () => malformed ? { granted: true } : true;
  assert.equal((await f.controller.handle(start, sender)).ok, true);
  await reached.promise;
  malformed = true;
  gate.resolve();
  await f.controller.idle();
  assert.deepEqual(f.calls, []);
  assert.equal(f.record.state, "PERMISSION_MISSING");
});

test("B01 actual engine waits for NAVIGATION_PENDING persistence before browser dispatch", async () => {
  const gate = deferred();
  const reached = deferred();
  const f = engineFixture({ set: async value => {
    if (value[RECORD_KEY].state === "NAVIGATION_PENDING") { reached.resolve(); await gate.promise; }
  } });
  assert.equal((await f.controller.handle(start, sender)).ok, true);
  await reached.promise;
  try {
    assert.equal(f.record.state, "ADMITTED");
    assert.deepEqual(f.calls, []);
  } finally { gate.resolve(); }
  await f.controller.idle();
  assert.deepEqual(f.calls, ["tabs.create", "inspectWorkspaceBranchPage", "openNativeBranchDialog",
    "waitForNativeBranchDialog", "prepareNativeBranchForm", "verifyPreparedNativeBranchForm"]);
  assert.equal(f.record.state, "FORM_PREPARED");
});

test("B02 unresolved initialization returns before independent 100 ms watchdog", async () => {
  const f = engineFixture({ get: () => new Promise(() => {}) });
  let timer;
  const watchdog = new Promise(resolve => { timer = setTimeout(() => resolve("WATCHDOG"), 100); });
  try {
    const result = await Promise.race([f.controller.handle({ type: "SANDBOX_PREPARATION_STATUS" }, sender), watchdog]);
    assert.notEqual(result, "WATCHDOG");
    assert.equal(result.reason, "SESSION_UNAVAILABLE");
    assert.deepEqual(f.calls, []);
  } finally { clearTimeout(timer); }
});

test("B01 actual engine gates navigation, opener and input preparation on delayed persistence", async () => {
  const prefixes = new Map([
    ["NAVIGATION_PENDING", []],
    ["OPENING_DIALOG", ["tabs.create", "inspectWorkspaceBranchPage"]],
    ["PREPARING_FORM", ["tabs.create", "inspectWorkspaceBranchPage", "openNativeBranchDialog", "waitForNativeBranchDialog"]],
  ]);
  for (const [state, before] of prefixes) {
    const gate = deferred();
    const reached = deferred();
    const f = engineFixture({ set: async value => {
      if (value[RECORD_KEY].state === state) { reached.resolve(); await gate.promise; }
    } });
    assert.equal((await f.controller.handle(start, sender)).ok, true, state);
    await reached.promise;
    try { assert.deepEqual(f.calls, before, state); }
    finally { gate.resolve(); }
    await f.controller.idle();
    assert.equal(f.record.state, "FORM_PREPARED", state);
    assert.equal(f.calls.at(-1), "verifyPreparedNativeBranchForm", state);
  }
});

test("B01 rejected checkpoint prevents every later browser interaction", async () => {
  const prefixes = new Map([
    ["NAVIGATION_PENDING", []],
    ["OPENING_DIALOG", ["tabs.create", "inspectWorkspaceBranchPage"]],
    ["PREPARING_FORM", ["tabs.create", "inspectWorkspaceBranchPage", "openNativeBranchDialog", "waitForNativeBranchDialog"]],
  ]);
  for (const [state, before] of prefixes) {
    const gate = deferred();
    const reached = deferred();
    const f = engineFixture({ set: async value => {
      if (value[RECORD_KEY].state === state) { reached.resolve(); await gate.promise; }
    } });
    assert.equal((await f.controller.handle(start, sender)).ok, true, state);
    await reached.promise;
    assert.deepEqual(f.calls, before, state);
    gate.reject(Error("controlled checkpoint rejection"));
    await f.controller.idle();
    assert.deepEqual(f.calls, before, state);
    assert.equal(f.record.state, "PREPARATION_UNCERTAIN", state);
  }
});

test("B02 unresolved permission and admission writes release the command queue", async () => {
  const stalledPermission = engineFixture();
  stalledPermission.api.permissions.contains = () => new Promise(() => {});
  const permission = await stalledPermission.controller.handle(start, sender);
  assert.equal(permission.reason, "SESSION_UNAVAILABLE");
  assert.equal((await stalledPermission.controller.handle({ type: "SANDBOX_PREPARATION_STATUS" }, sender)).reason, "SESSION_UNAVAILABLE");
  assert.deepEqual(stalledPermission.calls, []);

  const gate = deferred();
  const reached = deferred();
  const stalledWrite = engineFixture({ set: async value => {
    if (value[RECORD_KEY].state === "ADMITTED") { reached.resolve(); await gate.promise; }
  } });
  const first = stalledWrite.controller.handle(start, sender);
  const second = stalledWrite.controller.handle({ ...start, operationId: "223e4567-e89b-42d3-a456-426614174000" }, sender);
  await reached.promise;
  const results = await Promise.all([first, second]);
  assert.deepEqual(results.map(result => result.reason), ["SESSION_UNAVAILABLE", "SESSION_UNAVAILABLE"]);
  assert.equal((await stalledWrite.controller.handle({ type: "SANDBOX_PREPARATION_STATUS" }, sender)).reason, "SESSION_UNAVAILABLE");
  assert.deepEqual(stalledWrite.calls, []);
  gate.resolve();
  await Promise.resolve();
  assert.equal((await stalledWrite.controller.handle(start, sender)).reason, "SESSION_UNAVAILABLE");
  assert.deepEqual(stalledWrite.calls, []);
});

test("B02 late checkpoint completion cannot dispatch, and restart classifies the stored record", async () => {
  for (const outcome of ["resolve", "reject"]) {
    const gate = deferred();
    const reached = deferred();
    let held = false;
    const f = engineFixture({ get: async (key, record) => ({ [key]: record }), set: async value => {
      if (value[RECORD_KEY].state === "NAVIGATION_PENDING" && !held) {
        held = true;
        reached.resolve();
        await gate.promise;
      }
    } });
    assert.equal((await f.controller.handle(start, sender)).ok, true);
    await reached.promise;
    assert.equal((await f.controller.handle({ type: "SANDBOX_PREPARATION_STATUS" }, sender)).reason, "SESSION_UNAVAILABLE");
    await f.controller.idle();
    assert.deepEqual(f.calls, [], outcome);
    if (outcome === "resolve") gate.resolve();
    else gate.reject(Error("late storage rejection"));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal((await f.controller.handle(start, sender)).reason, "SESSION_UNAVAILABLE");
    assert.deepEqual(f.calls, [], outcome);
    const restarted = createSandboxPreparationController(f.api);
    const status = await restarted.handle({ type: "SANDBOX_PREPARATION_STATUS" }, sender);
    assert.equal(status.record.state, outcome === "resolve" ? "PREPARATION_UNCERTAIN" : "INTERRUPTED");
    assert.deepEqual(f.calls, [], outcome);
  }
});

test("B02 unresolved opener and input checkpoints stop later dispatch and status reports uncertainty", async () => {
  for (const [state, before] of [
    ["OPENING_DIALOG", ["tabs.create", "inspectWorkspaceBranchPage"]],
    ["PREPARING_FORM", ["tabs.create", "inspectWorkspaceBranchPage", "openNativeBranchDialog", "waitForNativeBranchDialog"]],
  ]) {
    const reached = deferred();
    const f = engineFixture({ set: value => {
      if (value[RECORD_KEY].state === state) { reached.resolve(); return new Promise(() => {}); }
    } });
    assert.equal((await f.controller.handle(start, sender)).ok, true);
    await reached.promise;
    assert.deepEqual(f.calls, before, state);
    assert.equal((await f.controller.handle({ type: "SANDBOX_PREPARATION_STATUS" }, sender)).reason, "PREPARATION_UNCERTAIN");
    await f.controller.idle();
    assert.deepEqual(f.calls, before, state);
  }
});

test("B02 late initialization and permission results cannot reopen admission", async () => {
  for (const outcome of ["resolve", "reject"]) {
    const initGate = deferred();
    const init = engineFixture();
    init.api.storage.session.setAccessLevel = () => initGate.promise;
    assert.equal((await init.controller.handle({ type: "SANDBOX_PREPARATION_STATUS" }, sender)).reason, "SESSION_UNAVAILABLE");
    if (outcome === "resolve") initGate.resolve();
    else initGate.reject(Error("late access-level failure"));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal((await init.controller.handle(start, sender)).reason, "SESSION_UNAVAILABLE");
    assert.deepEqual(init.calls, []);

    const permissionGate = deferred();
    const permission = engineFixture();
    permission.api.permissions.contains = () => permissionGate.promise;
    assert.equal((await permission.controller.handle(start, sender)).reason, "SESSION_UNAVAILABLE");
    if (outcome === "resolve") permissionGate.resolve(true);
    else permissionGate.reject(Error("late permission failure"));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal((await permission.controller.handle(start, sender)).reason, "SESSION_UNAVAILABLE");
    assert.deepEqual(permission.calls, []);
  }
});

test("rejects malformed messages and untrusted senders without side effects", async () => {
  const f = fixture();
  for (const message of [{ ...start, customer: "secret" }, { ...start, destination: "https://evil.test" },
    { ...start, sourceBranch: "../main" }, { type: "SANDBOX_PREPARATION_STATUS", extra: true }, {}])
    assert.equal((await f.controller.handle(message, sender)).ok, false);
  for (const wrong of [{ ...sender, id: "other" }, { ...sender, url: "https://github.com/x" },
    { ...sender, url: "chrome-extension://extension-id/src/popup/popup.html" },
    { ...sender, tab: undefined }])
    assert.equal((await f.controller.handle(start, wrong)).ok, false);
  assert.equal(f.calls, 0);
  assert.equal(f.writes.length, 0);
});

test("serializes concurrent starts, deduplicates ID, and admits before dispatch", async () => {
  const pending = deferred();
  const f = fixture({ run: async ({ onState, review }) => {
    assert.equal(f.record.state, "ADMITTED");
    assert.equal(review.destination, "https://github.com/fixture-owner/disposable-repo/branches");
    onState("NAVIGATION_PENDING");
    await pending.promise;
    onState("FORM_PREPARED");
    return "FORM_PREPARED";
  } });
  const [first, second] = await Promise.all([f.controller.handle(start, sender), f.controller.handle(start, { ...sender, tab: { id: 8, incognito: false } })]);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(f.calls, 1);
  assert.equal((await f.controller.handle({ ...start, operationId: "223e4567-e89b-42d3-a456-426614174000" }, sender)).reason, "OPERATION_CONFLICT");
  assert.equal((await f.controller.handle({ type: "SANDBOX_PREPARATION_STATUS" }, sender)).record.operationId, start.operationId);
  pending.resolve();
  await f.controller.idle();
  assert.equal(f.record.state, "FORM_PREPARED");
  assert.equal(f.writes[0].state, "ADMITTED");
  assert.equal(JSON.stringify(f.writes).includes("secret"), false);
});

test("fails closed on admission storage failure and permission revocation", async () => {
  const f = fixture({ set: async () => { throw Error("storage unavailable"); } });
  assert.equal((await f.controller.handle(start, sender)).reason, "SESSION_UNAVAILABLE");
  assert.equal(f.calls, 0);
  const g = fixture();
  g.api.permissions.contains = async () => false;
  assert.equal((await g.controller.handle(start, sender)).reason, "PERMISSION_MISSING");
  assert.equal(g.calls, 0);
});

test("worker restart marks unfinished record uncertain without replay", async () => {
  const previous = { operationId: start.operationId, runId: start.operationId,
    repository: start.repository, sourceBranch: start.sourceBranch, newBranch: start.newBranch,
    state: "NAVIGATION_PENDING", startedAt: Date.now(), updatedAt: Date.now() };
  const f = fixture({ get: async () => ({ [RECORD_KEY]: previous }) });
  const status = await f.controller.handle({ type: "SANDBOX_PREPARATION_STATUS" }, sender);
  assert.equal(status.record.state, "PREPARATION_UNCERTAIN");
  assert.equal(f.calls, 0);
  assert.equal((await f.controller.handle(start, sender)).record.state, "PREPARATION_UNCERTAIN");
  assert.equal((await f.controller.handle({ ...start, operationId: "223e4567-e89b-42d3-a456-426614174000" }, sender)).reason, "OPERATION_CONFLICT");
});

test("an admitted record interrupted before dispatch stays interrupted", async () => {
  const previous = { operationId: start.operationId, runId: start.operationId,
    repository: start.repository, sourceBranch: start.sourceBranch, newBranch: start.newBranch,
    state: "ADMITTED", startedAt: Date.now(), updatedAt: Date.now() };
  const f = fixture({ get: async () => ({ [RECORD_KEY]: previous }) });
  assert.equal((await f.controller.handle({ type: "SANDBOX_PREPARATION_STATUS" }, sender)).record.state, "INTERRUPTED");
  assert.equal(f.calls, 0);
});

test("invalid stored state fails closed", async () => {
  const previous = { operationId: start.operationId, runId: start.operationId,
    repository: start.repository, sourceBranch: start.sourceBranch, newBranch: start.newBranch,
    state: "UNKNOWN", startedAt: Date.now(), updatedAt: Date.now() };
  const f = fixture({ get: async () => ({ [RECORD_KEY]: previous }) });
  assert.equal((await f.controller.handle({ type: "SANDBOX_PREPARATION_STATUS" }, sender)).reason, "SESSION_UNAVAILABLE");
  assert.equal((await f.controller.handle({ ...start, operationId: "223e4567-e89b-42d3-a456-426614174000" }, sender)).reason, "SESSION_UNAVAILABLE");
  assert.equal(f.calls, 0);
});

test("a progress storage failure leaves uncertainty and stops further dispatch", async () => {
  let failed = false;
  const f = fixture({ set: async value => {
    if (value[RECORD_KEY].state === "NAVIGATION_PENDING" && !failed) { failed = true; throw Error("controlled storage failure"); }
  }, run: async ({ onState, fresh }) => {
    onState("NAVIGATION_PENDING");
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(fresh(), false);
    return "STALE_PLAN";
  } });
  assert.equal((await f.controller.handle(start, sender)).ok, true);
  await f.controller.idle();
  assert.equal(f.record.state, "PREPARATION_UNCERTAIN");
  assert.equal(f.calls, 1);
});

test("late progress cannot replace a terminal result", async () => {
  let late;
  const f = fixture({ run: async ({ onState }) => {
    late = onState;
    onState("FORM_PREPARED");
    return "FORM_PREPARED";
  } });
  await f.controller.handle(start, sender);
  await f.controller.idle();
  late("NAVIGATION_PENDING");
  await f.controller.idle();
  assert.equal(f.record.state, "FORM_PREPARED");
});

test("terminal write failure records uncertainty instead of permitting another dispatch", async () => {
  let failed = false;
  const f = fixture({ set: async value => {
    if (value[RECORD_KEY].state === "FORM_PREPARED" && !failed) { failed = true; throw Error("controlled terminal write failure"); }
  }, run: async () => "FORM_PREPARED" });
  assert.equal((await f.controller.handle(start, sender)).ok, true);
  await f.controller.idle();
  assert.equal(f.record.state, "PREPARATION_UNCERTAIN");
  assert.equal((await f.controller.handle({ ...start, operationId: "223e4567-e89b-42d3-a456-426614174000" }, sender)).reason, "OPERATION_CONFLICT");
});

test("an engine error after a recorded terminal result cannot erase it", async () => {
  const f = fixture({ run: async ({ onState }) => {
    onState("FORM_PREPARED");
    await new Promise(resolve => setImmediate(resolve));
    throw Error("late error");
  } });
  await f.controller.handle(start, sender);
  await f.controller.idle();
  assert.equal(f.record.state, "FORM_PREPARED");
});
