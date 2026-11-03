const ROLES = ["plementus", "github", "odoo-sh"];
const IDENTITY = ["tabId", "windowId", "frameId", "documentId", "origin"];
const METADATA = [...IDENTITY, "url", "permission", "status", "documentLifecycle",
  "pendingNavigation", "discarded", "incognito", "pageKind", "privacySafe"];
const FIELDS = {
  invoke: ["source", "candidate"], assign: ["role", "targetConfirmed"],
  beginObservation: ["role", "before"], completeObservation: ["request", "after", "readSucceeded"],
  uncertain: ["tabId", "reason"], reselect: [], manual: [], newReview: [], cancel: [],
  reviewLost: [], reviewRestart: [], workerRestart: [], browserRestart: [], coverageLost: [],
};
const REASONS = ["navigation", "reload", "history", "fragment", "cross_origin", "permission_lost",
  "tab_closed", "tab_replaced", "window_changed", "document_mismatch", "target_ambiguous", "observation_gap", "timeout"];
const invalid = Symbol("invalid");
const fail = () => { throw invalid; };
const positiveId = value => Number.isSafeInteger(value) && value > 0;

// Descriptor copies avoid getters; proxies may still reenter, so dispatch also guards its generation.
function record(value, required, optional = []) {
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some(key => typeof key !== "string" || ![...required, ...optional].includes(key)) ||
      required.some(key => !Object.hasOwn(descriptors, key))) fail();
  const copy = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) fail();
    copy[key] = descriptor.value;
  }
  return copy;
}

function httpsUrl(value) {
  if (typeof value !== "string" || value.length > 2048) fail();
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.href !== value) fail();
  return url;
}

function configuration(value) {
  const data = record(value, ["expectedOrigins", "lifecycleCoverage"]);
  if (data.lifecycleCoverage !== true) fail();
  const origins = record(data.expectedOrigins, ROLES);
  for (const role of ROLES) {
    if (typeof origins[role] !== "string") fail();
    const url = httpsUrl(`${origins[role]}/`);
    if (url.origin !== origins[role] || (role === "github"
      ? origins[role] !== "https://github.com" : !url.hostname.endsWith(".example"))) fail();
  }
  if (new Set(Object.values(origins)).size !== 3) fail();
  return origins;
}

function metadata(value, origins) {
  const data = record(value, METADATA);
  if (!positiveId(data.tabId) || !positiveId(data.windowId) || data.frameId !== 0 ||
      typeof data.documentId !== "string" || !/^[\x21-\x7e]{1,128}$/.test(data.documentId) ||
      typeof data.origin !== "string" || !Object.values(origins).includes(data.origin) ||
      httpsUrl(data.url).origin !== data.origin || data.permission !== "granted" ||
      data.status !== "complete" || data.documentLifecycle !== "active" ||
      data.pendingNavigation !== false || data.discarded !== false || data.incognito !== false ||
      data.pageKind !== "supported" || data.privacySafe !== true) fail();
  return data;
}
const identity = data => Object.fromEntries(IDENTITY.map(key => [key, data[key]]));
const sameIdentity = (a, b) => IDENTITY.every(key => a[key] === b[key]);

/** BF-07 disconnected simulator. No input independently proves a Chrome event or observation.
 * config: explicit fixture expectedOrigins and lifecycleCoverage:true (synthetic assertion only).
 * API: snapshot(); dispatch({type, context: snapshot().context, ...exact event fields}).
 * Context/request objects correlate this live instance by identity, never execution authority.
 */
