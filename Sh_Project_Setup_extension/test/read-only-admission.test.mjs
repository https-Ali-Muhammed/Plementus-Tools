import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createReadOnlyAdmission } from "../src/browser/read-only-admission.mjs";

const limits = () => ({ codeBytes: 32, idBytes: 128, originBytes: 256, urlBytes: 2048,
  intentBytes: 1024, resultBytes: 4096, publicBytes: 512, maxFields: 16,
  maxRecordDepth: 2, maxResultItems: 1, maxRoles: 3, maxCaptures: 1, maxPending: 1,
  captureMs: 60000, observationMs: 5000 });
const roles = ["plementus", "github", "odoo-sh"];
const connection = () => Object.freeze(Object.create(null));
const sender = (n = 1) => ({ reviewId: `review-${n}`, documentId: `review-doc-${n}`, frameId: 0, kind: "mock_review" });
const tab = (role = "plementus", changes = {}) => ({ tabId: 101 + roles.indexOf(role), windowId: 7,
  frameId: 0, documentId: `doc-${["p", "g", "o"][roles.indexOf(role)]}-1`,
  origin: `https://${role}.r1.invalid`, url: `https://${role}.r1.invalid/fixture`, ...changes });
const event = reason => ({ reason, reviewId: reason === "review_lost" ? "review-1" : null,
  documentId: reason === "review_lost" ? "review-doc-1" : null });
const result = (r, changes = {}, envelope = {}) => ({ bootId: r.bootId, reviewId: r.reviewId,
  captureId: r.captureId, requestId: r.requestId, generation: r.generation,
  results: [{ tabId: r.tabId, windowId: r.windowId, frameId: r.frameId, documentId: r.documentId,
    origin: r.origin, url: r.url, pageKind: "supported", capability: "available", ...changes }], ...envelope });
const publicKeys = ["operation", "outcome", "reason", "state", "role", "pageKind", "sequence",
  "plementus", "github", "odooSh", "evidenceTier", "accountVerified", "executionAuthorized",
  "approvalGranted", "trustedContinuingContext"];
function publicRecord(v) {
  assert.deepEqual(Object.keys(v), publicKeys); assert.ok(Object.isFrozen(v));
  assert.ok(Buffer.byteLength(JSON.stringify(v)) <= 512); assert.equal(v.evidenceTier, "SIMULATED");
  for (const key of publicKeys.slice(-4)) assert.equal(v[key], false);
  assert.equal(/boot-|review-|capture-|request-|doc-|https:|fixture|secret/.test(JSON.stringify(v)), false);
  return v;
}
function expect(v, reason, state, outcome) {
  publicRecord(v); assert.equal(v.reason, reason);
  if (state) assert.equal(v.state, state); if (outcome) assert.equal(v.outcome, outcome); return v;
}
function harness(options = {}, factory = createReadOnlyAdmission) {
  const h = { time: 0, tickets: [], reads: 0, timers: [], cleared: [], conn: connection(), request: null };
  h.intent = (operation, role = ["confirm", "observe"].includes(operation) ? "plementus" : null,
    changes = {}) => ({ operation, ...h.ticket, role, ...changes });
  h.boundary = { bootId: "boot-1", now: () => h.time,
    schedule: (delay, callback) => { const handle = { delay, callback }; h.timers.push(handle); return handle; },
    clearTimer: handle => { h.cleared.push(handle); },
    deliverTicket: (conn, ticket) => { h.ticket = ticket; h.tickets.push({ conn, ticket }); },
    read: request => { h.reads++; h.request = request;
      return new Promise((resolve, reject) => { h.resolve = resolve; h.reject = reject; }); } };
  for (const [key, fn] of Object.entries(options)) h.boundary[key] = (...args) => fn(h, ...args);
  h.controller = factory(h.boundary, limits());
  h.attach = () => expect(h.controller.attachReview(sender(), h.conn), "ok", "IDLE", "accepted");
  h.capture = (role = "plementus") => expect(h.controller.captureInvocation(tab(role)), "ok", "CAPTURED");
  h.confirm = (role = "plementus") => expect(h.controller.confirmSelection(h.conn, h.intent("confirm", role)), "ok", "CONFIRMED");
  h.ready = () => { h.attach(); h.capture(); h.confirm(); return h; };
  h.observe = (role = "plementus") => h.controller.observeOnce(h.conn, h.intent("observe", role));
  return h;
}
const flush = async () => { await new Promise(resolve => setImmediate(resolve)); };
// Native Promise resolution checks then; all later payload inspection must remain inert.
const poison = () => new Proxy({}, { get(_target, key) {
  if (key === "then") return undefined;
  assert.fail("late payload inspected");
},
  ownKeys() { assert.fail("late payload reflected"); }, getPrototypeOf() { assert.fail("late payload traversed"); } });
async function remainsClosed(h, p, reason, outcome, late = "fulfill") {
  let settlements = 0; p.then(() => { settlements++; });
  expect(await p, reason, "CLOSED", outcome);
  const before = publicRecord(h.controller.snapshot()), ticketCount = h.tickets.length;
  for (let i = 0; i < 2; i++) {
    expect(h.controller.captureInvocation(tab("github")), "closed", "CLOSED");
    expect(h.controller.attachReview(sender(2), connection()), "closed", "CLOSED");
    expect(h.controller.confirmSelection(h.conn, h.intent("confirm")), "closed", "CLOSED");
    expect(await h.observe(), "closed", "CLOSED");
    expect(h.controller.manual(h.conn, h.intent("manual")), "closed", "CLOSED");
    expect(h.controller.cancel(h.conn, h.intent("cancel")), "closed", "CLOSED");
    expect(h.controller.invalidate(event("worker_restarted")), "closed", "CLOSED");
    if (late === "fulfill") h.resolve?.(poison()); else h.reject?.(poison());
    await flush(); assert.deepEqual(h.controller.snapshot(), before);
    assert.equal(h.tickets.length, ticketCount); assert.equal(h.reads, 1); assert.equal(settlements, 1);
  }
}

