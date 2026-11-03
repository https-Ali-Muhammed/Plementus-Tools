import test from "node:test";
import assert from "node:assert/strict";
import { createSelectionInvalidation } from "../src/browser/selection-invalidation.mjs";

const roles = ["plementus", "github", "odoo-sh"];
const config = () => ({ expectedOrigins: { plementus: "https://plementus.example",
  github: "https://github.com", "odoo-sh": "https://odoo-sh.example" }, lifecycleCoverage: true });
const metadata = (role = "plementus", changes = {}) => ({ tabId: roles.indexOf(role) + 1,
  windowId: 1, frameId: 0, documentId: `opaque-${role}`, origin: config().expectedOrigins[role],
  url: `${config().expectedOrigins[role]}/fixture`, permission: "granted", status: "complete",
  documentLifecycle: "active", pendingNavigation: false, discarded: false, incognito: false,
  pageKind: "supported", privacySafe: true, ...changes });
const send = (machine, type, fields = {}, context = machine.snapshot().context) =>
  machine.dispatch({ type, context, ...fields });
const invariant = result => {
  assert.equal(result.accountVerified, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.evidenceTier, "OFFLINE_SIMULATED");
  return result;
};
const invoke = (m, role, changes = {}) => send(m, "invoke", { source: "SIMULATED", candidate: metadata(role, changes) });
const assign = (m, role) => send(m, "assign", { role, targetConfirmed: true });
const begin = (m, role, changes = {}) => send(m, "beginObservation", { role, before: metadata(role, changes) });
const complete = (m, role, request, changes = {}) => send(m, "completeObservation", {
  request, after: metadata(role, changes), readSucceeded: true });
const bind = (m, role) => {
  assert.equal(invariant(invoke(m, role)).accepted, true);
  assert.equal(assign(m, role).roles[role], "CONTEXT_UNVERIFIED");
  const started = begin(m, role);
  assert.equal(started.accepted, true);
  assert.ok(started.request);
  const result = invariant(complete(m, role, started.request));
  assert.equal(result.roles[role], "CONTEXT_VERIFIED_READ_ONLY");
  return result;
};
const ready = () => {
  const m = createSelectionInvalidation(config());
  roles.forEach(role => bind(m, role));
  assert.equal(m.snapshot().aggregateReadOnly, true);
  return m;
};
const states = (m, state) => assert.deepEqual(m.snapshot().roles,
  { plementus: state, github: state, "odoo-sh": state });

test("three fresh explicit unique roles yield only a synthetic read-only verdict", () => {
  const m = ready();
  invariant(m.snapshot());
  assert.equal(m.snapshot().captureState, "UNBOUND");
});

test("origins never assign a role and missing selections cannot yield aggregate readiness", () => {
  const m = createSelectionInvalidation(config());
  invariant(m.snapshot()); states(m, "UNBOUND");
  const observed = invoke(m, "github");
  assert.equal(observed.captureState, "INVOCATION_OBSERVED"); states(m, "UNBOUND");
  assert.equal(begin(m, "github").accepted, false);
  assert.equal(m.snapshot().aggregateReadOnly, false);
  send(m, "cancel");
  bind(m, "github"); bind(m, "odoo-sh");
  assert.equal(m.snapshot().aggregateReadOnly, false);
});

test("replacing an unassigned capture consumes the former capture without auto-assignment", () => {
  const m = createSelectionInvalidation(config());
  invoke(m, "plementus"); invoke(m, "github");
  assert.equal(assign(m, "plementus").accepted, false);
  assert.equal(m.snapshot().aggregateReadOnly, false);
});

test("assignment consumes a capture once and requires explicit target confirmation", () => {
  for (const targetConfirmed of [false, undefined, "true"]) {
    const m = createSelectionInvalidation(config()); invoke(m, "github");
    assert.equal(send(m, "assign", { role: "github", targetConfirmed }).accepted, false);
    assert.equal(m.snapshot().roles.github, "UNBOUND");
  }
  const m = createSelectionInvalidation(config()); invoke(m, "github"); assign(m, "github");
  assert.equal(assign(m, "odoo-sh").accepted, false);
  assert.equal(m.snapshot().roles["odoo-sh"], "UNBOUND");
});

