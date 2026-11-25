import assert from "node:assert/strict";
import { test } from "node:test";

test("workspace preparation module exposes a bounded operation and a non-submitting opener", async () => {
  const module = await import("../src/popup/workspace-branch-preparation.mjs").catch(() => ({}));
  assert.equal(typeof module.prepareWorkspaceBranch, "function");
  assert.equal(typeof module.openNativeBranchDialog, "function");
});

const review = Object.freeze({ repository: "fixture-owner/disposable-repo", sourceBranch: "main",
  newBranch: "plementus-mvp-check-1", destination: "https://github.com/fixture-owner/disposable-repo/branches" });
const complete = { id: 42, windowId: 7, incognito: false, status: "complete", url: review.destination };

function fixture(overrides = {}) {
  const calls = [];
  const state = { permission: true, tab: complete, documentId: "document-1", fresh: true, ...overrides };
  const listeners = new Set();
  const removed = new Set();
  const api = {
    permissions: { contains: async () => state.permission },
    tabs: {
      create: async options => { calls.push(["create", options]); return { id: 42, url: options.url }; },
      get: async id => { calls.push(["get", id]); if (!state.tab) throw Error("closed"); return state.tab; },
      onUpdated: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) },
      onRemoved: { addListener: fn => removed.add(fn), removeListener: fn => removed.delete(fn) },
    },
    scripting: { executeScript: async options => {
      calls.push(["script", options.target, options.func.name, options.args]);
      if (state.scriptResult) return state.scriptResult(options);
      return [{ frameId: 0, documentId: state.documentId,
        result: options.func.name === "inspectWorkspaceBranchPage" ? true :
          options.func.name === "openNativeBranchDialog" ? "DIALOG_OPENED" :
          options.func.name === "waitForNativeBranchDialog" ||
          options.func.name === "verifyPreparedNativeBranchForm" ? true : "FORM_PREPARED" }];
    } },
  };
  return { api, calls, state, listeners, removed };
}

test("one operation uses its created tab and one document, opens once, and prepares without submitting", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  const { api, calls } = fixture();
  const states = [];
  const outcome = await prepareWorkspaceBranch({ api, review, permissionRequest: Promise.resolve(true),
    fresh: () => true, onState: value => states.push(value), timeoutMs: 200 });
  assert.equal(outcome, "FORM_PREPARED");
  assert.deepEqual(calls.filter(([name]) => name === "create"), [["create", { url: review.destination }]]);
  assert.deepEqual(calls.filter(([name]) => name === "script").map(([, target, func]) => [target, func]), [
    [{ tabId: 42, frameIds: [0] }, "inspectWorkspaceBranchPage"],
    [{ tabId: 42, documentIds: ["document-1"] }, "openNativeBranchDialog"],
    [{ tabId: 42, documentIds: ["document-1"] }, "waitForNativeBranchDialog"],
    [{ tabId: 42, documentIds: ["document-1"] }, "prepareNativeBranchForm"],
    [{ tabId: 42, documentIds: ["document-1"] }, "verifyPreparedNativeBranchForm"],
  ]);
  assert.equal(calls.filter(([, , func]) => func === "openNativeBranchDialog").length, 1);
  assert.ok(states.includes("NAVIGATION_PENDING"));
  assert.equal(states.at(-1), "FORM_PREPARED");
  assert.equal(JSON.stringify(calls).includes("secret"), false);
});

test("permission denial, revocation and unsafe tabs stop before interaction", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  for (const [name, changes, grant, expected] of [
    ["denied", {}, false, "PERMISSION_DENIED"],
    ["revoked", { permission: false }, true, "PERMISSION_MISSING"],
    ["wrong repository", { tab: { ...complete, url: "https://github.com/other/repo/branches" } }, true, "UNSUPPORTED_PAGE"],
    ["login redirect", { tab: { ...complete, url: "https://github.com/login" } }, true, "UNSUPPORTED_PAGE"],
    ["incognito", { tab: { ...complete, incognito: true } }, true, "UNSUPPORTED_PAGE"],
    ["closed", { tab: null }, true, "UNSUPPORTED_PAGE"],
  ]) {
    const { api, calls } = fixture(changes);
    assert.equal(await prepareWorkspaceBranch({ api, review, permissionRequest: Promise.resolve(grant),
      fresh: () => true, onState: () => {}, timeoutMs: 20 }), expected, name);
    assert.equal(calls.filter(([type]) => type === "script").length, 0, name);
  }
});