test("T1/T4 exact initial state and copied boundary", async () => {
  const h = harness(); expect(h.controller.snapshot(), "ok", "IDLE", "snapshot");
  assert.deepEqual(Object.keys(h.controller), ["captureInvocation", "attachReview", "confirmSelection",
    "observeOnce", "cancel", "manual", "invalidate", "snapshot"]);
  h.boundary.read = () => assert.fail("mutable boundary retained");
  h.ready(); const p = h.observe(); h.resolve(result(h.request)); expect(await p, "ok", "IDLE", "observed");
});
test("T1/T2 private capture and explicit confirmation precede a single read", async () => {
  const h = harness(); expect(h.controller.captureInvocation(poison()), "no_owner"); h.attach();
  expect(await h.observe(), "no_capture"); h.capture(); expect(await h.observe(), "wrong_state");
  assert.equal(h.reads, 0); h.confirm(); const p = h.observe(); assert.equal(h.reads, 1);
  expect(await h.observe(), "busy", "READING"); h.resolve(result(h.request));
  expect(await p, "ok", "IDLE", "observed"); expect(await h.observe(), "correlation_mismatch");
});
const terminations = [
  ["cancel", h => h.controller.cancel(h.conn, h.intent("cancel")), "cancelled", "cancelled"],
  ["manual", h => h.controller.manual(h.conn, h.intent("manual")), "manual_requested", "manual"],
  ...["target_changed", "review_lost", "worker_restarted"].map(reason =>
    [reason, h => h.controller.invalidate(event(reason)), reason, "invalidated"]),
  ["recapture", h => h.controller.captureInvocation(tab("github")), "target_changed", "invalidated"],
  ["replacement", h => h.controller.attachReview(sender(2), connection()), "review_replaced", "invalidated"],
];
for (const [name, terminate, reason, outcome] of terminations) {
  for (const synchronous of [false, true]) for (const late of ["fulfill", "reject"]) {
    test(`T3/T5 ${name}, ${synchronous ? "inside read" : "held read"}, late ${late}`, async () => {
      let action;
      const h = harness({ read(h, request) { h.reads++; h.request = request;
        if (synchronous) action = terminate(h);
        return new Promise((resolve, reject) => { h.resolve = resolve; h.reject = reject; }); } }).ready();
      const p = h.observe(); if (!synchronous) action = terminate(h);
      expect(action, reason, "CLOSED", outcome); await remainsClosed(h, p, reason, outcome, late);
    });
  }
}
for (const ending of ["throw", "already rejected", "already fulfilled", "thenable"]) {
  test(`T3 synchronous closure followed by ${ending} preserves first result`, async () => {
    const h = harness({ read(h) { h.reads++;
      expect(h.controller.cancel(h.conn, h.intent("cancel")), "cancelled", "CLOSED");
      expect(h.controller.invalidate(event("worker_restarted")), "closed", "CLOSED");
      if (ending === "throw") throw new Error("synthetic secret");
      if (ending === "already rejected") return Promise.reject(poison());
      if (ending === "already fulfilled") return Promise.resolve(poison());
      return Object.defineProperty({}, "then", { get() { assert.fail("then getter executed"); } });
    } }).ready(); await remainsClosed(h, h.observe(), "cancelled", "cancelled");
  });
}
for (const [name, change, reason] of [
  ["boot", { bootId: "boot-2" }, "owner_mismatch"], ["review", { reviewId: "review-2" }, "owner_mismatch"],
  ["capture", { captureId: "capture-99" }, "correlation_mismatch"], ["generation", { generation: 99 }, "correlation_mismatch"],
  ["replay", { intentSeq: 1 }, "replayed_intent"], ["future", { intentSeq: 99 }, "correlation_mismatch"],
  ["malformed", { generation: NaN }, "schema_invalid"], ["oversize", { captureId: "x".repeat(129) }, "size_exceeded"],
]) for (const operation of ["cancel", "manual"]) {
  test(`T2/T3 synchronous ${operation} ${name} cannot terminate`, async () => {
    const h = harness({ read(h) { h.reads++; const before = h.controller.snapshot();
      const bad = h.intent(operation, null, change);
      Object.defineProperty(bad, "extra", { enumerable: true, get() { assert.fail("stale remainder inspected"); } });
      expect(h.controller[operation](h.conn, bad), reason, "READING", "rejected");
      assert.deepEqual(h.controller.snapshot(), before);
      expect(h.controller.cancel(h.conn, h.intent("cancel")), "cancelled", "CLOSED"); return Promise.reject(poison());
    } }).ready(); await remainsClosed(h, h.observe(), "cancelled", "cancelled");
  });
}
for (const [name, alter, reason] of [
  ["extra", i => ({ ...i, extra: true }), "schema_invalid"],
  ["accessor", i => Object.defineProperty(i, "role", { enumerable: true, get() { assert.fail("getter invoked"); } }), "schema_invalid"],
  ["symbol", i => ({ ...i, [Symbol()]: true }), "schema_invalid"],
  ["oversize operation", i => ({ ...i, operation: "x".repeat(33) }), "size_exceeded"],
  ["unknown operation", i => ({ ...i, operation: "capture" }), "operation_unknown"],
  ["invalid role", i => ({ ...i, role: {} }), "schema_invalid"],
]) test(`T1/T3 synchronous authenticated ${name} closes`, async () => {
  const h = harness({ read(h) { h.reads++;
    expect(h.controller.cancel(h.conn, alter(h.intent("cancel"))), reason, "CLOSED"); return Promise.reject(poison());
  } }).ready(); await remainsClosed(h, h.observe(), reason, "blocked");
});
test("T3 terminal Proxy reentry during validation wins", async () => {
  const h = harness({ read(h) { h.reads++; let entered = false;
    const proxy = new Proxy(h.intent("manual"), { getOwnPropertyDescriptor(target, key) {
      if (!entered) { entered = true; h.controller.cancel(h.conn, h.intent("cancel")); }
      return Reflect.getOwnPropertyDescriptor(target, key); } });
    expect(h.controller.manual(h.conn, proxy), "cancelled", "CLOSED"); return Promise.reject(poison());
  } }).ready(); await remainsClosed(h, h.observe(), "cancelled", "cancelled");
});
for (const [readAt, completeAt, reason] of [[59000, 59999, "ok"], [59000, 60000, "capture_expired"],
  [0, 4999, "ok"], [0, 5000, "observation_expired"], [0, 60001, "capture_expired"]]) {
  test(`T6 settled-handler-first deadline ${readAt}/${completeAt}`, async () => {
    const h = harness(); h.attach(); h.capture(); h.time = readAt; h.confirm(); const p = h.observe();
    h.time = completeAt; h.resolve(result(h.request)); expect(await p, reason, reason === "ok" ? "IDLE" : "MANUAL");
  });
}
for (const [time, reason] of [[5000, "observation_expired"], [60000, "capture_expired"]]) {
  test(`T6 timer-first ${reason} retires never-settling read`, async () => {
    const h = harness().ready(); const p = h.observe(); h.time = time; h.timers.at(-1).callback();
    await remainsClosed(h, p, reason, "blocked", "reject");
  });
}

