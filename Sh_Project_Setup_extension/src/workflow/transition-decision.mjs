import { validateRunRecord } from "../storage/run-record.mjs";
import { canTransition } from "./state.mjs";

// A proposal requires operator review and an atomic revision check before any later update.
export function decideTransition(record, expectedState, expectedRevision, targetState) {
  try {
    if (!validateRunRecord(record) || record.state !== expectedState || record.revision !== expectedRevision ||
        !canTransition(record.state, targetState) || record.revision + 1 >= Number.MAX_SAFE_INTEGER ||
        (["reconcile_required", "blocked"].includes(record.state) && targetState === "ready")) throw new Error();
    return { decision: "operator_review", record: { ...record, state: targetState, revision: record.revision + 1 } };
  } catch {
    throw new Error("Transition decision failed");
  }
}