test("changed document, wrong frame and stale operation never report prepared", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  for (const [name, changes, expected] of [
    ["missing document", { documentId: undefined }, "UNSUPPORTED_PAGE"],
    ["wrong frame", { scriptResult: () => [{ frameId: 1, documentId: "document-1", result: true }] }, "UNSUPPORTED_PAGE"],
    ["changed document", { scriptResult: options => [{ frameId: 0, documentId:
      options.func.name === "inspectWorkspaceBranchPage" ? "document-1" : "document-2", result: true }] }, "UNSUPPORTED_PAGE"],
    ["stale", { fresh: false }, "STALE_PLAN"],
  ]) {
    const { api } = fixture(changes);
    assert.equal(await prepareWorkspaceBranch({ api, review, permissionRequest: Promise.resolve(true),
      fresh: () => changes.fresh !== false, onState: () => {}, timeoutMs: 20 }), expected, name);
  }
});

test("delayed tab completion and dialog observation stay bounded", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  const fixtureState = fixture({ tab: { ...complete, status: "loading" }, scriptResult: options => {
    if (options.func.name === "waitForNativeBranchDialog") return new Promise(resolve => {
      setImmediate(() => resolve([{ frameId: 0, documentId: "document-1", result: true }]));
    });
    return [{ frameId: 0, documentId: "document-1", result:
      ["inspectWorkspaceBranchPage", "verifyPreparedNativeBranchForm"].includes(options.func.name) ? true :
        options.func.name === "openNativeBranchDialog" ? "DIALOG_OPENED" : "FORM_PREPARED" }];
  } });
  const run = prepareWorkspaceBranch({ api: fixtureState.api, review, permissionRequest: Promise.resolve(true),
    fresh: () => true, onState: () => {}, timeoutMs: 100 });
  setImmediate(() => {
    fixtureState.state.tab = complete;
    for (const listener of fixtureState.listeners) listener(42, { status: "complete" }, complete);
  });
  assert.equal(await run, "FORM_PREPARED");
  assert.equal(fixtureState.listeners.size, 0);
  assert.equal(fixtureState.removed.size, 0);
  const timeout = fixture({ tab: { ...complete, status: "loading" } });
  assert.equal(await prepareWorkspaceBranch({ api: timeout.api, review, permissionRequest: Promise.resolve(true),
    fresh: () => true, onState: () => {}, timeoutMs: 5 }), "NAVIGATION_TIMEOUT");
});

test("missing opener, absent dialog, source mismatch and nonempty input never report prepared", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  for (const [name, func, result, expected] of [
    ["missing opener", "openNativeBranchDialog", "UNSUPPORTED_UI", "UNSUPPORTED_UI"],
    ["missing dialog", "waitForNativeBranchDialog", false, "DIALOG_TIMEOUT"],
    ["source mismatch", "prepareNativeBranchForm", "MANUAL_ACTION_REQUIRED", "PREPARATION_UNCERTAIN"],
    ["nonempty input", "prepareNativeBranchForm", "MANUAL_ACTION_REQUIRED", "PREPARATION_UNCERTAIN"],
  ]) {
    const { api } = fixture({ scriptResult: options => [{ frameId: 0, documentId: "document-1",
      result: options.func.name === func ? result : options.func.name === "inspectWorkspaceBranchPage" ? true :
        options.func.name === "waitForNativeBranchDialog" ? true :
          options.func.name === "openNativeBranchDialog" ? "DIALOG_OPENED" : "FORM_PREPARED" }] });
    assert.equal(await prepareWorkspaceBranch({ api, review, permissionRequest: Promise.resolve(true),
      fresh: () => true, onState: () => {}, timeoutMs: 100 }), expected, name);
  }
});

