import { validateRunRecord } from "./run-record.mjs";

export const RETENTION_MS = 604800000;
const keys = ["schemaVersion", "runId", "state", "step", "evidenceTier", "revision", "createdAt"];
const validTime = value => Number.isSafeInteger(value) && value >= 0;

export function validateCheckpointStructure(record) {
  try {
    if (!record || typeof record !== "object" || Object.getPrototypeOf(record) !== Object.prototype) return false;
    const fields = Object.getOwnPropertyDescriptors(record);
    if (Reflect.ownKeys(fields).length !== keys.length || !keys.every(key =>
      Object.hasOwn(fields, key) && "value" in fields[key] && fields[key].enumerable)) return false;
    const { schemaVersion, runId, state, step, evidenceTier, revision, createdAt } = Object.fromEntries(keys.map(key => [key, fields[key].value]));
    return schemaVersion === 2 && validTime(createdAt) && Number.isSafeInteger(createdAt + RETENTION_MS) &&
      validateRunRecord({ schemaVersion: 1, runId, state, step, evidenceTier, revision });
  } catch {
    return false;
  }
}

// previousTime must be a trusted observation supplied by the caller, not a record field.
export function checkpointEligibility(record, now, previousTime) {
  if (!validateCheckpointStructure(record) || !validTime(now) ||
      (previousTime !== undefined && (!validTime(previousTime) || now < previousTime))) return "invalid";
  try {
    const createdAt = Object.getOwnPropertyDescriptor(record, "createdAt").value;
    if (createdAt > now) return "invalid";
    return now >= createdAt + RETENTION_MS ? "expired" : "eligible";
  } catch {
    return "invalid";
  }
}

export function validateCheckpointUpdate(current, proposed, now, previousTime) {
  if (checkpointEligibility(current, now, previousTime) !== "eligible" ||
      checkpointEligibility(proposed, now, previousTime) !== "eligible") return false;
  try {
    return Object.getOwnPropertyDescriptor(current, "createdAt").value === Object.getOwnPropertyDescriptor(proposed, "createdAt").value &&
      Object.getOwnPropertyDescriptor(current, "runId").value === Object.getOwnPropertyDescriptor(proposed, "runId").value;
  } catch {
    return false;
  }
}
