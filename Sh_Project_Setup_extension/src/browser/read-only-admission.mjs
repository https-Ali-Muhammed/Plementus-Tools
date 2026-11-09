// Disconnected synthetic admission only; no product or browser dependency.
const LIMITS = Object.freeze({ codeBytes: 32, idBytes: 128, originBytes: 256, urlBytes: 2048,
  intentBytes: 1024, resultBytes: 4096, publicBytes: 512, maxFields: 16,
  maxRecordDepth: 2, maxResultItems: 1, maxRoles: 3, maxCaptures: 1, maxPending: 1,
  captureMs: 60000, observationMs: 5000 });
const ROLES = ["plementus", "github", "odoo-sh"];
const TARGET_KEYS = ["tabId", "windowId", "frameId", "documentId", "origin", "url"];
const CORRELATION = ["bootId", "reviewId", "captureId", "generation", "intentSeq"];
const INTENT_KEYS = ["operation", ...CORRELATION, "role"];
const RESULT_KEYS = ["bootId", "reviewId", "captureId", "requestId", "generation", "results"];
const SENDER_KEYS = ["reviewId", "documentId", "frameId", "kind"];
const BOUNDARY_KEYS = ["bootId", "now", "schedule", "clearTimer", "read", "deliverTicket"];
const TARGETS = ROLES.map((role, i) => Object.freeze({ tabId: 101 + i, windowId: 7,
  frameId: 0, documentId: `doc-${["p", "g", "o"][i]}-1`,
  origin: `https://${role}.r1.invalid`, url: `https://${role}.r1.invalid/fixture` }));
const NativePromise = Promise;
const nativeThen = Promise.prototype.then;
const noop = () => {};
const encoder = new TextEncoder();
const interrupted = Symbol("interrupted");
const failures = new Map(["schema_invalid", "size_exceeded", "operation_unknown", "result_count"]
  .map(reason => [reason, Symbol(reason)]));
const fail = reason => { throw failures.get(reason); };
const positive = value => Number.isSafeInteger(value) && value > 0;
const timeValue = value => Number.isSafeInteger(value) && value >= 0;
const flat = value => Object.assign(Object.create(null), value);
const frozen = value => Object.freeze(flat(value));

function string(value, max, id = false) {
  if (typeof value !== "string" || !value.isWellFormed()) fail("schema_invalid");
  if (encoder.encode(value).length > max) fail("size_exceeded");
  if (id && !/^[\x20-\x7e]+$/.test(value)) fail("schema_invalid");
  return value;
}
function member(value, values) { if (!values.includes(value)) fail("schema_invalid"); }
function data(value, key, guard) {
  if (!value || typeof value !== "object") fail("schema_invalid");
  const descriptor = Object.getOwnPropertyDescriptor(value, key); guard();
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) fail("schema_invalid");
  return descriptor.value;
}
function record(value, keys, guard = noop) {
  if (!value || typeof value !== "object") fail("schema_invalid");
  const proto = Object.getPrototypeOf(value); guard();
  if (proto !== null && proto !== Object.prototype) fail("schema_invalid");
  const own = Reflect.ownKeys(value); guard();
  if (own.length > 16 || own.length !== keys.length || own.some(key => !keys.includes(key))) fail("schema_invalid");
  const copy = Object.create(null);
  for (const key of keys) copy[key] = data(value, key, guard);
  return copy;
}
function envelope(copy, max) {
  if (encoder.encode(JSON.stringify(copy)).length > max) fail("size_exceeded");
}
function targetFields(copy) {
  if (!positive(copy.tabId) || !positive(copy.windowId) || copy.frameId !== 0) fail("schema_invalid");
  string(copy.documentId, 128, true); string(copy.origin, 256); string(copy.url, 2048);
}
function targetMatch(copy) {
  const index = TARGETS.findIndex(target => ["tabId", "windowId", "frameId", "origin", "url"]
    .every(key => target[key] === copy[key]));
  if (index < 0) return "target_mismatch";
  const doc = TARGETS[index].documentId;
  return copy.documentId === doc || copy.documentId === doc.slice(0, -1) + "2" ? null : "document_mismatch";
}
function resultCopy(value, guard) {
  const copy = record(value, RESULT_KEYS, guard);
  for (const key of RESULT_KEYS.slice(0, 4)) string(copy[key], 128, true);
  if (!positive(copy.generation)) fail("schema_invalid");
  const array = copy.results;
  if (!Array.isArray(array)) fail("schema_invalid");
  const proto = Object.getPrototypeOf(array); guard();
  if (proto !== Array.prototype) fail("schema_invalid");
  const length = Object.getOwnPropertyDescriptor(array, "length"); guard();
  if (!length || !Object.hasOwn(length, "value")) fail("schema_invalid");
  if (length.value !== 1) fail("result_count");
  const keys = Reflect.ownKeys(array); guard();
  if (keys.length !== 2 || !keys.includes("0") || !keys.includes("length")) fail("schema_invalid");
  const item = record(data(array, "0", guard), [...TARGET_KEYS, "pageKind", "capability"], guard);
  targetFields(item); member(item.pageKind, ["supported", "unsupported", "unknown"]);
  member(item.capability, ["available", "denied", "unsupported"]);
  // A null array prototype prevents inherited serialization hooks on the validated copy.
  copy.results = Object.setPrototypeOf([item], null);
  envelope(copy, 4096);
  return copy;
}