test("revocation and stale results after the opener stop before form preparation", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  for (const [name, invalidation, expected] of [
    ["revoked", state => { state.permission = false; }, "PERMISSION_MISSING"],
    ["stale", state => { state.fresh = false; }, "STALE_PLAN"],
  ]) {
    const fixtureState = fixture();
    fixtureState.state.scriptResult = options => {
      if (options.func.name === "openNativeBranchDialog") invalidation(fixtureState.state);
      return [{ frameId: 0, documentId: "document-1", result:
        options.func.name === "inspectWorkspaceBranchPage" ? true : "DIALOG_OPENED" }];
    };
    assert.equal(await prepareWorkspaceBranch({ api: fixtureState.api, review,
      permissionRequest: Promise.resolve(true), fresh: () => fixtureState.state.fresh,
      onState: () => {}, timeoutMs: 100 }), expected, name);
    assert.equal(fixtureState.calls.some(([, , func]) => func === "prepareNativeBranchForm"), false);
  }
});

test("document replacement after input dispatch blocks FORM_PREPARED", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  let prepared = false;
  const { api } = fixture({ scriptResult: options => {
    if (options.func.name === "prepareNativeBranchForm") prepared = true;
    return [{ frameId: 0, documentId: prepared && options.func.name === "verifyPreparedNativeBranchForm" ?
      "replacement-document" : "document-1", result: options.func.name === "openNativeBranchDialog" ?
        "DIALOG_OPENED" : options.func.name === "prepareNativeBranchForm" ? "FORM_PREPARED" : true }];
  } });
  assert.equal(await prepareWorkspaceBranch({ api, review, permissionRequest: Promise.resolve(true),
    fresh: () => true, onState: () => {}, timeoutMs: 100 }), "UNSUPPORTED_PAGE");
});

test("unresolved navigation request reaches an explicit timeout", { timeout: 200 }, async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  const { api } = fixture();
  api.tabs.create = () => new Promise(() => {});
  assert.equal(await prepareWorkspaceBranch({ api, review, permissionRequest: Promise.resolve(true),
    fresh: () => true, onState: () => {}, timeoutMs: 5 }), "NAVIGATION_TIMEOUT");
});

test("B01 stale completion of the initial permission check cannot navigate", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  const { api, calls, state } = fixture();
  let release, reached;
  const entered = new Promise(resolve => { reached = resolve; });
  api.permissions.contains = () => { reached(); return new Promise(resolve => { release = resolve; }); };
  const run = prepareWorkspaceBranch({ api, review, permissionRequest: Promise.resolve(true),
    fresh: () => state.fresh, onState: () => {}, timeoutMs: 30 });
  await entered;
  state.fresh = false;
  release(true);
  assert.equal(await run, "STALE_PLAN");
  assert.equal(calls.filter(([kind]) => kind === "create").length, 0);
});

test("B02 expired discovery cannot dispatch the opener", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  const { api, calls } = fixture();
  const now = Date.now;
  let clock = 1000;
  Date.now = () => clock;
  try {
    api.scripting.executeScript = async options => {
      calls.push(["script", options.target, options.func.name]);
      if (options.func.name === "inspectWorkspaceBranchPage") clock = 1040;
      return [{ frameId: 0, documentId: "document-1", result: true }];
    };
    assert.equal(await prepareWorkspaceBranch({ api, review, permissionRequest: Promise.resolve(true),
      fresh: () => true, onState: () => {}, timeoutMs: 30 }), "NAVIGATION_TIMEOUT");
    assert.equal(calls.some(([, , func]) => func === "openNativeBranchDialog"), false);
  } finally { Date.now = now; }
});

test("B02 expired dialog observation cannot dispatch form preparation", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  const { api, calls } = fixture();
  const now = Date.now;
  let clock = 1000;
  Date.now = () => clock;
  try {
    api.scripting.executeScript = async options => {
      calls.push(["script", options.target, options.func.name]);
      if (options.func.name === "waitForNativeBranchDialog") clock = 1040;
      return [{ frameId: 0, documentId: "document-1", result:
        options.func.name === "openNativeBranchDialog" ? "DIALOG_OPENED" : true }];
    };
    assert.equal(await prepareWorkspaceBranch({ api, review, permissionRequest: Promise.resolve(true),
      fresh: () => true, onState: () => {}, timeoutMs: 30 }), "DIALOG_TIMEOUT");
    assert.equal(calls.some(([, , func]) => func === "prepareNativeBranchForm"), false);
  } finally { Date.now = now; }
});