test("duplicate roles or tab IDs invalidate all occupied selections rather than overwrite", () => {
  for (const duplicate of ["role", "tab"]) {
    const m = createSelectionInvalidation(config()); bind(m, "plementus");
    invoke(m, duplicate === "role" ? "plementus" : "github", duplicate === "tab" ? { tabId: 1 } : {});
    assert.equal(assign(m, duplicate === "role" ? "plementus" : "github").accepted, false);
    assert.equal(m.snapshot().roles.plementus, "STALE_OR_UNCERTAIN");
    assert.equal(m.snapshot().aggregateReadOnly, false);
  }
});

test("normal roles may use different windows but each chosen window remains bound", () => {
  const m = createSelectionInvalidation(config());
  invoke(m, "github", { windowId: 2 }); assign(m, "github");
  const request = begin(m, "github", { windowId: 2 }).request;
  assert.equal(complete(m, "github", request, { windowId: 2 }).roles.github, "CONTEXT_VERIFIED_READ_ONLY");
});

test("a fresh recheck withdraws the aggregate verdict before any new result", () => {
  const m = ready(); const start = begin(m, "github");
  assert.equal(start.aggregateReadOnly, false);
  assert.equal(start.roles.github, "CONTEXT_UNVERIFIED");
  assert.equal(complete(m, "github", start.request).aggregateReadOnly, true);
});

for (const reason of ["navigation", "reload", "history", "fragment", "cross_origin", "permission_lost",
  "tab_closed", "tab_replaced", "window_changed", "document_mismatch", "target_ambiguous", "observation_gap", "timeout"]) {
  test(`${reason} globally invalidates all occupied roles and requires fresh invocations`, () => {
    const m = ready(); const start = begin(m, "github"); const old = m.snapshot().context;
    const result = invariant(send(m, "uncertain", { tabId: 2, reason }));
    states(m, "STALE_OR_UNCERTAIN");
    assert.equal(result.context.contextGeneration, old.contextGeneration + 1);
    assert.equal(result.aggregateReadOnly, false);
    assert.equal(complete(m, "github", start.request).accepted, false);
    assert.equal(invoke(m, "github").accepted, false);
    send(m, "reselect"); states(m, "RESELECTION_REQUIRED");
    assert.equal(begin(m, "github").accepted, false);
    assert.equal(assign(m, "github").accepted, false);
    roles.forEach(role => bind(m, role));
    assert.equal(m.snapshot().aggregateReadOnly, true);
  });
}

test("unselected duplicate-origin events neither replace nor invalidate an explicit binding", () => {
  const m = ready();
  const before = m.snapshot();
  assert.equal(send(m, "uncertain", { tabId: 99, reason: "navigation" }).accepted, false);
  assert.deepEqual(m.snapshot(), before);
});

test("missing required metadata never passes capture, pre-read or post-read checks", () => {
  for (const key of Object.keys(metadata())) {
    for (const boundary of ["invoke", "before", "after"]) {
      const m = createSelectionInvalidation(config());
      const incomplete = metadata(); delete incomplete[key];
      let result;
      if (boundary === "invoke") result = send(m, "invoke", { source: "SIMULATED", candidate: incomplete });
      else {
        invoke(m, "plementus"); assign(m, "plementus");
        if (boundary === "before") result = send(m, "beginObservation", { role: "plementus", before: incomplete });
        else result = send(m, "completeObservation", { request: begin(m, "plementus").request,
          after: incomplete, readSucceeded: true });
      }
      assert.equal(invariant(result).accepted, false, `${boundary}:${key}`);
      assert.equal(result.aggregateReadOnly, false);
      assert.notEqual(result.roles.plementus, "CONTEXT_VERIFIED_READ_ONLY");
    }
  }
});

test("URL drift at completion and identity drift at either observation boundary fail closed", () => {
  for (const change of [{ url: "https://plementus.example/other" },
    { url: "https://plementus.example/fixture?q=changed" }, { url: "https://plementus.example/fixture#changed" },
    { documentId: "new-opaque-document" }, { tabId: 44 }, { windowId: 2 },
    { origin: "https://wrong.example", url: "https://wrong.example/fixture" }]) {
    const m = createSelectionInvalidation(config()); invoke(m, "plementus"); assign(m, "plementus");
    const start = begin(m, "plementus");
    assert.equal(complete(m, "plementus", start.request, change).accepted, false);
    assert.equal(m.snapshot().roles.plementus, "STALE_OR_UNCERTAIN");
  }
  for (const change of [{ documentId: "new-doc" }, { windowId: 2 }, { tabId: 44 },
    { origin: "https://github.com", url: "https://github.com/fixture" }]) {
    const m = createSelectionInvalidation(config()); invoke(m, "plementus"); assign(m, "plementus");
    assert.equal(begin(m, "plementus", change).accepted, false);
  }
});