test("T2/T3 synchronous pure rejections and busy calls preserve terminal ticket", async () => {
  const h = harness({ read(h) { h.reads++; const before = h.controller.snapshot();
    expect(h.controller.cancel(connection(), poison()), "owner_mismatch", "READING");
    expect(h.controller.attachReview(sender(), h.conn), "replayed_intent", "READING");
    expect(h.controller.invalidate({ reason: "review_lost", reviewId: "review-2", documentId: "review-doc-2", extra: 1 }), "owner_mismatch", "READING");
    expect(h.controller.confirmSelection(h.conn, h.intent("confirm")), "busy", "READING");
    h.controller.observeOnce(h.conn, h.intent("observe")).then(v => expect(v, "busy", "READING"));
    expect(h.controller.cancel(h.conn, h.intent("manual")), "operation_mismatch", "READING");
    assert.deepEqual(h.controller.snapshot(), before);
    expect(h.controller.cancel(h.conn, h.intent("cancel")), "cancelled", "CLOSED"); return Promise.resolve(poison());
  } }).ready(); await remainsClosed(h, h.observe(), "cancelled", "cancelled");
});

test("T3 cleanup reentry and throw preserve committed cancellation", async () => {
  let armed = false;
  const h = harness({ clearTimer(h) { if (armed) {
    expect(h.controller.invalidate(event("worker_restarted")), "closed", "CLOSED"); throw new Error("synthetic secret");
  } } }).ready();
  const p = h.observe(); armed = true;
  expect(h.controller.cancel(h.conn, h.intent("cancel")), "cancelled", "CLOSED");
  await remainsClosed(h, p, "cancelled", "cancelled");
});

test("T5 three independent observations retain only historical summaries; review loss clears them", async () => {
  const h = harness(); h.attach();
  for (const role of roles) {
    h.capture(role); h.confirm(role); const p = h.observe(role);
    assert.ok(Object.isFrozen(h.request)); assert.equal(Object.keys(h.request).length, 13);
    h.resolve(result(h.request)); expect(await p, "ok", "IDLE", "observed");
  }
  const snap = publicRecord(h.controller.snapshot());
  for (const key of ["plementus", "github", "odooSh"]) assert.equal(snap[key], "supported");
  const lost = expect(h.controller.invalidate(event("review_lost")), "review_lost", "MANUAL", "invalidated");
  assert.equal(lost.plementus, "empty"); expect(h.controller.captureInvocation(tab()), "no_owner");
});

test("T1/T5 recapture of live or summarized tab globally invalidates; fresh unused tab retains summaries", async () => {
  const h = harness().ready(); const old = h.intent("observe"); h.capture("github");
  expect(await h.controller.observeOnce(h.conn, old), "correlation_mismatch");
  h.confirm("github"); const p = h.observe("github"); h.resolve(result(h.request)); await p;
  h.capture("github"); assert.equal(h.controller.snapshot().github, "empty");
  expect(h.controller.confirmSelection(h.conn, h.intent("confirm", "plementus")), "role_conflict", "MANUAL");
});

test("T2 fresh review, retired owners and old disconnect isolation", () => {
  const h = harness().ready(), oldTicket = h.ticket, oldConnection = h.conn;
  const next = connection(); expect(h.controller.attachReview(sender(2), next), "ok", "IDLE");
  expect(h.controller.attachReview(sender(), oldConnection), "replayed_intent");
  expect(h.controller.attachReview(sender(), connection()), "replayed_intent");
  expect(h.controller.invalidate(event("review_lost")), "owner_mismatch", "IDLE");
  expect(h.controller.confirmSelection(oldConnection, { operation: "confirm", ...oldTicket, role: "plementus" }), "owner_mismatch");
  expect(h.controller.cancel(next, { ...h.intent("cancel"), bootId: "boot-2" }), "owner_mismatch");
});

test("T2/T5 worker starts empty and copied cross-instance identity supplies no connection authority", async () => {
  const a = harness().ready(), b = harness().ready();
  expect(await b.controller.observeOnce(a.conn, a.intent("observe")), "owner_mismatch");
  a.controller.invalidate(event("worker_restarted"));
  const fresh = harness(); expect(fresh.controller.snapshot(), "ok", "IDLE");
  expect(await fresh.controller.observeOnce(a.conn, a.intent("observe")), "owner_mismatch");
  assert.equal(fresh.reads, 0);
});

const accessor = (value, key) => Object.defineProperty(value, key, { enumerable: true,
  get() { assert.fail("untrusted getter invoked"); } });