export function createSelectionInvalidation(config) {
  let origins;
  try { origins = configuration(config); } catch { origins = null; }
  let workerGeneration = 1, reviewGeneration = 1, contextGeneration = 1, requestSequence = 0;
  let context, capture = null, busy = false, stale = false, manual = !origins;
  let coverageAvailable = Boolean(origins), captureState = manual ? "MANUAL_FALLBACK" : "UNBOUND";
  const slots = Object.fromEntries(ROLES.map(role => [role,
    { state: manual ? "MANUAL_FALLBACK" : "UNBOUND", binding: null, pending: null }]));
  const renewContext = () => {
    context = Object.freeze({ workerGeneration, reviewGeneration, contextGeneration });
  };
  renewContext();

  function view(accepted = false, reason = "snapshot", request = null) {
    return Object.freeze({ accepted, reason, context,
      roles: Object.freeze(Object.fromEntries(ROLES.map(role => [role, slots[role].state]))),
      captureState,
      aggregateReadOnly: !manual && !stale && !capture && ROLES.every(role =>
        slots[role].state === "CONTEXT_VERIFIED_READ_ONLY" && !slots[role].pending),
      request, accountVerified: false, executionAuthorized: false, evidenceTier: "OFFLINE_SIMULATED" });
  }

  function invalidate() {
    contextGeneration++;
    renewContext();
    if (capture) captureState = "STALE_OR_UNCERTAIN";
    capture = null;
    stale = true;
    for (const slot of Object.values(slots)) {
      if (slot.binding || slot.state === "STALE_OR_UNCERTAIN" || slot.state === "RESELECTION_REQUIRED") {
        slot.state = "STALE_OR_UNCERTAIN";
      }
      slot.binding = null;
      slot.pending = null;
    }
  }

  function clear(nextState) {
    contextGeneration++;
    renewContext();
    capture = null;
    captureState = nextState;
    stale = false;
    manual = nextState === "MANUAL_FALLBACK";
    for (const slot of Object.values(slots)) {
      slot.state = nextState;
      slot.binding = null;
      slot.pending = null;
    }
  }

  function dispatch(input) {
    if (busy) {
      invalidate();
      return view(false, "refused");
    }
    busy = true;
    const entered = context;
    const guard = () => { if (context !== entered) fail(); };
    try {
      const data = record(input, ["type", "context"], [...new Set(Object.values(FIELDS).flat())]);
      guard();
      if (data.context !== context || typeof data.type !== "string" || !Object.hasOwn(FIELDS, data.type)) {
        return view(false, "refused");
      }
      if (Object.keys(data).length !== FIELDS[data.type].length + 2 ||
          FIELDS[data.type].some(key => !Object.hasOwn(data, key))) fail();
      const { type } = data;

      if (["cancel", "reviewLost", "reviewRestart", "workerRestart", "browserRestart"].includes(type)) {
        if (type === "workerRestart" || type === "browserRestart") workerGeneration++;
        reviewGeneration++;
        clear(origins && coverageAvailable ? "UNBOUND" : "MANUAL_FALLBACK");
        return view(true, "accepted");
      }
      if (type === "manual" || type === "coverageLost") {
        if (type === "coverageLost") coverageAvailable = false;
        if (manual) return view(false, "refused");
        clear("MANUAL_FALLBACK");
        return view(true, "accepted");
      }
      if (type === "newReview") {
        if (!manual || !origins || !coverageAvailable) return view(false, "refused");
        reviewGeneration++;
        clear("UNBOUND");
        return view(true, "accepted");
      }
      if (manual) return view(false, "refused");
      if (type === "reselect") {
        if (!stale) return view(false, "refused");
        stale = false;
        if (captureState === "STALE_OR_UNCERTAIN") captureState = "RESELECTION_REQUIRED";
        for (const slot of Object.values(slots)) {
          if (slot.state === "STALE_OR_UNCERTAIN") slot.state = "RESELECTION_REQUIRED";
        }
        return view(true, "accepted");
      }
      if (type === "uncertain") {
        if (!positiveId(data.tabId) || !REASONS.includes(data.reason)) fail();
        if (capture?.tabId !== data.tabId && !Object.values(slots).some(slot => slot.binding?.tabId === data.tabId)) {
          return view(false, "refused");
        }
        invalidate();
        return view(true, "invalidated");
      }
      if (stale) return view(false, "refused");
      if (type === "invoke") {
        if (data.source !== "SIMULATED") return view(false, "refused");
        let candidate;
        try { candidate = metadata(data.candidate, origins); } catch {
          guard();
          if (capture || Object.values(slots).some(slot => slot.binding)) fail();
          clear("MANUAL_FALLBACK");
          return view(false, "unsupported");
        }
        guard();
        if (Object.values(slots).some(slot => slot.binding?.tabId === candidate.tabId)) {
          invalidate();
          return view(false, "invalidated");
        }
        capture = identity(candidate);
        captureState = "INVOCATION_OBSERVED";
        return view(true, "accepted");
      }
      if (type === "assign") {
        if (!capture || !ROLES.includes(data.role) || data.targetConfirmed !== true) fail();
        if (slots[data.role].binding || capture.origin !== origins[data.role] ||
            Object.values(slots).some(slot => slot.binding?.tabId === capture.tabId)) fail();
        slots[data.role].binding = capture;
        slots[data.role].state = "CONTEXT_UNVERIFIED";
        capture = null;
        captureState = "UNBOUND";
        return view(true, "accepted");
      }
      if (type === "beginObservation") {
        if (!ROLES.includes(data.role)) return view(false, "refused");
        const slot = slots[data.role];
        if (!slot.binding || slot.pending) return view(false, "refused");
        const before = metadata(data.before, origins);
        guard();
        if (!sameIdentity(before, slot.binding)) fail();
        const ticket = Object.freeze({ workerGeneration, reviewGeneration, contextGeneration,
          requestSequence: ++requestSequence });
        slot.state = "CONTEXT_UNVERIFIED";
        slot.pending = { ticket, url: before.url };
        return view(true, "accepted", ticket);
      }
      if (type === "completeObservation") {
        const slot = Object.values(slots).find(item => item.pending?.ticket === data.request);
        if (!slot) return view(false, "refused");
        const after = metadata(data.after, origins);
        guard();
        if (data.readSucceeded !== true || !sameIdentity(after, slot.binding) || slot.pending.url !== after.url) fail();
        slot.pending = null;
        slot.state = "CONTEXT_VERIFIED_READ_ONLY";
        return view(true, "accepted");
      }
      return view(false, "refused");
    } catch {
      // A malformed current transaction cannot leave a previously accepted context usable.
      if (context === entered && (capture || Object.values(slots).some(slot => slot.binding))) invalidate();
      return view(false, "refused");
    } finally {
      busy = false;
    }
  }

  return Object.freeze({ snapshot: () => view(), dispatch });
}