test("unsupported or denied context offers only manual fallback", () => {
  for (const change of [{ permission: "denied" }, { permission: "unknown" }, { frameId: 1 },
    { incognito: true }, { documentLifecycle: "cached" }, { documentLifecycle: "prerender" },
    { status: "loading" }, { pendingNavigation: true }, { discarded: true },
    { pageKind: "unknown" }, { privacySafe: false }, { url: "chrome://settings/", origin: "null" }]) {
    const m = createSelectionInvalidation(config());
    assert.equal(invoke(m, "github", change).accepted, false);
    states(m, "MANUAL_FALLBACK");
    assert.equal(m.snapshot().aggregateReadOnly, false);
  }
  const m = ready();
  send(m, "manual"); states(m, "MANUAL_FALLBACK");
  assert.equal(invoke(m, "github").accepted, false);
  send(m, "newReview"); states(m, "UNBOUND");
});

test("origin configuration is explicit, distinct, HTTPS and fixture-restricted", () => {
  for (const change of [c => { delete c.expectedOrigins; }, c => { delete c.expectedOrigins.github; },
    c => { c.expectedOrigins.plementus = "https://real.invalid"; },
    c => { c.expectedOrigins.github = "https://github.com.lookalike.example"; },
    c => { c.expectedOrigins.plementus = "http://plementus.example"; },
    c => { c.expectedOrigins.plementus = "https://plementus.example/"; },
    c => { c.expectedOrigins["odoo-sh"] = c.expectedOrigins.plementus; },
    c => { c.lifecycleCoverage = false; }, c => { c.restore = {}; }]) {
    const c = config(); change(c);
    const m = createSelectionInvalidation(c); states(m, "MANUAL_FALLBACK");
    invariant(m.snapshot());
    assert.equal(invoke(m, "github").accepted, false);
  }
});

test("bad scalar values and URL normalization cannot masquerade as eligible metadata", () => {
  for (const change of [{ tabId: 0 }, { tabId: "1" }, { tabId: NaN }, { tabId: Infinity },
    { windowId: -1 }, { windowId: 1.5 }, { frameId: "0" }, { documentId: "" },
    { documentId: {} }, { documentId: "x".repeat(129) }, { pendingNavigation: "false" },
    { url: "https://@plementus.example/fixture" }, { url: " https://plementus.example/fixture" },
    { url: "https://PLEMENTUS.example/fixture" }, { url: "https://plementus.example/a/../fixture" },
    { url: "https://user:secret@plementus.example/fixture" },
    { url: "https://plementus.example/" + "x".repeat(2048) }, { origin: { toString() { assert.fail(); } } }]) {
    const m = createSelectionInvalidation(config());
    assert.equal(invariant(invoke(m, "plementus", change)).accepted, false);
  }
});

test("stale, duplicate, unsolicited and cloned request tokens cannot verify a context", () => {
  const m = ready(); const start = begin(m, "github");
  assert.equal(complete(m, "github", structuredClone(start.request)).accepted, false);
  assert.equal(complete(m, "github", {}).accepted, false);
  assert.equal(m.snapshot().aggregateReadOnly, false);
  assert.equal(complete(m, "github", start.request).aggregateReadOnly, true);
  assert.equal(complete(m, "github", start.request).accepted, false);
  assert.equal(m.snapshot().aggregateReadOnly, true);
});

test("concurrent role requests are individually consumed and never relabeled", () => {
  const m = ready(); const a = begin(m, "plementus"); const b = begin(m, "github");
  assert.equal(complete(m, "github", a.request).accepted, false);
  assert.equal(complete(m, "github", b.request).accepted, false);
  assert.equal(m.snapshot().aggregateReadOnly, false);
});

test("a second pending request cannot retry or overwrite the first request", () => {
  const m = ready(); const request = begin(m, "github").request;
  assert.equal(begin(m, "github").accepted, false);
  assert.equal(complete(m, "github", request).aggregateReadOnly, true);
});

