import { createRunRepository } from "../storage/run-record.mjs";
import { canTransition } from "./state.mjs";

// Decisions do not establish operational prerequisites or execute transitions.
export function decideRecovery(adapter, runId, expectedRevision) {
  try {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error();
    const record = createRunRepository(adapter).read(runId);
    if (!record || record.revision !== expectedRevision) throw new Error();
    if (record.state === "completed" || record.state === "cancelled") return { decision: "terminal", state: record.state, revision: record.revision };
    if (record.state === "reconcile_required" || canTransition(record.state, "reconcile_required")) {
      return { decision: "reconcile_required", state: record.state, revision: record.revision };
    }
    return { decision: "operator_review", state: record.state, revision: record.revision };
  } catch {
    throw new Error("Recovery decision failed");
  }
}