test("B03 unresolved discovery times out and ignores late completion", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  const { api, calls } = fixture();
  let release;
  api.scripting.executeScript = options => {
    calls.push(["script", options.target, options.func.name]);
    if (options.func.name === "inspectWorkspaceBranchPage")
      return new Promise(resolve => { release = resolve; });
    return Promise.resolve([{ frameId: 0, documentId: "document-1", result: true }]);
  };
  const states = [];
  const watchdog = new Promise(resolve => setTimeout(() => resolve("WATCHDOG"), 120));
  const result = await Promise.race([prepareWorkspaceBranch({ api, review,
    permissionRequest: Promise.resolve(true), fresh: () => true, onState: state => states.push(state), timeoutMs: 30 }), watchdog]);
  assert.equal(result, "NAVIGATION_TIMEOUT");
  release([{ frameId: 0, documentId: "document-1", result: true }]);
  await Promise.resolve();
  assert.equal(calls.some(([, , func]) => func === "openNativeBranchDialog"), false);
  assert.equal(states.at(-1), "NAVIGATION_TIMEOUT");
});

test("B04 final verifier rejection cannot report FORM_PREPARED", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  const { api, calls } = fixture();
  api.scripting.executeScript = async options => {
    calls.push(["script", options.target, options.func.name]);
    return [{ frameId: 0, documentId: "document-1", result:
      options.func.name === "openNativeBranchDialog" ? "DIALOG_OPENED" :
        options.func.name === "prepareNativeBranchForm" ? "FORM_PREPARED" :
          options.func.name === "verifyPreparedNativeBranchForm" ? false : true }];
  };
  assert.equal(await prepareWorkspaceBranch({ api, review, permissionRequest: Promise.resolve(true),
    fresh: () => true, onState: () => {}, timeoutMs: 100 }), "PREPARATION_UNCERTAIN");
  assert.equal(calls.some(([, , func]) => func === "verifyPreparedNativeBranchForm"), true);
});

test("B03 all browser API waits are bounded without later interactions", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  const never = () => new Promise(() => {});
  for (const [name, stall, expected, forbidden] of [
    ["initial permission availability", "permission", "NAVIGATION_TIMEOUT", "create"],
    ["tab readiness metadata", "readiness", "NAVIGATION_TIMEOUT", "script"],
    ["pre-opener metadata", "metadata", "NAVIGATION_TIMEOUT", "openNativeBranchDialog"],
    ["opener injection", "openNativeBranchDialog", "PREPARATION_UNCERTAIN", "waitForNativeBranchDialog"],
    ["dialog observation", "waitForNativeBranchDialog", "DIALOG_TIMEOUT", "prepareNativeBranchForm"],
    ["form preparation", "prepareNativeBranchForm", "PREPARATION_UNCERTAIN", "verifyPreparedNativeBranchForm"],
    ["final form verification", "verifyPreparedNativeBranchForm", "PREPARATION_UNCERTAIN", "FORM_PREPARED"],
  ]) {
    const { api, calls } = fixture();
    if (stall === "permission") api.permissions.contains = never;
    if (stall === "readiness") api.tabs.get = () => { calls.push(["get", 42]); return never(); };
    if (stall === "metadata") {
      let count = 0;
      api.tabs.get = id => { calls.push(["get", id]); return ++count === 1 ? Promise.resolve(complete) : never(); };
    }
    if (!["permission", "readiness", "metadata"].includes(stall)) {
      api.scripting.executeScript = options => {
        calls.push(["script", options.target, options.func.name]);
        if (options.func.name === stall) return never();
        return Promise.resolve([{ frameId: 0, documentId: "document-1", result:
          options.func.name === "openNativeBranchDialog" ? "DIALOG_OPENED" :
            options.func.name === "prepareNativeBranchForm" ? "FORM_PREPARED" : true }]);
      };
    }
    let watchdogTimer;
    const watchdog = new Promise(resolve => { watchdogTimer = setTimeout(() => resolve("WATCHDOG"), 120); });
    const states = [];
    const result = await Promise.race([prepareWorkspaceBranch({ api, review, permissionRequest: Promise.resolve(true),
      fresh: () => true, onState: state => states.push(state), timeoutMs: 20 }), watchdog]);
    clearTimeout(watchdogTimer);
    assert.equal(result, expected, name);
    assert.equal(calls.some(([kind, , value]) => kind === "script" && value === forbidden ||
      kind === forbidden), false, name);
    assert.equal(states.includes("FORM_PREPARED"), false, name);
  }
});