export function createReadOnlyAdmission(boundary, limits) {
  const c = { bootId: null, generation: 1, revision: 0, captureSeq: 0, requestSeq: 0,
    intentSeq: 0, lastNow: 0, state: "IDLE", lastReason: "ok", busy: false,
    terminalLatched: false, readPhase: "NONE" };
  let b, owner = null, retiredOwner = null, capture = null, pending = null;
  let currentConnection = null, retiredConnection = null, underlying = null;
  let resolver = null, timer = null, ticket = null, active = null, disposition = null;
  let dispatchRevision = null;
  const summaries = { plementus: "empty", github: "empty", odooSh: "empty" };
  const summaryKey = role => role === "odoo-sh" ? "odooSh" : role;
  const closed = () => c.state === "CLOSED";
  const view = (operation, outcome, reason, role = null, pageKind = "unknown") => frozen({
    operation, outcome, reason, state: c.state, role, pageKind, sequence: c.revision,
    plementus: summaries.plementus, github: summaries.github, odooSh: summaries.odooSh,
    evidenceTier: "SIMULATED", accountVerified: false, executionAuthorized: false,
    approvalGranted: false, trustedContinuingContext: false });
  const latched = operation => view(operation, disposition?.outcome ?? "blocked", c.lastReason,
    disposition?.role ?? null, disposition?.pageKind ?? "unknown");
  const reject = (operation, reason) => view(operation, "rejected", reason);
  const clearSummaries = () => { for (const key of Object.keys(summaries)) summaries[key] = "empty"; };

  // Commit authority loss before any cleanup callback; the first disposition owns settlement.
  function terminate(operation, outcome, reason, forceClosed = false, loseOwner = false,
    role = null, pageKind = "unknown") {
    if (closed()) return latched(operation);
    const retirement = c.readPhase === "IN_FLIGHT";
    if (c.revision === Number.MAX_SAFE_INTEGER || c.generation === Number.MAX_SAFE_INTEGER) {
      outcome = "blocked"; reason = "sequence_exhausted"; forceClosed = true;
    }
    if (c.revision < Number.MAX_SAFE_INTEGER) c.revision++;
    if (c.generation < Number.MAX_SAFE_INTEGER) c.generation++;
    c.terminalLatched = true; c.lastReason = reason;
    c.state = forceClosed || retirement ? "CLOSED" : outcome === "cancelled" ? "CANCELLED" : "MANUAL";
    if (retirement) c.readPhase = "RETIRED";
    disposition = { outcome, role, pageKind };
    capture = null; pending = null; active = null; ticket = null; underlying = null;
    const oldTimer = timer; timer = null;
    const settle = resolver; resolver = null;
    clearSummaries();
    if (closed()) {
      owner = null; retiredOwner = null; currentConnection = null; retiredConnection = null;
    } else if (loseOwner) {
      retiredOwner = owner && { reviewId: owner.reviewId, documentId: owner.documentId };
      retiredConnection = currentConnection; owner = null; currentConnection = null;
    } else if (owner) { owner.generation = c.generation; owner.ticketSeq = 0; }
    if (oldTimer?.installed) { try { b.clearTimer(oldTimer.handle); } catch { /* The committed result wins. */ } }
    const observation = latched("observe");
    if (settle) settle(observation);
    return latched(operation);
  }
  try {
    const copiedLimits = record(limits, Object.keys(LIMITS));
    for (const key of Object.keys(LIMITS)) if (copiedLimits[key] !== LIMITS[key]) fail("schema_invalid");
    b = record(boundary, BOUNDARY_KEYS);
    string(b.bootId, 128, true);
    member(b.bootId, ["boot-1", "boot-2"]);
    for (const key of BOUNDARY_KEYS.slice(1)) if (typeof b[key] !== "function") fail("schema_invalid");
    const initial = b.now();
    if (initial !== 0) fail("schema_invalid");
    c.bootId = b.bootId; Object.freeze(b);
  } catch {
    c.state = "CLOSED"; c.lastReason = "setup_invalid"; c.terminalLatched = true;
    disposition = { outcome: "blocked", role: null, pageKind: "unknown" }; b = null;
  }

  function dispatch(operation, work) {
    if (closed()) return view(operation, "blocked", c.lastReason === "setup_invalid" ? "setup_invalid" : "closed");
    // A historical disposition must not veto a new dispatch's trusted terminal reentry.
    if (c.busy && c.terminalLatched && c.revision !== dispatchRevision) return latched(operation);
    const nested = c.busy;
    if (!nested) dispatchRevision = c.revision;
    c.busy = true;
    let revision = c.revision;
    const ctx = { nested, authenticated: false,
      guard() { if (closed() || c.revision !== revision) throw interrupted; },
      sync() { revision = c.revision; } };
    try { return work(ctx); }
    catch (error) {
      if (error === interrupted || closed() || c.revision !== revision) return latched(operation);
      const reason = [...failures].find(([, token]) => token === error)?.[0] ?? "schema_invalid";
      return ctx.authenticated ? terminate(operation, "blocked", reason) : reject(operation, reason);
    } finally {
      if (!nested && !closed()) {
        dispatchRevision = null;
        c.busy = false;
      }
    }
  }
  function advance(ctx, counters = [], generation = false) {
    ctx.guard();
    const keys = ["revision", ...counters, ...(generation ? ["generation"] : [])];
    if (keys.some(key => c[key] === Number.MAX_SAFE_INTEGER)) {
      terminate("invalidate", "blocked", "sequence_exhausted", true); throw interrupted;
    }
    for (const key of keys) c[key]++;
    if (owner && generation) owner.generation = c.generation;
    ctx.sync();
  }
  function clock(ctx) {
    let value;
    try { value = b.now(); } catch {
      ctx.guard(); terminate("invalidate", "blocked", "clock_invalid", true); throw interrupted;
    }
    ctx.guard();
    if (!timeValue(value) || value < c.lastNow) {
      terminate("invalidate", "blocked", "clock_invalid", true); throw interrupted;
    }
    c.lastNow = value;
    return value;
  }
  function expiry(now) {
    if (capture && now - capture.capturedAt >= 60000) return "capture_expired";
    if (pending && now - pending.readAt >= 5000) return "observation_expired";
    return null;
  }
  function checkTime(ctx) {
    const now = clock(ctx), reason = expiry(now);
    if (reason) { terminate("timeout", "blocked", reason); throw interrupted; }
    return now;
  }
  function detachTimer(ctx) {
    const old = timer; timer = null;
    if (old?.installed) {
      try { b.clearTimer(old.handle); } catch {
        ctx.guard(); terminate("invalidate", "blocked", "boundary_threw"); throw interrupted;
      }
      ctx.guard();
    }
  }
  function arm(ctx, delay) {
    detachTimer(ctx); ctx.guard();
    const cell = { handle: null, installed: false, generation: c.generation };
    timer = cell;
    let handle;
    try {
      handle = b.schedule(delay, () => {
        if (closed() || timer !== cell || cell.generation !== c.generation) return;
        dispatch("timeout", inner => {
          if (!cell.installed) return terminate("timeout", "blocked", "boundary_threw");
          const now = checkTime(inner);
          arm(inner, Math.min(60000 - (now - capture.capturedAt),
            pending ? 5000 - (now - pending.readAt) : 60000));
          return view("timeout", "accepted", "ok");
        });
      });
    } catch {
      ctx.guard(); terminate("invalidate", "blocked", "boundary_threw"); throw interrupted;
    }
    if (closed() || timer !== cell || cell.generation !== c.generation) {
      try { b.clearTimer(handle); } catch { /* Stale timer has no admission authority. */ }
      throw interrupted;
    }
    cell.handle = handle; cell.installed = true; ctx.guard();
  }
  function issue(ctx) {
    ctx.guard();
    if (c.intentSeq === Number.MAX_SAFE_INTEGER) {
      terminate("invalidate", "blocked", "sequence_exhausted", true); throw interrupted;
    }
    c.intentSeq++;
    owner.ticketSeq = c.intentSeq;
    ticket = frozen({ bootId: c.bootId, reviewId: owner.reviewId,
      captureId: capture?.captureId ?? "none", generation: c.generation, intentSeq: c.intentSeq });
    try { b.deliverTicket(currentConnection, ticket); } catch {
      ctx.guard(); terminate("invalidate", "blocked", "boundary_threw"); throw interrupted;
    }
    ctx.guard();
  }
  function consume() { ticket = null; owner.ticketSeq = 0; }
  function correlation(conn, intent, ctx, operation) {
    if (!owner || conn !== currentConnection) return reject(operation, "owner_mismatch");
    const copy = Object.create(null);
    for (const key of CORRELATION) {
      copy[key] = data(intent, key, ctx.guard);
      if (key === "generation" || key === "intentSeq") {
        if (!positive(copy[key])) fail("schema_invalid");
      } else string(copy[key], 128, true);
    }
    ctx.guard();
    if (copy.bootId !== c.bootId || copy.reviewId !== owner.reviewId) return reject(operation, "owner_mismatch");
    if (copy.generation !== c.generation || copy.captureId !== (capture?.captureId ?? "none")) {
      return reject(operation, "correlation_mismatch");
    }
    if (copy.intentSeq > c.intentSeq) return reject(operation, "correlation_mismatch");
    if (!ticket || copy.intentSeq < c.intentSeq) return reject(operation, "replayed_intent");
    if (copy.intentSeq !== owner.ticketSeq) return reject(operation, "correlation_mismatch");
    ctx.authenticated = true;
    const full = record(intent, INTENT_KEYS, ctx.guard);
    // Reflection may return inconsistent descriptors; correlation is proven again on the closed copy.
    if (CORRELATION.some(key => full[key] !== copy[key])) {
      ctx.authenticated = false; return reject(operation, "correlation_mismatch");
    }
    string(full.operation, 32);
    if (!["confirm", "observe", "cancel", "manual"].includes(full.operation)) fail("operation_unknown");
    member(full.role, ["cancel", "manual"].includes(full.operation) ? [null] : ROLES);
    envelope(full, 1024); ctx.guard();
    if (full.operation !== operation) return reject(operation, "operation_mismatch");
    return full;
  }
  function attachReview(sender, conn) {
    return dispatch("attach_review", ctx => {
      const s = record(sender, SENDER_KEYS, ctx.guard);
      string(s.reviewId, 128, true); string(s.documentId, 128, true);
      if (s.frameId !== 0 || s.kind !== "mock_review") fail("schema_invalid");
      if (![1, 2].some(n => s.reviewId === `review-${n}` && s.documentId === `review-doc-${n}`)) fail("schema_invalid");
      if (!conn || typeof conn !== "object") fail("schema_invalid");
      const proto = Object.getPrototypeOf(conn); ctx.guard();
      const keys = Reflect.ownKeys(conn); ctx.guard();
      const immutable = Object.isFrozen(conn); ctx.guard();
      if (proto !== null || keys.length || !immutable) fail("schema_invalid");
      if (conn === currentConnection || conn === retiredConnection ||
          [owner, retiredOwner].some(o => o && o.reviewId === s.reviewId && o.documentId === s.documentId)) {
        return reject("attach_review", "replayed_intent");
      }
      if (c.readPhase === "IN_FLIGHT") return terminate("attach_review", "invalidated", "review_replaced");
      if (ctx.nested) return reject("attach_review", "busy");
      advance(ctx, [], true); c.terminalLatched = false; disposition = null; c.lastReason = "ok";
      capture = null; pending = null; ticket = null; active = null; clearSummaries();
      detachTimer(ctx);
      retiredOwner = owner && { reviewId: owner.reviewId, documentId: owner.documentId };
      retiredConnection = currentConnection; currentConnection = conn;
      owner = { reviewId: s.reviewId, documentId: s.documentId, generation: c.generation, ticketSeq: 0 };
      c.state = "IDLE"; issue(ctx);
      return view("attach_review", "accepted", "ok");
    });
  }
  function captureInvocation(tab) {
    return dispatch("capture", ctx => {
      if (!owner) return reject("capture", "no_owner");
      ctx.authenticated = true;
      const copy = record(tab, TARGET_KEYS, ctx.guard); targetFields(copy);
      const mismatch = targetMatch(copy); ctx.guard();
      if (mismatch) return terminate("capture", "blocked", mismatch);
      if (c.readPhase === "IN_FLIGHT") return terminate("capture", "invalidated", "target_changed");
      if (ctx.nested) return reject("capture", "busy");
      const now = clock(ctx), role = ROLES[copy.tabId - 101];
      advance(ctx, ["captureSeq"], true);
      if (capture || summaries[summaryKey(role)] !== "empty" || c.state !== "IDLE") clearSummaries();
      c.terminalLatched = false; disposition = null; c.lastReason = "ok";
      capture = { captureId: `capture-${c.captureSeq}`, generation: c.generation, capturedAt: now,
        ...copy, role: null, phase: "CAPTURED", reviewId: owner.reviewId, bootId: c.bootId };
      c.state = "CAPTURED"; issue(ctx); arm(ctx, 60000);
      return view("capture", "accepted", "ok");
    });
  }
  function intentCall(operation, conn, intent) {
    return dispatch(operation, ctx => {
      const input = correlation(conn, intent, ctx, operation);
      if (Object.hasOwn(input, "outcome")) return input;
      const terminal = operation === "cancel" || operation === "manual";
      if (ctx.nested && !(terminal && c.readPhase === "IN_FLIGHT")) return reject(operation, "busy");
      if (terminal) {
        consume(); return terminate(operation, operation === "cancel" ? "cancelled" : "manual",
          operation === "cancel" ? "cancelled" : "manual_requested");
      }
      if (c.readPhase === "IN_FLIGHT" || pending) return reject(operation, "busy");
      if (!capture) return reject(operation, "no_capture");
      if (c.state !== (operation === "confirm" ? "CAPTURED" : "CONFIRMED")) return reject(operation, "wrong_state");
      const now = checkTime(ctx);
      if (input.role !== ROLES[capture.tabId - 101] || summaries[summaryKey(input.role)] !== "empty" ||
          (operation === "observe" && input.role !== capture.role)) return terminate(operation, "blocked", "role_conflict");
      advance(ctx, operation === "observe" ? ["requestSeq"] : []); consume();
      capture.role = input.role;
      if (operation === "confirm") {
        capture.phase = "CONFIRMED"; c.state = "CONFIRMED"; issue(ctx);
        return view(operation, "accepted", "ok", input.role);
      }
      capture.phase = "READING"; c.state = "READING";
      pending = { requestId: `request-${c.requestSeq}`, captureId: capture.captureId,
        generation: c.generation, reviewId: owner.reviewId, bootId: c.bootId, readAt: now, role: input.role };
      active = Symbol("read"); const identity = active;
      const observation = new NativePromise(resolve => { resolver = resolve; });
      try {
        issue(ctx);
        const remaining = 60000 - (now - capture.capturedAt);
        if (remaining > 5000) arm(ctx, 5000);
        ctx.guard();
        if (active !== identity) throw interrupted;
        c.readPhase = "IN_FLIGHT";
        let returned;
        try {
          returned = b.read(frozen({ bootId: pending.bootId, reviewId: pending.reviewId,
            captureId: pending.captureId, requestId: pending.requestId, generation: pending.generation,
            role: pending.role, ...Object.fromEntries(TARGET_KEYS.map(key => [key, capture[key]])), operation: "observe" }));
        }
        catch {
          if (!closed()) terminate(operation, "blocked", "boundary_threw", true);
          return observation;
        }
        let native = false;
        try { native = returned !== null && typeof returned === "object" && Object.getPrototypeOf(returned) === NativePromise.prototype; }
        catch { /* A failed capability check never exposes the boundary value. */ }
        if (!native) {
          if (!closed()) terminate(operation, "blocked", "boundary_shape", true);
          return observation;
        }
        if (!closed()) underlying = returned;
        try {
          // Both reactions return undefined; the derived native Promise cannot reject from our handlers.
          nativeThen.call(returned,
            value => { if (!closed() && active === identity) complete(identity, value, false); },
            () => { if (!closed() && active === identity) complete(identity, null, true); });
        } catch {
          if (!closed()) terminate(operation, "blocked", "boundary_shape", true);
        }
      } catch (error) {
        if (error !== interrupted && !closed()) terminate(operation, "blocked", "boundary_threw");
      }
      return observation;
    });
  }
  function complete(identity, value, rejected) {
    if (closed() || active !== identity || !pending) return;
    c.readPhase = "SETTLED"; underlying = null;
    dispatch("complete", ctx => {
      ctx.authenticated = true;
      if (rejected) return terminate("complete", "blocked", "boundary_rejected");
      const copy = resultCopy(value, ctx.guard); ctx.guard();
      for (const key of RESULT_KEYS.slice(0, 5)) {
        if (copy[key] !== pending[key]) return terminate("complete", "blocked", "correlation_mismatch");
      }
      const item = copy.results[0];
      if (TARGET_KEYS.filter(key => key !== "documentId").some(key => item[key] !== capture[key])) {
        return terminate("complete", "blocked", "target_mismatch");
      }
      if (item.documentId !== capture.documentId) return terminate("complete", "blocked", "document_mismatch");
      if (item.capability !== "available") return terminate("complete", "blocked",
        item.capability === "denied" ? "permission_denied" : "capability_unsupported", false, false, pending.role, item.pageKind);
      if (item.pageKind !== "supported") return terminate("complete", "manual",
        item.pageKind === "unknown" ? "page_unknown" : "page_unsupported", false, false, pending.role, item.pageKind);
      checkTime(ctx); ctx.guard();
      const role = pending.role;
      capture = null; pending = null; ticket = null; active = null; owner.ticketSeq = 0;
      detachTimer(ctx); ctx.guard();
      advance(ctx); c.state = "IDLE"; c.lastReason = "ok";
      summaries[summaryKey(role)] = "supported";
      c.terminalLatched = true; disposition = { outcome: "observed", role, pageKind: "supported" };
      const settle = resolver; resolver = null;
      settle(view("observe", "observed", "ok", role, "supported"));
      return view("complete", "observed", "ok", role, "supported");
    });
  }
  function invalidate(event) {
    return dispatch("invalidate", ctx => {
      ctx.authenticated = true;
      const reason = data(event, "reason", ctx.guard);
      if (reason === "review_lost") {
        ctx.authenticated = false;
        const reviewId = data(event, "reviewId", ctx.guard), documentId = data(event, "documentId", ctx.guard);
        string(reviewId, 128, true); string(documentId, 128, true);
        if (!owner || reviewId !== owner.reviewId || documentId !== owner.documentId) return reject("invalidate", "owner_mismatch");
      }
      ctx.authenticated = true;
      const copy = record(event, ["reason", "reviewId", "documentId"], ctx.guard);
      member(copy.reason, ["target_changed", "review_lost", "worker_restarted"]);
      if (copy.reason !== reason) fail("schema_invalid");
      if (reason !== "review_lost" && (copy.reviewId !== null || copy.documentId !== null)) fail("schema_invalid");
      if (reason === "review_lost" && (copy.reviewId !== owner.reviewId || copy.documentId !== owner.documentId)) {
        ctx.authenticated = false; return reject("invalidate", "owner_mismatch");
      }
      ctx.guard();
      return terminate(reason === "worker_restarted" ? "worker_restart" : "invalidate", "invalidated", reason,
        reason === "worker_restarted", reason === "review_lost");
    });
  }
  return Object.freeze({ captureInvocation, attachReview,
    confirmSelection: (conn, intent) => intentCall("confirm", conn, intent),
    observeOnce: (conn, intent) => NativePromise.resolve(intentCall("observe", conn, intent)),
    cancel: (conn, intent) => intentCall("cancel", conn, intent),
    manual: (conn, intent) => intentCall("manual", conn, intent), invalidate,
    snapshot: () => view("snapshot", "snapshot", c.lastReason) });
}