const malformed = [
  ["null", () => null], ["array", () => []], ["function", () => () => {}],
  ["exotic prototype", v => Object.assign(Object.create({}), v)],
  ["extra", v => ({ ...v, extra: 1 })], ["symbol", v => ({ ...v, [Symbol()]: 1 })],
  ["missing", v => { delete v[Object.keys(v)[0]]; return v; }],
  ["accessor", v => accessor(v, Object.keys(v)[0])],
  ["nonenumerable", v => Object.defineProperty(v, Object.keys(v)[0], { enumerable: false })],
  ["cycle", v => { v.extra = v; return v; }],
  ["toJSON", v => ({ ...v, toJSON() { assert.fail("serialization hook invoked"); } })],
  ["throwing Proxy", v => new Proxy(v, { ownKeys() { throw new Error("synthetic secret"); } })],
  ["revoked Proxy", v => { const p = Proxy.revocable(v, {}); p.revoke(); return p.proxy; }],
];
for (const [name, alter] of malformed) {
  test(`T1 closed capture schema ${name}`, () => {
    const h = harness(); h.attach(); expect(h.controller.captureInvocation(alter(tab())), "schema_invalid", "MANUAL");
    assert.equal(h.reads, 0);
  });
  test(`T1 closed result schema ${name}`, async () => {
    const h = harness().ready(); const p = h.observe();
    if (name === "revoked Proxy") {
      // Revoke after native resolution has checked then, before the controller's reaction runs.
      const revocable = Proxy.revocable(result(h.request), {});
      h.resolve(revocable.proxy); revocable.revoke();
    } else h.resolve(alter(result(h.request)));
    expect(await p, "schema_invalid", "MANUAL");
  });
  test(`T1 closed sender schema ${name}`, () => {
    const h = harness(); expect(h.controller.attachReview(alter(sender()), h.conn), "schema_invalid", "IDLE");
  });
}
for (const [field, values] of [
  ["tabId", [0, -1, 1.2, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "101", 1n, undefined]],
  ["windowId", [0, -1, NaN, "7"]], ["frameId", [1, null, "0"]],
  ["documentId", ["", "\n", "\ud800", "\udfff", null, {}, () => {}, Symbol()]],
  ["origin", [null, undefined, {}, "\ud800"]], ["url", [null, "\udfff", { toString() { assert.fail("coercion"); } }]],
]) test(`T1 primitive and numeric validation ${field}`, () => {
  for (const value of values) {
    const h = harness(); h.attach(); expect(h.controller.captureInvocation(tab("plementus", { [field]: value })), "schema_invalid", "MANUAL");
  }
});
for (const [name, changes, reason] of [
  ["tab", { tabId: 104 }, "target_mismatch"], ["window", { windowId: 8 }, "target_mismatch"],
  ["document", { documentId: "doc-other" }, "document_mismatch"],
  ["origin", { origin: "https://negative.r1.invalid" }, "target_mismatch"],
  ["port", { origin: "https://plementus.r1.invalid:444" }, "target_mismatch"],
  ...["/changed", "?changed=1", "#changed", "/", ":443"].map(suffix => [suffix, { url: tab().url + suffix }, "target_mismatch"]),
]) test(`T1/T5 exact target ${name}`, async () => {
  const h = harness(); h.attach(); expect(h.controller.captureInvocation(tab("plementus", changes)), reason, "MANUAL");
  h.capture(); h.confirm(); const p = h.observe(); h.resolve(result(h.request, changes)); expect(await p, reason, "MANUAL");
});

test("T5 either corpus document may be freshly captured; same-URL document drift fails", async () => {
  const h = harness(); h.attach();
  expect(h.controller.captureInvocation(tab("plementus", { documentId: "doc-p-2" })), "ok", "CAPTURED");
  h.confirm(); const p = h.observe(); h.resolve(result(h.request, { documentId: "doc-p-1" }));
  expect(await p, "document_mismatch", "MANUAL");
});

for (const [name, changes, reason, outcome] of [
  ["denied", { capability: "denied" }, "permission_denied", "blocked"],
  ["unsupported capability", { capability: "unsupported" }, "capability_unsupported", "blocked"],
  ["unknown page", { pageKind: "unknown" }, "page_unknown", "manual"],
  ["unsupported page", { pageKind: "unsupported" }, "page_unsupported", "manual"],
  ["bad page", { pageKind: "other" }, "schema_invalid", "blocked"],
  ["bad capability", { capability: "granted" }, "schema_invalid", "blocked"],
]) test(`T1/T6 settled ${name}`, async () => {
  const h = harness().ready(); const p = h.observe(); h.resolve(result(h.request, changes));
  expect(await p, reason, "MANUAL", outcome); h.capture();
});
for (const [name, make, reason] of [
  ["zero", () => [], "result_count"], ["multiple", r => [r, r], "result_count"],
  ["sparse", () => new Array(1), "schema_invalid"],
  ["extra", r => Object.assign([r], { extra: true }), "schema_invalid"],
  ["symbol", r => Object.assign([r], { [Symbol()]: true }), "schema_invalid"],
  ["accessor", r => accessor([r], "0"), "schema_invalid"],
  ["nested", r => [[r]], "schema_invalid"],
  ["alias", r => { r.origin = r; return [r]; }, "schema_invalid"],
]) test(`T1 result array ${name}`, async () => {
  const h = harness().ready(); const p = h.observe(), value = result(h.request);
  value.results = make(value.results[0]); h.resolve(value); expect(await p, reason, "MANUAL");
});
for (const [name, read, reason, state] of [
  ["throw", () => { throw new Error("synthetic secret"); }, "boundary_threw", "CLOSED"],
  ["undefined", () => undefined, "boundary_shape", "CLOSED"],
  ["plain", () => ({}), "boundary_shape", "CLOSED"],
  ["thenable", () => accessor({}, "then"), "boundary_shape", "CLOSED"],
  ["reject", () => Promise.reject(new Error("synthetic secret")), "boundary_rejected", "MANUAL"],
]) test(`T6 boundary ${name}`, async () => {
  const h = harness({ read(h) { h.reads++; return read(); } }).ready();
  const p = h.observe(); expect(await p, reason, state, "blocked");
  if (state === "CLOSED") await remainsClosed(h, p, reason, "blocked");
  else h.capture();
});

for (const [name, now] of [["backward", () => -1], ["nan", () => NaN], ["infinite", () => Infinity],
  ["fractional", () => 0.5], ["unsafe", () => Number.MAX_SAFE_INTEGER + 1], ["string", () => "0"],
  ["throw", () => { throw new Error("synthetic secret"); }]]) {
  test(`T6 clock ${name} at confirmation and completion`, async () => {
    for (const stage of ["confirm", "complete"]) {
      let bad = false;
      const h = harness({ now(h) { return bad ? now() : h.time; } }); h.attach(); h.capture();
      if (stage === "confirm") { bad = true; expect(h.controller.confirmSelection(h.conn, h.intent("confirm")), "clock_invalid", "CLOSED"); }
      else { h.confirm(); const p = h.observe(); bad = true; h.resolve(result(h.request)); expect(await p, "clock_invalid", "CLOSED"); }
    }
  });
}
test("T6 backward 10 to 9; repeated equal readings are allowed", () => {
  const h = harness(); h.attach(); h.time = 10; h.capture(); h.time = 9;
  expect(h.controller.confirmSelection(h.conn, h.intent("confirm")), "clock_invalid", "CLOSED");
});