test("B02 deadline immediately before opener or form dispatch reports no dispatched interaction", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  const now = Date.now;
  try {
    for (const [expireOn, expected, forbidden] of [
      ["OPENING_DIALOG", "NAVIGATION_TIMEOUT", "openNativeBranchDialog"],
      ["PREPARING_FORM", "DIALOG_TIMEOUT", "prepareNativeBranchForm"],
    ]) {
      let clock = 1000;
      Date.now = () => clock;
      const { api, calls } = fixture();
      const result = await prepareWorkspaceBranch({ api, review, permissionRequest: Promise.resolve(true),
        fresh: () => true, onState: state => { if (state === expireOn) clock = 1040; }, timeoutMs: 30 });
      assert.equal(result, expected, expireOn);
      assert.equal(calls.some(([, , func]) => func === forbidden), false, expireOn);
    }
  } finally { Date.now = now; }
});

test("live readiness: pending exact URL progresses to complete without a completion event", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  const f = fixture({ tab: { ...complete, status: "loading", url: undefined, pendingUrl: review.destination } });
  f.api.tabs.create = async options => { f.calls.push(["create", options]); return { ...f.state.tab }; };
  let reads = 0;
  f.api.tabs.get = async id => {
    f.calls.push(["get", id]);
    if (++reads === 1) return f.state.tab;
    if (reads === 2) return { ...complete, status: "loading" };
    return complete;
  };
  assert.equal(await prepareWorkspaceBranch({ api: f.api, review, permissionRequest: Promise.resolve(true),
    fresh: () => true, onState: () => {}, timeoutMs: 2000 }), "FORM_PREPARED");
  assert.equal(f.calls.filter(([kind]) => kind === "create").length, 1);
  assert.equal(f.calls.filter(([, , name]) => name === "openNativeBranchDialog").length, 1);
  assert.equal(f.calls.filter(([, , name]) => name === "prepareNativeBranchForm").length, 1);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.removed.size, 0);
});

test("live readiness: polling observes a redirected target and refuses injection", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  const f = fixture({ tab: { ...complete, status: "loading", url: undefined, pendingUrl: review.destination } });
  let reads = 0;
  f.api.tabs.get = async id => {
    f.calls.push(["get", id]);
    return ++reads === 1 ? f.state.tab : { ...complete, url: "https://github.com/login" };
  };
  assert.equal(await prepareWorkspaceBranch({ api: f.api, review, permissionRequest: Promise.resolve(true),
    fresh: () => true, onState: () => {}, timeoutMs: 1500 }), "UNSUPPORTED_PAGE");
  assert.equal(f.calls.some(([kind]) => kind === "script"), false);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.removed.size, 0);
});

test("live readiness: stale operation stops polling before script dispatch", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  const f = fixture({ tab: { ...complete, status: "loading" } });
  const run = prepareWorkspaceBranch({ api: f.api, review, permissionRequest: Promise.resolve(true),
    fresh: () => f.state.fresh, onState: () => {}, timeoutMs: 1500 });
  setImmediate(() => { f.state.fresh = false; });
  assert.equal(await run, "STALE_PLAN");
  assert.equal(f.calls.some(([kind]) => kind === "script"), false);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.removed.size, 0);
});

test("live readiness: event burst does not overlap tab reads or dispatch after timeout", async () => {
  const { prepareWorkspaceBranch } = await import("../src/popup/workspace-branch-preparation.mjs");
  const f = fixture();
  let reads = 0, release, reached;
  const entered = new Promise(resolve => { reached = resolve; });
  f.api.tabs.get = () => { reads++; reached(); return new Promise(resolve => { release = resolve; }); };
  const run = prepareWorkspaceBranch({ api: f.api, review, permissionRequest: Promise.resolve(true),
    fresh: () => true, onState: () => {}, timeoutMs: 100 });
  await entered;
  for (let i = 0; i < 5; i++) for (const listener of f.listeners) listener(42);
  assert.equal(reads, 1);
  assert.equal(await run, "NAVIGATION_TIMEOUT");
  release(complete);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(reads, 1);
  assert.equal(f.calls.some(([kind]) => kind === "script"), false);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.removed.size, 0);
});