test("selected permission loss and failed reads discard every pending role request", () => {
  for (const failure of ["permission", "read"]) {
    const m = ready(); const a = begin(m, "plementus"); const b = begin(m, "github");
    const result = send(m, "completeObservation", { request: a.request,
      after: metadata("plementus", failure === "permission" ? { permission: "denied" } : {}),
      readSucceeded: failure !== "read" });
    assert.equal(result.accepted, false); states(m, "STALE_OR_UNCERTAIN");
    assert.equal(complete(m, "github", b.request).accepted, false);
  }
});

for (const type of ["cancel", "reviewLost", "reviewRestart", "workerRestart", "browserRestart"]) {
  test(`${type} clears all bindings and rejects old generations despite surviving synthetic grants`, () => {
    const m = ready(); const start = begin(m, "github"); const old = start.context;
    assert.equal(send(m, type).accepted, true); states(m, "UNBOUND");
    assert.notEqual(m.snapshot().context, old);
    assert.equal(complete(m, "github", start.request).accepted, false);
    assert.equal(send(m, "invoke", { source: "SIMULATED", candidate: metadata("github") }, old).accepted, false);
    assert.equal(begin(m, "github").accepted, false);
    assert.equal(m.snapshot().aggregateReadOnly, false);
    if (type.includes("Restart") && type !== "reviewRestart") {
      assert.equal(m.snapshot().context.workerGeneration, old.workerGeneration + 1);
    }
    roles.forEach(role => bind(m, role));
    assert.equal(m.snapshot().aggregateReadOnly, true);
  });
}

test("a fresh instance cannot accept another instance's context or pending observations", () => {
  const old = ready(); const pending = begin(old, "github");
  const fresh = createSelectionInvalidation(config());
  assert.equal(send(fresh, "invoke", { source: "SIMULATED", candidate: metadata("github") }, pending.context).accepted, false);
  assert.equal(complete(fresh, "github", pending.request).accepted, false); states(fresh, "UNBOUND");
});

test("manual fallback and cancellation consume requests and require a new review", () => {
  const m = ready(); const old = begin(m, "github");
  send(m, "manual"); states(m, "MANUAL_FALLBACK");
  assert.equal(complete(m, "github", old.request).accepted, false);
  assert.equal(send(m, "newReview").accepted, true); states(m, "UNBOUND");
  assert.equal(assign(m, "github").accepted, false);
  send(m, "manual"); send(m, "cancel"); states(m, "UNBOUND");
});

test("no caller-requested state, approval, write, retry, replay or grant restoration is executable", () => {
  for (const type of ["approve", "write", "execute", "retry", "replay", "restoreGrant", "transition",
    "CONTEXT_VERIFIED_READ_ONLY", "resume", "newReview", "reselect"]) {
    const m = createSelectionInvalidation(config());
    assert.equal(invariant(send(m, type)).accepted, false);
    states(m, "UNBOUND");
  }
  const m = createSelectionInvalidation(config());
  for (const source of ["CHROME", "LOCAL_BROWSER_TESTED", undefined, true]) {
    assert.equal(send(m, "invoke", { source, candidate: metadata() }).accepted, false);
  }
});

test("extra fields, getters, symbols, exotic objects and reflection errors fail generically", () => {
  let getters = 0;
  for (const build of [() => null, () => [], () => new Date(), () => Object.create(null),
    () => ({ type: "cancel", get context() { getters++; return {}; } }),
    () => new Proxy({}, { getPrototypeOf() { throw new Error("SECRET_CANARY"); } })]) {
    const m = ready(); const result = invariant(m.dispatch(build()));
    assert.equal(result.accepted, false);
    assert.equal(result.aggregateReadOnly, false);
    assert.ok(!JSON.stringify(result).includes("SECRET_CANARY"));
  }
  const m = ready();
  for (const key of ["approve", Symbol("secret")]) {
    assert.equal(send(m, "cancel", { [key]: true }).accepted, false);
  }
  assert.equal(getters, 0);
});