test("T6 capture timer, early callback, stale callbacks, and no renewed deadline", async () => {
  const h = harness(); h.attach(); h.capture(); const first = h.timers[0]; assert.equal(first.delay, 60000);
  h.time = 1000; first.callback(); assert.equal(h.timers.at(-1).delay, 59000);
  const snap = h.controller.snapshot(), count = h.timers.length; first.callback();
  assert.deepEqual(h.controller.snapshot(), snap); assert.equal(h.timers.length, count);
  h.time = 59000; h.confirm(); const p = h.observe(); assert.equal(h.timers.length, count);
  h.time = 59999; h.resolve(result(h.request)); expect(await p, "ok", "IDLE");
  const complete = h.controller.snapshot(); for (const t of h.timers) t.callback();
  assert.deepEqual(h.controller.snapshot(), complete);
});

test("T6 early read timer reschedules only remainder", async () => {
  const h = harness().ready(), p = h.observe(); h.time = 1000; h.timers.at(-1).callback();
  assert.equal(h.timers.at(-1).delay, 4000); h.time = 5000; h.timers.at(-1).callback();
  await remainsClosed(h, p, "observation_expired", "blocked");
});
for (const phase of ["capture", "admission", "completion"]) {
  test(`T6 timer/cleanup throws during ${phase}`, async () => {
    let armed = false;
    const h = harness({ schedule(h, delay, callback) {
      if (armed && phase === "capture") throw new Error("synthetic secret");
      const handle = { delay, callback }; h.timers.push(handle); return handle;
    }, clearTimer() { if (armed && phase !== "capture") throw new Error("synthetic secret"); } });
    h.attach();
    if (phase === "capture") { armed = true; expect(h.controller.captureInvocation(tab()), "boundary_threw", "MANUAL"); }
    else {
      h.capture(); h.confirm(); if (phase === "admission") armed = true;
      const p = h.observe();
      if (phase === "completion") { armed = true; h.resolve(result(h.request)); }
      expect(await p, "boundary_threw", "MANUAL"); assert.equal(h.reads, phase === "admission" ? 0 : 1);
    }
  });
}

test("T3 successful cleanup invalidation preempts prospective success", async () => {
  let armed = false;
  const h = harness({ clearTimer(h) { if (armed) h.controller.invalidate(event("target_changed")); } }).ready();
  const p = h.observe(); armed = true; h.resolve(result(h.request)); expect(await p, "target_changed", "MANUAL", "invalidated");
});

test("T3 reservation invalidation during ticket delivery prevents read", async () => {
  const h = harness({ deliverTicket(h, conn, ticket) {
    h.ticket = ticket; h.tickets.push({ conn, ticket });
    if (h.controller?.snapshot().state === "READING") h.controller.invalidate(event("target_changed"));
  } }).ready();
  expect(await h.observe(), "target_changed", "MANUAL"); assert.equal(h.reads, 0);
});

test("T3 scheduler reentry cannot install a stale returned timer", () => {
  const h = harness({ schedule(h, delay, callback) {
    const handle = { delay, callback }; h.timers.push(handle);
    h.controller.invalidate(event("worker_restarted")); return handle;
  } }); h.attach(); expect(h.controller.captureInvocation(tab()), "worker_restarted", "CLOSED");
  const snap = h.controller.snapshot(); h.timers[0].callback(); assert.deepEqual(h.controller.snapshot(), snap);
  assert.equal(h.cleared.length, 1); assert.equal(h.reads, 0);
});

for (const key of Object.keys(limits())) test(`T1 exact immutable limit ${key}`, () => {
  for (const transform of [v => { delete v[key]; }, v => { v[key]++; }, v => { v.extra = 1; }]) {
    const config = limits(); transform(config); let callbacks = 0;
    const h = harness(); const b = { ...h.boundary, now() { callbacks++; return 0; } };
    const c = createReadOnlyAdmission(b, config); expect(c.snapshot(), "setup_invalid", "CLOSED");
    expect(c.captureInvocation(poison()), "setup_invalid", "CLOSED"); assert.equal(callbacks, 0);
  }
});
for (const key of ["bootId", "now", "schedule", "clearTimer", "read", "deliverTicket"]) {
  test(`T1 boundary configuration ${key}`, () => {
    for (const mode of ["missing", "invalid", "accessor"]) {
      const h = harness(); const b = { ...h.boundary };
      if (mode === "missing") delete b[key]; else if (mode === "invalid") b[key] = null; else accessor(b, key);
      expect(createReadOnlyAdmission(b, limits()).snapshot(), "setup_invalid", "CLOSED");
    }
  });
}

test("T4 configuration and null-prototype input copies; tickets are private frozen correlation only", async () => {
  const h = harness(), config = limits(); h.controller = createReadOnlyAdmission(h.boundary, config);
  for (const key of Object.keys(config)) config[key] = 0;
  h.attach(); expect(h.controller.captureInvocation(Object.assign(Object.create(null), tab())), "ok", "CAPTURED");
  assert.ok(Object.isFrozen(h.ticket)); assert.deepEqual(Object.keys(h.ticket), ["bootId", "reviewId", "captureId", "generation", "intentSeq"]);
  assert.ok(Buffer.byteLength(JSON.stringify(h.ticket)) <= 1024);
  h.confirm(); const p = h.observe(); h.resolve(result(h.request)); expect(await p, "ok", "IDLE");
});

test("T6 malformed trusted lifecycle fails closed except unproven review loss", async () => {
  const h = harness().ready(); const p = h.observe();
  expect(h.controller.invalidate({ reviewId: null, documentId: null }), "schema_invalid", "CLOSED");
  await remainsClosed(h, p, "schema_invalid", "blocked");
});
test("T2 absent ticket distinguishes future sequence from consumed sequence", async () => {
  const h = harness().ready(); const p = h.observe(); h.resolve(result(h.request)); await p;
  const intent = h.intent("cancel", null, { captureId: "none" });
  expect(h.controller.cancel(h.conn, intent), "replayed_intent", "IDLE");
  expect(h.controller.cancel(h.conn, { ...intent, intentSeq: intent.intentSeq + 1 }), "correlation_mismatch", "IDLE");
  expect(h.controller.cancel(h.conn, { ...intent, generation: intent.generation + 1 }), "correlation_mismatch", "IDLE");
});

