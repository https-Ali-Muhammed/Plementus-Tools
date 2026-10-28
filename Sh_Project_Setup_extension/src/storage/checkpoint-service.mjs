import { checkpointEligibility, validateCheckpointStructure, validateCheckpointUpdate } from "./checkpoint-policy.mjs";
import { decideTransition } from "../workflow/transition-decision.mjs";

const failure = () => new Error("Checkpoint operation failed");
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// The factory, clock and authorization are injected; none establishes runtime identity.
export async function createCheckpointService(factory, { now, authorize }) {
  let db;
  try {
    if (!factory || typeof factory.open !== "function" || typeof now !== "function" || typeof authorize !== "function") throw failure();
    db = await new Promise((resolve, reject) => {
      const request = factory.open("sec01-checkpoints", 1);
      request.onupgradeneeded = () => {
        try { request.result.createObjectStore("checkpoints", { keyPath: "runId" }); } catch { request.transaction.abort(); }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = request.onblocked = () => reject(failure());
    });
  } catch { throw failure(); }
  let previousTime;
  function time() {
    const value = now();
    if (!Number.isSafeInteger(value) || value < 0 || (previousTime !== undefined && value < previousTime)) throw failure();
    previousTime = value;
    return value;
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
    if (!validateCheckpointStructure(record) || record.runId !== id || checkpointEligibility(record, instant) !== eligibility) throw failure();
  }
  async function remove(id, revision, reason) {
    checkedId(id);
    if (!Number.isSafeInteger(revision) || revision < 0) throw failure();
    return transaction("readwrite", (store, done, abort) => get(store, id, record => {
      requireRecord(record, id, time(), reason === "expired" ? "expired" : "eligible");
      if (record.revision !== revision || (reason === "acknowledged" && !["completed", "cancelled"].includes(record.state)) ||
          (reason !== "expired" && authorize(reason) !== true)) throw failure();
      store.delete(id); done();
    }, abort));
  }
  async function safe(fn) { try { return await fn(); } catch { throw failure(); } }
  return Object.freeze({
    create: record => safe(() => {
      if (!validateCheckpointStructure(record) || record.revision !== 0) throw failure();
      const copy = { ...record };
      return transaction("readwrite", (store, done, abort) => get(store, copy.runId, existing => {
        const instant = time();
        if (existing !== undefined || checkpointEligibility(copy, instant) !== "eligible" || copy.createdAt !== instant) throw failure();
        store.add(copy); done({ ...copy });
      }, abort));
    }),
    read: id => safe(() => {
      checkedId(id);
      return transaction("readonly", (store, done, abort) => get(store, id, record => {
        requireRecord(record, id, time()); done({ ...record });
      }, abort));
    }),
    transition: (id, expectedState, expectedRevision, targetState) => safe(() => {
      checkedId(id);
      return transaction("readwrite", (store, done, abort) => get(store, id, current => {
        const instant = time();
        requireRecord(current, id, instant);
        const { createdAt, ...old } = current;
        const decision = decideTransition({ ...old, schemaVersion: 1 }, expectedState, expectedRevision, targetState);
        if (authorize("transition") !== true) throw failure();
        const proposed = { ...decision.record, schemaVersion: 2, createdAt };
        if (!validateCheckpointUpdate(current, proposed, instant)) throw failure();
        store.put(proposed); done({ decision: "operator_review", record: { ...proposed } });
      }, abort));
    }),
    delete: (id, revision, reason) => safe(() => {
      if (!["explicit", "acknowledged"].includes(reason)) throw failure();
      return remove(id, revision, reason);
    }),
    cleanup: () => safe(async () => {
      const instant = time();
      const expired = await transaction("readonly", (store, done, abort) => {
        const entries = []; const request = store.openCursor();
        request.onsuccess = () => {
          try {
            const cursor = request.result;
            if (!cursor) { done(entries); return; }
            const record = cursor.value;
            if (!validateCheckpointStructure(record) || cursor.primaryKey !== record.runId) throw failure();
            const eligibility = checkpointEligibility(record, instant);
            if (eligibility === "invalid") throw failure();
            if (eligibility === "expired") entries.push([record.runId, record.revision]);
            cursor.continue();
          } catch { abort(); }
        };
        request.onerror = abort;
      });
      for (const [id, revision] of expired) await remove(id, revision, "expired");
      return expired.length;
    }),
  });
}
