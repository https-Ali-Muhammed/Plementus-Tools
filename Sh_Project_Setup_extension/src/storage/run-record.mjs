import { WORKFLOW_STATES } from "../workflow/state.mjs";

const keys = ["schemaVersion", "runId", "state", "step", "evidenceTier", "revision"];
const tiers = ["none", "SIMULATED", "LOCAL_BROWSER_TESTED", "GITHUB_SANDBOX_VERIFIED", "MANUALLY_ATTESTED", "ODOO_SH_DEMO_VERIFIED", "PLEMENTUS_DEMO_VERIFIED"];
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const validId = id => typeof id === "string" && idPattern.test(id);
const validRevision = value => Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER;
const fail = () => { throw new Error("Run record operation failed"); };

export function validateRunRecord(record) {
  if (!record || typeof record !== "object" || Object.getPrototypeOf(record) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(record);
  const names = Reflect.ownKeys(descriptors);
  if (names.length !== keys.length || !keys.every(key => Object.hasOwn(descriptors, key) && "value" in descriptors[key] && descriptors[key].enumerable)) return false;
  return record.schemaVersion === 1 && validId(record.runId) &&
    typeof record.state === "string" && WORKFLOW_STATES.includes(record.state) &&
    Number.isInteger(record.step) && record.step >= 0 && record.step <= 99 &&
    typeof record.evidenceTier === "string" && tiers.includes(record.evidenceTier) && validRevision(record.revision);
}

// The injected adapter must atomically compare revisions for replace/remove and reject duplicate insertions.
export function createRunRepository(adapter) {
  function read(id) {
    if (!validId(id)) fail();
    const record = adapter.get(id);
    if (record === null) return null;
    if (!validateRunRecord(record) || record.runId !== id) fail();
    return { ...record };
  }
  function protect(operation) {
    try { return operation(); } catch { return fail(); }
  }
  return Object.freeze({
    read: id => protect(() => read(id)),
    create: record => protect(() => {
      if (!validateRunRecord(record) || record.revision !== 0 || !adapter.insert({ ...record })) fail();
      return { ...record };
    }),
    update: (record, expectedRevision) => protect(() => {
      if (!validateRunRecord(record) || !validRevision(expectedRevision) || record.revision !== expectedRevision + 1) fail();
      const current = read(record.runId);
      if (!current || current.revision !== expectedRevision || !adapter.replace({ ...record }, expectedRevision)) fail();
      return { ...record };
    }),
    delete: (id, expectedRevision) => protect(() => {
      if (!validRevision(expectedRevision)) fail();
      const current = read(id);
      if (!current || current.revision !== expectedRevision || !adapter.remove(id, expectedRevision)) fail();
    }),
  });
}