for (const [field, cap] of [["documentId", 128], ["origin", 256], ["url", 2048]]) {
  for (const [label, character, width] of [["ASCII", "x", 1], ["accent", "é", 2], ["emoji", "🙂", 4], ["quote", '"', 1], ["slash", "\\", 1]]) {
    test(`T1/T6 UTF-8 ${field} ${label} minus/exact/plus scalar bytes`, () => {
      for (const bytes of [cap - 1, cap, cap + 1]) {
        const value = character.repeat(Math.floor(bytes / width)) + "x".repeat(bytes % width);
        assert.equal(Buffer.byteLength(value), bytes);
        const h = harness(); h.attach();
        const expected = bytes > cap ? "size_exceeded" : field === "documentId"
          ? width > 1 ? "schema_invalid" : "document_mismatch" : "target_mismatch";
        expect(h.controller.captureInvocation(tab("plementus", { [field]: value })), expected, "MANUAL");
      }
    });
  }
}

// Test-only module copies exercise unreachable counter ceilings and pure byte-budget guards.
// The shipping factory has no counter override, introspection hook, or extra export.
const sourceURL = new URL("../src/browser/read-only-admission.mjs", import.meta.url);
async function moduleCopy(transform) {
  const source = await readFile(sourceURL, "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(transform(source)).toString("base64")}`);
}
test("T6 exact aggregate budgets, escaping and lone surrogates use sanitized copies", async () => {
  const { testEnvelope, testString, testRecord } = await moduleCopy(s => s +
    "\nexport { envelope as testEnvelope, string as testString, record as testRecord };\n");
  for (const cap of [512, 1024, 4096]) {
    for (const char of ["x", "é", "🙂", '"', "\\"]) {
      for (const size of [cap - 1, cap, cap + 1]) {
        const unit = Buffer.byteLength(JSON.stringify(char)) - 2;
        const available = size - 8; // {"x":""}
        const value = char.repeat(Math.floor(available / unit)) + "x".repeat(available % unit);
        const copy = Object.assign(Object.create(null), { x: value });
        assert.equal(Buffer.byteLength(JSON.stringify(copy)), size);
        if (size > cap) assert.throws(() => testEnvelope(copy, cap));
        else assert.doesNotThrow(() => testEnvelope(copy, cap));
      }
    }
  }
  for (const value of ["\ud800", "\udfff", "x\ud800x"]) assert.throws(() => testString(value, 2048));
  for (const n of [15, 16, 17]) {
    const value = Object.fromEntries(Array.from({ length: n }, (_, i) => [`x${i}`, 0]));
    if (n <= 16) assert.doesNotThrow(() => testRecord(value, Object.keys(value)));
    else assert.throws(() => testRecord(value, Object.keys(value)));
  }
});
for (const bytes of [4095, 4096, 4097]) {
  test(`T6 actual result envelope ${bytes} bytes with individually valid escaped URL`, async () => {
    const h = harness().ready(); const p = h.observe(), value = result(h.request);
    value.results[0].url = "";
    const needed = bytes - Buffer.byteLength(JSON.stringify(value));
    value.results[0].url = '"'.repeat(Math.floor(needed / 2)) + "x".repeat(needed % 2);
    assert.ok(Buffer.byteLength(value.results[0].url) <= 2048);
    assert.equal(Buffer.byteLength(JSON.stringify(value)), bytes);
    h.resolve(value); expect(await p, bytes > 4096 ? "size_exceeded" : "target_mismatch", "MANUAL");
  });
}
test("T6 legal closed intent maxima cannot reach aggregate budget", () => {
  const value = { operation: "x".repeat(32), bootId: '"'.repeat(128), reviewId: '"'.repeat(128),
    captureId: '"'.repeat(128), generation: Number.MAX_SAFE_INTEGER,
    intentSeq: Number.MAX_SAFE_INTEGER, role: "plementus" };
  assert.ok(Buffer.byteLength(JSON.stringify(value)) < 1024);
});
for (const counter of ["revision", "generation", "captureSeq", "requestSeq", "intentSeq"]) {
  test(`T6 safe ${counter} exhaustion closes without wrap`, async () => {
    const initial = counter === "generation" ? 1 : 0;
    const { createReadOnlyAdmission: factory } = await moduleCopy(s => {
      const original = `${counter}: ${initial}`;
      assert.equal(s.split(original).length, 2);
      return s.replace(original, `${counter}: Number.MAX_SAFE_INTEGER`);
    });
    const h = harness({}, factory);
    if (["revision", "generation", "intentSeq"].includes(counter)) {
      expect(h.controller.attachReview(sender(), h.conn), "sequence_exhausted", "CLOSED");
    } else {
      h.attach();
      if (counter === "captureSeq") expect(h.controller.captureInvocation(tab()), "sequence_exhausted", "CLOSED");
      else { h.capture(); h.confirm(); expect(await h.observe(), "sequence_exhausted", "CLOSED"); }
    }
    assert.equal(h.reads, 0); assert.ok(Number.isSafeInteger(h.controller.snapshot().sequence));
    publicRecord(h.controller.snapshot());
  });
}

test("T3 retired comparison cells and operational handles are cleared before cleanup", async () => {
  const { createReadOnlyAdmission: factory } = await moduleCopy(s => s
    .replace("createReadOnlyAdmission(boundary, limits)", "createReadOnlyAdmission(boundary, limits, inspect)")
    .replace("  return Object.freeze({ captureInvocation, attachReview,", `
  inspect(() => ({ cleared: [owner, retiredOwner, capture, pending, currentConnection,
    retiredConnection, underlying, resolver, timer, ticket, active].every(value => value === null),
    readPhase: c.readPhase }));
  return Object.freeze({ captureInvocation, attachReview,`));
  let inspect, armed = false;
  const h = harness({ clearTimer() {
    if (armed) assert.deepEqual(inspect(), { cleared: true, readPhase: "RETIRED" });
  } }, (b, l) => factory(b, l, fn => { inspect = fn; })).ready();
  const p = h.observe(); armed = true; h.controller.cancel(h.conn, h.intent("cancel"));
  assert.deepEqual(inspect(), { cleared: true, readPhase: "RETIRED" });
  await remainsClosed(h, p, "cancelled", "cancelled", "reject");
  assert.deepEqual(inspect(), { cleared: true, readPhase: "RETIRED" });
});

test("T4 source exports only factory and has no runtime imports or prohibited dependencies", async () => {
  const source = await readFile(sourceURL, "utf8");
  assert.equal((source.match(/\bexport\b/g) ?? []).length, 1);
  assert.equal(/\b(?:import|require|fetch|XMLHttpRequest|WebSocket|chrome|localStorage|indexedDB|process|eval)\s*(?:[.(]|\{|["'])/.test(source), false);
  assert.equal(/\b(?:setTimeout|setInterval|Date|console)\s*[.(]/.test(source), false);
});

for (const op of ["cancel", "manual"]) for (const bad of ["missing", "accessor", "nonenumerable", "undefined"]) {
  test(`T2/T3 synchronous ${op} ${bad} correlation never authenticates remainder`, async () => {
    const h = harness({ read(h) { h.reads++; const before = h.controller.snapshot();
      const intent = h.intent(op);
      if (bad === "missing") delete intent.captureId;
      else if (bad === "accessor") accessor(intent, "captureId");
      else if (bad === "nonenumerable") Object.defineProperty(intent, "captureId", { enumerable: false });
      else intent.captureId = undefined;
      accessor(intent, "role");
      expect(h.controller[op](h.conn, intent), "schema_invalid", "READING", "rejected");
      assert.deepEqual(h.controller.snapshot(), before);
      expect(h.controller.cancel(h.conn, h.intent("cancel")), "cancelled", "CLOSED");
      return Promise.reject(poison());
    } }).ready(); await remainsClosed(h, h.observe(), "cancelled", "cancelled");
  });
}
for (const late of ["fulfill", "reject"]) for (const [name, alter, reason] of [
  ["extra accessor", i => accessor(i, "extra"), "schema_invalid"],
  ["unknown operation", i => ({ ...i, operation: "snapshot" }), "operation_unknown"],
  ["operation size", i => ({ ...i, operation: "x".repeat(33) }), "size_exceeded"],
  ["role type", i => ({ ...i, role: {} }), "schema_invalid"],
]) test(`T3 synchronous owner ${name} with held late ${late}`, async () => {
  const h = harness({ read(h) { h.reads++;
    expect(h.controller.cancel(h.conn, alter(h.intent("cancel"))), reason, "CLOSED");
    return new Promise((resolve, reject) => { h.resolve = resolve; h.reject = reject; });
  } }).ready(); await remainsClosed(h, h.observe(), reason, "blocked", late);
});

test("T2/T3 retired trusted attachment cannot terminate synchronous replacement-owner read", async () => {
  const old = connection(); let entered = false;
  const h = harness({ read(h, request) { h.reads++; h.request = request; entered = true;
    const before = h.controller.snapshot();
    expect(h.controller.attachReview(sender(), old), "replayed_intent", "READING");
    expect(h.controller.attachReview(sender(), connection()), "replayed_intent", "READING");
    expect(h.controller.invalidate(event("review_lost")), "owner_mismatch", "READING");
    assert.deepEqual(h.controller.snapshot(), before);
    expect(h.controller.cancel(h.conn, h.intent("cancel")), "cancelled", "CLOSED");
    return Promise.reject(poison());
  } });
  expect(h.controller.attachReview(sender(), old), "ok");
  expect(h.controller.attachReview(sender(2), h.conn), "ok"); h.capture(); h.confirm();
  await remainsClosed(h, h.observe(), "cancelled", "cancelled"); assert.ok(entered);
});

test("T3 validated recapture closes synchronously without a new clock call", async () => {
  let forbidClock = false;
  const h = harness({ now(h) { assert.equal(forbidClock, false); return h.time; },
    read(h) { h.reads++; forbidClock = true;
      expect(h.controller.captureInvocation(tab("github")), "target_changed", "CLOSED"); return Promise.reject(poison());
    } }).ready();
  await remainsClosed(h, h.observe(), "target_changed", "invalidated");
});

test("T3 synchronous cleanup nested second termination and throw preserve first reason", async () => {
  let armed = false;
  const h = harness({ clearTimer(h) { if (armed) {
    expect(h.controller.manual(h.conn, h.intent("manual")), "closed", "CLOSED"); throw new Error("synthetic secret");
  } }, read(h) { h.reads++; armed = true;
    expect(h.controller.cancel(h.conn, h.intent("cancel")), "cancelled", "CLOSED");
    return Promise.reject(poison());
  } }).ready(); await remainsClosed(h, h.observe(), "cancelled", "cancelled");
});

test("T3 native Promise physically settled but reaction queued is still IN_FLIGHT", async () => {
  const h = harness({ read(h, request) { h.reads++; h.request = request; return Promise.resolve(result(request)); } }).ready();
  const p = h.observe(); expect(h.controller.cancel(h.conn, h.intent("cancel")), "cancelled", "CLOSED");
  await remainsClosed(h, p, "cancelled", "cancelled");
});

test("T3 terminal reentry during remaining schema reflection preserves first decision", async () => {
  const h = harness({ read(h) { h.reads++; let nested = false;
    const proxy = new Proxy(h.intent("manual"), { ownKeys(target) {
      if (!nested) { nested = true; h.controller.invalidate(event("target_changed")); }
      return Reflect.ownKeys(target);
    } });
    expect(h.controller.manual(h.conn, proxy), "target_changed", "CLOSED"); return Promise.reject(poison());
  } }).ready(); await remainsClosed(h, h.observe(), "target_changed", "invalidated");
});

for (const stage of ["capture", "confirm", "admission", "completion", "timer"]) {
  test(`T6 clock terminal reentry during ${stage} preserves lifecycle decision`, async () => {
    let armed = false;
    const h = harness({ now(h) { if (armed) h.controller.invalidate(event("worker_restarted")); return h.time; } }); h.attach();
    if (stage === "capture") { armed = true; expect(h.controller.captureInvocation(tab()), "worker_restarted", "CLOSED"); return; }
    h.capture();
    if (stage === "confirm") { armed = true; expect(h.controller.confirmSelection(h.conn, h.intent("confirm")), "worker_restarted", "CLOSED"); return; }
    h.confirm(); if (stage === "admission") armed = true;
    const p = h.observe();
    if (stage === "completion") { armed = true; h.resolve(result(h.request)); }
    if (stage === "timer") { armed = true; h.timers.at(-1).callback(); }
    expect(await p, "worker_restarted", "CLOSED");
    assert.equal(h.reads, stage === "admission" ? 0 : 1);
  });
}
for (const stage of ["attachment", "capture", "confirmation", "admission"]) {
  test(`T6 ticket callback throw during ${stage}`, async () => {
    let count = 0; const failAt = ["attachment", "capture", "confirmation", "admission"].indexOf(stage) + 1;
    const h = harness({ deliverTicket(h, conn, ticket) {
      count++; if (count === failAt) throw new Error("synthetic secret");
      h.ticket = ticket; h.tickets.push({ conn, ticket });
    } });
    if (stage === "attachment") { expect(h.controller.attachReview(sender(), h.conn), "boundary_threw", "MANUAL"); return; }
    h.attach();
    if (stage === "capture") { expect(h.controller.captureInvocation(tab()), "boundary_threw", "MANUAL"); return; }
    h.capture();
    if (stage === "confirmation") { expect(h.controller.confirmSelection(h.conn, h.intent("confirm")), "boundary_threw", "MANUAL"); return; }
    h.confirm(); expect(await h.observe(), "boundary_threw", "MANUAL"); assert.equal(h.reads, 0);
  });
}
test("T6 inline scheduler callback fails closed without stale installation", () => {
  const h = harness({ schedule(h, delay, callback) { const handle = { delay, callback };
    h.timers.push(handle); callback(); return handle; } });
  h.attach(); expect(h.controller.captureInvocation(tab()), "boundary_threw", "MANUAL");
  assert.equal(h.cleared.length, 1); const snap = h.controller.snapshot();
  h.timers[0].callback(); assert.deepEqual(h.controller.snapshot(), snap);
});

test("T4 conservative maximum public envelope remains below 512 bytes", () => {
  const value = { operation: "worker_restart", outcome: "invalidated", reason: "capability_unsupported",
    state: "CONFIRMED", role: "plementus", pageKind: "unsupported", sequence: Number.MAX_SAFE_INTEGER,
    plementus: "supported", github: "supported", odooSh: "supported", evidenceTier: "SIMULATED",
    accountVerified: false, executionAuthorized: false, approvalGranted: false, trustedContinuingContext: false };
  assert.ok(Buffer.byteLength(JSON.stringify(value)) <= 512);
});

for (const previous of ["success", "manual", "cancelled"]) for (const via of ["descriptor", "clock", "invalidation"]) {
  test(`T3 historical ${previous} latch cannot suppress fresh ${via} terminal reentry`, async () => {
    let armed = false;
    const h = harness({ now(h) {
      if (armed && via === "clock") h.controller.invalidate(event("worker_restarted"));
      return h.time;
    } }).ready();
    if (previous === "success") { const p = h.observe(); h.resolve(result(h.request)); await p; }
    else if (previous === "manual") h.controller.manual(h.conn, h.intent("manual"));
    else h.controller.cancel(h.conn, h.intent("cancel"));
    armed = true;
    let invoked = false;
    const proxy = value => new Proxy(value, { getOwnPropertyDescriptor(target, key) {
      if (!invoked) { invoked = true; h.controller.invalidate(event("worker_restarted")); }
      return Reflect.getOwnPropertyDescriptor(target, key);
    } });
    const value = via === "invalidation" ? h.controller.invalidate(proxy(event("target_changed"))) :
      h.controller.captureInvocation(via === "descriptor" ? proxy(tab("github")) : tab("github"));
    expect(value, "worker_restarted", "CLOSED", "invalidated");
    expect(h.controller.snapshot(), "worker_restarted", "CLOSED");
  });
}

for (const field of ["operation", "bootId", "reviewId", "captureId", "generation", "intentSeq", "role"]) {
  test(`T1 missing intent field ${field} obeys correlation authority boundary`, async () => {
    const h = harness().ready(), p = h.observe(), intent = h.intent("cancel"); delete intent[field];
    const authenticated = field === "operation" || field === "role";
    expect(h.controller.cancel(h.conn, intent), "schema_invalid", authenticated ? "CLOSED" : "READING");
    if (!authenticated) h.controller.cancel(h.conn, h.intent("cancel"));
    await remainsClosed(h, p, authenticated ? "schema_invalid" : "cancelled", authenticated ? "blocked" : "cancelled");
  });
}
for (const field of ["bootId", "reviewId", "captureId", "requestId", "generation", "results"]) {
  test(`T1 missing result field ${field}`, async () => {
    const h = harness().ready(), p = h.observe(), value = result(h.request); delete value[field];
    h.resolve(value); expect(await p, "schema_invalid", "MANUAL");
  });
}
for (const bytes of [31, 32, 33]) test(`T1 operation bytes ${bytes}`, () => {
  const h = harness().ready(); expect(h.controller.cancel(h.conn, h.intent("cancel", null, { operation: "x".repeat(bytes) })),
    bytes > 32 ? "size_exceeded" : "operation_unknown", "MANUAL");
});
for (const role of [null, undefined, "odoo", "GitHub", 0, false, "🙂", () => {}]) {
  test(`T1 explicit role rejects invalid type/enum ${typeof role}/${role === null}`, () => {
    const h = harness(); h.attach(); h.capture();
    expect(h.controller.confirmSelection(h.conn, { ...h.intent("confirm"), role }), "schema_invalid", "MANUAL");
  });
}
test("T1 inherited fields cannot supply required own data", () => {
  const h = harness(); h.attach(); const input = tab();
  Object.setPrototypeOf(input, { documentId: input.documentId }); delete input.documentId;
  expect(h.controller.captureInvocation(input), "schema_invalid", "MANUAL");
});
test("T6 invalid initial clocks close setup without other callbacks", () => {
  for (const value of [1, -1, NaN, Infinity, 0.5, "0", null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
    expect(harness({ now() { return value; } }).controller.snapshot(), "setup_invalid", "CLOSED");
  }
  expect(harness({ now() { throw new Error("synthetic secret"); } }).controller.snapshot(), "setup_invalid", "CLOSED");
});
test("T6 capture expiry equality prevents confirmation and never starts a read", () => {
  const h = harness(); h.attach(); h.capture(); h.time = 60000;
  expect(h.controller.confirmSelection(h.conn, h.intent("confirm")), "capture_expired", "MANUAL");
  assert.equal(h.reads, 0); h.time = 60001; h.capture();
});

test("T3 late payload sentinel genuinely fulfills native promises without assimilation rejection", async () => {
  const value = poison(); let fulfilled = false, rejected = false;
  await Promise.resolve(value).then(result => { fulfilled = result === value; }, () => { rejected = true; });
  assert.equal(fulfilled, true); assert.equal(rejected, false);
});