test("nested getters are never executed and input mutation cannot rewrite pending context", () => {
  const m = createSelectionInvalidation(config()); let getters = 0;
  const candidate = metadata();
  Object.defineProperty(candidate, "url", { enumerable: true, get() { getters++; return "SECRET_CANARY"; } });
  assert.equal(send(m, "invoke", { source: "SIMULATED", candidate }).accepted, false);
  assert.equal(getters, 0);
  const n = createSelectionInvalidation(config());
  const input = metadata(); send(n, "invoke", { source: "SIMULATED", candidate: input });
  input.tabId = 99; input.documentId = "changed";
  assign(n, "plementus");
  const before = metadata(); const request = send(n, "beginObservation", { role: "plementus", before }).request;
  before.url = "https://plementus.example/changed";
  assert.equal(complete(n, "plementus", request).roles.plementus, "CONTEXT_VERIFIED_READ_ONLY");
});

test("reentrant proxy dispatch invalidates before outer observation can commit", () => {
  for (const nestedType of ["cancel", "manual", "workerRestart", "completeObservation"]) {
    const m = ready(); const start = begin(m, "github"); let nested;
    const after = new Proxy(metadata("github"), { ownKeys(target) {
      nested = send(m, nestedType, nestedType === "completeObservation"
        ? { request: start.request, after: metadata("github"), readSucceeded: true } : {});
      return Reflect.ownKeys(target);
    } });
    const result = send(m, "completeObservation", { request: start.request, after, readSucceeded: true });
    assert.equal(result.accepted, false); assert.equal(nested.accepted, false);
    assert.equal(result.aggregateReadOnly, false); states(m, "STALE_OR_UNCERTAIN");
  }
});

test("snapshots and tokens are frozen, sanitized copies that cannot mutate internal state", () => {
  const m = ready(); const start = begin(m, "github");
  for (const value of [m, start, start.roles, start.context, start.request]) assert.ok(Object.isFrozen(value));
  assert.throws(() => { start.roles.github = "CONTEXT_VERIFIED_READ_ONLY"; }, TypeError);
  assert.throws(() => { start.context.contextGeneration = 0; }, TypeError);
  assert.throws(() => { start.request.requestSequence = 0; }, TypeError);
  assert.equal(m.snapshot().aggregateReadOnly, false);
  const output = JSON.stringify(start);
  for (const forbidden of ["https:", "opaque-", "tabId", "windowId", "url", "documentId", "customer"]) {
    assert.ok(!output.includes(forbidden));
  }
  assert.equal(complete(m, "github", start.request).aggregateReadOnly, true);
});

test("a new capture of an already selected tab invalidates before reassignment", () => {
  for (const change of [{}, { documentId: "reloaded" }, { windowId: 2 }]) {
    const m = ready();
    assert.equal(invoke(m, "github", change).accepted, false);
    states(m, "STALE_OR_UNCERTAIN");
    assert.equal(invoke(m, "plementus").accepted, false);
    assert.equal(m.snapshot().aggregateReadOnly, false);
  }
});

test("uncertainty in an unassigned capture is visible and requires fresh invocation", () => {
  const m = createSelectionInvalidation(config()); invoke(m, "github");
  send(m, "uncertain", { tabId: 2, reason: "navigation" });
  assert.equal(m.snapshot().captureState, "STALE_OR_UNCERTAIN");
  assert.equal(assign(m, "github").accepted, false);
  send(m, "reselect");
  assert.equal(m.snapshot().captureState, "RESELECTION_REQUIRED");
  assert.equal(assign(m, "github").accepted, false);
  bind(m, "github");
});

test("known lifecycle coverage loss cannot be restored by a new review or a surviving grant", () => {
  const m = ready(); const pending = begin(m, "github");
  send(m, "coverageLost"); states(m, "MANUAL_FALLBACK");
  assert.equal(send(m, "newReview").accepted, false);
  assert.equal(complete(m, "github", pending.request).accepted, false);
  send(m, "workerRestart"); states(m, "MANUAL_FALLBACK");
  assert.equal(invoke(m, "github").accepted, false);
});

test("configuration and frozen input records cannot rewrite chosen origins or context", () => {
  const c = config(); const m = createSelectionInvalidation(c);
  c.expectedOrigins.github = "https://lookalike.example"; c.lifecycleCoverage = false;
  const candidate = Object.freeze(metadata("github"));
  assert.equal(m.dispatch(Object.freeze({ type: "invoke", context: m.snapshot().context,
    source: "SIMULATED", candidate })).accepted, true);
  assign(m, "github");
  const request = begin(m, "github").request;
  assert.equal(complete(m, "github", request).roles.github, "CONTEXT_VERIFIED_READ_ONLY");
});
