import { RETENTION_MS, checkpointEligibility, validateCheckpointStructure, validateCheckpointUpdate } from "./checkpoint-policy.mjs";
import { decideTransition } from "../workflow/transition-decision.mjs";

const failure = () => new Error("Checkpoint operation failed");
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
// Candidate bounds: 1 ms wall quantization, 0.1 ms documented timer precision; width cap is one wall quantum.
const TIMER_PRECISION_MS = 0.1, MAX_BRACKET_MS = 1;

// The factory, clock and authorization are injected; none establishes runtime identity.
export async function createCheckpointService(factory, { now, monotonicNow, authorize } = {}) {
  let db;
  try {
    if (!factory || typeof factory.open !== "function" || typeof now !== "function" ||
        (monotonicNow !== undefined && typeof monotonicNow !== "function") || typeof authorize !== "function") throw failure();
    db = await new Promise((resolve, reject) => {
      const request = factory.open("sec01-checkpoints", 1);
      request.onupgradeneeded = () => {
        try { request.result.createObjectStore("checkpoints", { keyPath: "runId" }); } catch { request.transaction.abort(); }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = request.onblocked = () => reject(failure());
    });
  } catch { throw failure(); }
  let firstSample, previousSample, clockBlocked = false;
  const known = new Map();
  let cleanupInFlight;
  function time() {
    if (clockBlocked) throw failure();
    try {
      const before = monotonicNow?.(), wall = now(), after = monotonicNow?.();
      if (!Number.isSafeInteger(wall) || wall < 0 ||
          !Number.isFinite(before) || before < 0 || before > Number.MAX_SAFE_INTEGER ||
          !Number.isFinite(after) || after < before || after > Number.MAX_SAFE_INTEGER ||
          after - before > MAX_BRACKET_MS ||
          (previousSample && (wall < previousSample.wall || before < previousSample.after ||
            wall - previousSample.wall > after - previousSample.before + 1 + TIMER_PRECISION_MS)) ||
          (firstSample && wall - firstSample.wall > after - firstSample.before + 1 + TIMER_PRECISION_MS)) throw failure();
      const sample = { before, wall, after };
      firstSample ??= sample;
      return previousSample = sample;
    } catch { clockBlocked = true; throw failure(); }
  }
  function eligibilityFor(record, sample) {
    const result = checkpointEligibility(record, sample.wall);
    const creation = known.get(record?.runId);
    if (!creation || record.createdAt !== creation.wall) { clockBlocked = true; throw failure(); }
    const elapsed = sample.before - creation.after - TIMER_PRECISION_MS;
    if ((result === "expired" && elapsed < RETENTION_MS) ||
        (result === "eligible" && elapsed >= RETENTION_MS)) {
      clockBlocked = true; throw failure();
    }
    return result;
  }
  function transaction(mode, execute) {
    return new Promise((resolve, reject) => {
      let tx, result;
      try {
        tx = db.transaction("checkpoints", mode);
        tx.oncomplete = () => resolve(result);
        tx.onabort = tx.onerror = () => reject(failure());
        execute(tx.objectStore("checkpoints"), value => { result = value; }, () => tx.abort());
      } catch {
        try { tx?.abort(); } catch {}
        reject(failure());
      }
    });
  }
  function checkedId(id) { if (typeof id !== "string" || !idPattern.test(id)) throw failure(); }
  function get(store, id, action, abort) {
    const request = store.get(id);
    request.onsuccess = () => { try { action(request.result); } catch { abort(); } };
    request.onerror = abort;
  }
  function requireRecord(record, id, instant, eligibility = "eligible") {
    if (record !== undefined && !known.has(id)) { clockBlocked = true; throw failure(); }
    if (!validateCheckpointStructure(record) || record.runId !== id || eligibilityFor(record, instant) !== eligibility) throw failure();
  }
  async function remove(id, revision, reason) {
    checkedId(id);
    if (!Number.isSafeInteger(revision) || revision < 0) throw failure();
    const result = await transaction("readwrite", (store, done, abort) => get(store, id, record => {
      requireRecord(record, id, time());
      if (record.revision !== revision || (reason === "acknowledged" && !["completed", "cancelled"].includes(record.state)) ||
          authorize(reason) !== true) throw failure();
      store.delete(id); done();
    }, abort));
    known.delete(id);
    return result;
  }
  function cleanupPass() {
    const instant = time();
    return transaction("readwrite", (store, done, abort) => {
      const deleted = [];
      const request = store.openCursor();
      request.onsuccess = () => {
        try {
          const cursor = request.result;
          if (!cursor) { done(deleted); return; }
          const record = cursor.value;
          if (!known.has(cursor.primaryKey)) { clockBlocked = true; throw failure(); }
          if (!validateCheckpointStructure(record) || cursor.primaryKey !== record.runId) throw failure();
          const eligibility = eligibilityFor(record, instant);
          if (eligibility === "invalid") throw failure();
          if (eligibility === "expired") {
            const deletion = cursor.delete();
            deletion.onerror = abort;
            deleted.push(cursor.primaryKey);
          }
          cursor.continue();
        } catch { abort(); }
      };
      request.onerror = abort;
    });
  }
  async function gate() {
    const pass = cleanupInFlight ??= cleanupPass();
    try {
      const deleted = await pass;
      for (const id of deleted) known.delete(id);
      time();
      return deleted.length;
    } finally {
      if (cleanupInFlight === pass) cleanupInFlight = undefined;
    }
  }
  async function safe(fn) { try { return await fn(); } catch { throw failure(); } }
  return Object.freeze({
    create: record => safe(async () => {
      await gate();
      if (!validateCheckpointStructure(record) || record.revision !== 0) throw failure();
      const copy = { ...record };
      let creation;
      const created = await transaction("readwrite", (store, done, abort) => get(store, copy.runId, existing => {
        const instant = time();
        if (existing !== undefined || checkpointEligibility(copy, instant.wall) !== "eligible" || copy.createdAt !== instant.wall) throw failure();
        creation = instant;
        store.add(copy); done({ ...copy });
      }, abort));
      known.set(copy.runId, creation);
      return created;
    }),
    read: id => safe(async () => {
      await gate();
      checkedId(id);
      return transaction("readonly", (store, done, abort) => get(store, id, record => {
        requireRecord(record, id, time()); done({ ...record });
      }, abort));
    }),
    transition: (id, expectedState, expectedRevision, targetState) => safe(async () => {
      await gate();
      checkedId(id);
      return transaction("readwrite", (store, done, abort) => get(store, id, current => {
        const instant = time();
        requireRecord(current, id, instant);
        const { createdAt, ...old } = current;
        const decision = decideTransition({ ...old, schemaVersion: 1 }, expectedState, expectedRevision, targetState);
        if (authorize("transition") !== true) throw failure();
        const proposed = { ...decision.record, schemaVersion: 2, createdAt };
        if (!validateCheckpointUpdate(current, proposed, instant.wall)) throw failure();
        store.put(proposed); done({ decision: "operator_review", record: { ...proposed } });
      }, abort));
    }),
    delete: (id, revision, reason) => safe(async () => {
      await gate();
      if (!["explicit", "acknowledged"].includes(reason)) throw failure();
      return remove(id, revision, reason);
    }),
    cleanup: () => safe(() => gate()),
  });
}
