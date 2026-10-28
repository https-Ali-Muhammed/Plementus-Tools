// Metadata is deliberately outside this state-only API; its schema and storage require later review.
/** @typedef {"draft" | "ready" | "running" | "awaiting_operator" | "reconcile_required" | "failed" | "blocked" | "completed" | "cancelled"} WorkflowState */
/** @typedef {Readonly<{runId?: string, step?: string, timestamp?: string, evidenceTier?: string}>} FutureRunMetadata Candidate fields only; policy and validation remain undecided. */

export const ALLOWED_TRANSITIONS = Object.freeze({
  draft: Object.freeze(["ready", "cancelled"]),
  ready: Object.freeze(["draft", "running", "blocked", "cancelled"]),
  running: Object.freeze(["awaiting_operator", "reconcile_required", "failed", "blocked", "completed", "cancelled"]),
  awaiting_operator: Object.freeze(["running", "reconcile_required", "blocked", "cancelled"]),
  reconcile_required: Object.freeze(["ready", "blocked", "cancelled"]),
  failed: Object.freeze(["reconcile_required", "cancelled"]),
  blocked: Object.freeze(["ready", "cancelled"]),
  completed: Object.freeze([]),
  cancelled: Object.freeze([]),
});

export const WORKFLOW_STATES = Object.freeze(Object.keys(ALLOWED_TRANSITIONS));

export function canTransition(from, to) {
  return typeof from === "string" && typeof to === "string" &&
    Object.hasOwn(ALLOWED_TRANSITIONS, from) && ALLOWED_TRANSITIONS[from].includes(to);
}

export function transition(from, to) {
  if (!canTransition(from, to)) throw new Error("Invalid workflow transition");
  return to;
}
