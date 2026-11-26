import { validateSandboxBranchRequest } from "../popup/sandbox-branch-assistant.mjs";
import { prepareWorkspaceBranch, waitForCommittedBranchTab } from "../popup/workspace-branch-preparation.mjs";

export const RECORD_KEY = "sandboxPreparation.current.v1";
// Local Chrome API calls get two seconds, within the preparation engine's 15-second deadline.
export const CONTROLLER_WAIT_MS = 2000;
const timedOut = Symbol("controller wait timed out");
async function withinWait(call, waitMs) {
  let timer;
  try {
    return await Promise.race([Promise.resolve().then(call),
      new Promise(resolve => { timer = setTimeout(() => resolve(timedOut), waitMs); })]);
  } finally { clearTimeout(timer); }
}
const activeStates = new Set(["ADMITTED", "NAVIGATION_PENDING", "OPENING_DIALOG", "WAITING_FOR_DIALOG", "PREPARING_FORM"]);
const unsafeToRepeat = new Set([...activeStates, "INTERRUPTED", "PREPARATION_UNCERTAIN", "NAVIGATION_TIMEOUT", "DIALOG_TIMEOUT", "NAVIGATION_UNCONFIRMED"]);
const knownStates = new Set([...unsafeToRepeat, "FORM_PREPARED", "PERMISSION_MISSING", "PERMISSION_DENIED", "STALE_PLAN", "UNSUPPORTED_PAGE", "UNSUPPORTED_UI"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const exactKeys = (value, keys) => value && Object.getPrototypeOf(value) === Object.prototype &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export function isPreparationIdle(result) {
  return result?.ok === true && (result.record === null ||
    knownStates.has(result.record?.state) && !unsafeToRepeat.has(result.record.state));
}

export function createSandboxPreparationController(api, execute = prepareWorkspaceBranch, { waitMs = CONTROLLER_WAIT_MS, operationGate } = {}) {
  const waitLimit = Number.isFinite(waitMs) ? Math.max(1, Math.min(CONTROLLER_WAIT_MS, waitMs)) : CONTROLLER_WAIT_MS;
  let record = null;
  let unavailable = false;
  let dispatched = false;
  let uncertain = false;
  let stopped = false;
  let execution = Promise.resolve();
  let serial = Promise.resolve();
  const enqueue = work => {
    const next = serial.then(work, work);
    serial = next.catch(() => {});
    return next;
  };
  const persist = async next => {
    if (await withinWait(() => api.storage.session.set({ [RECORD_KEY]: next }), waitLimit) === timedOut) throw timedOut;
    record = next;
  };
  const initialize = (async () => {
    if (await withinWait(() => api.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }), waitLimit) === timedOut)
      throw timedOut;
    const value = await withinWait(() => api.storage.session.get(RECORD_KEY), waitLimit);
    if (value === timedOut) throw timedOut;
    const stored = value[RECORD_KEY];
    if (stored === undefined) return;
    if (!exactKeys(stored, ["operationId", "runId", "repository", "sourceBranch", "newBranch", "state", "startedAt", "updatedAt"]) ||
        !uuid.test(stored.operationId) || !uuid.test(stored.runId) ||
        validateSandboxBranchRequest({ repository: stored.repository, sourceBranch: stored.sourceBranch,
          newBranch: stored.newBranch, acknowledged: true }).state !== "PREVIEW_READY" ||
        !knownStates.has(stored.state) || !Number.isSafeInteger(stored.startedAt) || stored.startedAt < 0 ||
        !Number.isSafeInteger(stored.updatedAt) || stored.updatedAt < stored.startedAt ||
        stored.updatedAt > Date.now() + 60000) throw Error("invalid session record");
    record = stored;
    if (activeStates.has(record.state)) {
      // An earlier worker may have dispatched Chrome APIs; its state cannot be replayed.
      await persist({ ...record, state: record.state === "ADMITTED" ? "INTERRUPTED" : "PREPARATION_UNCERTAIN",
        updatedAt: Date.now() });
    }
  })().catch(() => { unavailable = true; });

  function trusted(sender) {
    if (sender?.id !== api.runtime.id || sender.origin !== api.runtime.getURL("").slice(0, -1) ||
        !Number.isInteger(sender.tab?.id) || sender.tab.id < 0 || sender.tab.incognito !== false) return false;
    try {
      const url = new URL(sender.url);
      return `${url.protocol}//${url.host}` === sender.origin && url.pathname === "/src/popup/popup.html" &&
        url.searchParams.get("workspace") === "1" &&
        [...url.searchParams.keys()].every(key => key === "workspace" || key === "handoff") &&
        url.searchParams.getAll("workspace").length === 1 && !url.hash;
    } catch { return false; }
  }

  async function handle(message, sender) {
    if (!trusted(sender)) return { ok: false, reason: "UNTRUSTED_SENDER" };
    if (!(message?.type === "SANDBOX_PREPARATION_STATUS" && exactKeys(message, ["type"]) ||
          message?.type === "SANDBOX_PREPARATION_START" && exactKeys(message,
            ["type", "operationId", "repository", "sourceBranch", "newBranch", "acknowledged"])))
      return { ok: false, reason: "MALFORMED_MESSAGE" };
    const review = message.type === "SANDBOX_PREPARATION_START" &&
      validateSandboxBranchRequest(message);
    if (review && (!uuid.test(message.operationId) || review.state !== "PREVIEW_READY"))
      return { ok: false, reason: "INVALID_OPERATION" };
    return enqueue(async () => {
      await initialize;
      if (unavailable) return { ok: false, reason: uncertain ? "PREPARATION_UNCERTAIN" : "SESSION_UNAVAILABLE" };
      if (message.type === "SANDBOX_PREPARATION_STATUS") return { ok: true, record };
      if (record?.operationId === message.operationId) {
        const same = record.repository === review.repository && record.sourceBranch === review.sourceBranch &&
          record.newBranch === review.newBranch;
        return same ? { ok: true, record, duplicate: true } : { ok: false, reason: "OPERATION_CONFLICT", record };
      }
      if (record && unsafeToRepeat.has(record.state)) return { ok: false, reason: "OPERATION_CONFLICT", record };
      let allowed;
      try { allowed = await withinWait(() => api.permissions.contains({ origins: ["https://github.com/*"] }), waitLimit); }
      catch { allowed = false; }
      if (allowed === timedOut) { unavailable = true; return { ok: false, reason: "SESSION_UNAVAILABLE" }; }
      if (allowed !== true) return { ok: false, reason: "PERMISSION_MISSING" };
      // Acquire after validation/permission, before any admission checkpoint.
      // Only the installed worker provides the shared gate; isolated fixtures
      // and the reviewed coordinator's internal controller already own a slot.
      const release = operationGate ? await operationGate.acquire("ordinary", sender) : () => {};
      if (!release) return { ok: false, reason: "OPERATION_CONFLICT" };
      const now = Date.now();
      const next = { operationId: message.operationId, runId: crypto.randomUUID(),
        repository: review.repository, sourceBranch: review.sourceBranch, newBranch: review.newBranch,
        state: "ADMITTED", startedAt: now, updatedAt: now };
      try { await persist(next); }
      catch { unavailable = true; release(); return { ok: false, reason: "SESSION_UNAVAILABLE" }; }
      stopped = false;
      dispatched = false;
      uncertain = false;
      execution = Promise.resolve().then(async () => {
        let checkpoint = Promise.resolve(true);
        let completed = false;
        let blockedReason = null;
        const deadline = Date.now() + 15000;
        const block = reason => { blockedReason = reason; throw Error(reason); };
        const current = () => {
          if (stopped || unavailable || completed || blockedReason || record?.runId !== next.runId)
            throw Error("persistence checkpoint unavailable");
          if (Date.now() >= deadline) block(dispatched ? "PREPARATION_UNCERTAIN" : "NAVIGATION_TIMEOUT");
        };
        const guard = async target => {
          if (!await checkpoint) throw Error("persistence checkpoint unavailable");
          current();
          if (target) {
            const readiness = await waitForCommittedBranchTab({ api, id: target.tabId,
              destination: review.destination, deadline, readTimeoutMs: waitLimit,
              fresh: () => !stopped && !unavailable && !completed && !blockedReason && record?.runId === next.runId,
              // The wait is permitted only for a script already bound to a captured document.
              allowLoading: Array.isArray(target.documentIds) && target.documentIds.length === 1 });
            current();
            if (readiness.state === "TIMEOUT") block(dispatched ? "PREPARATION_UNCERTAIN" : "NAVIGATION_TIMEOUT");
            if (readiness.state !== "READY") block("UNSUPPORTED_PAGE");
          }
          let permission;
          try { permission = await withinWait(() => api.permissions.contains({ origins: ["https://github.com/*"] }),
            Math.max(1, Math.min(waitLimit, deadline - Date.now()))); }
          catch { permission = false; }
          current();
          if (permission === timedOut) block(dispatched ? "PREPARATION_UNCERTAIN" : "NAVIGATION_TIMEOUT");
          if (permission !== true) block("PERMISSION_MISSING");
          current();
        };
        const controlledApi = {
          permissions: api.permissions,
          tabs: { get: id => api.tabs.get(id), onUpdated: api.tabs?.onUpdated, onRemoved: api.tabs?.onRemoved,
            create: async options => { await guard(); dispatched = true; return api.tabs.create(options); } },
          scripting: { executeScript: async options => {
            await guard(options.target); dispatched = true; return api.scripting.executeScript(options);
          } },
        };
        const progress = state => {
          if (stopped || blockedReason || record?.runId !== next.runId || !activeStates.has(record.state)) return;
          checkpoint = enqueue(async () => {
            if (stopped || record?.runId !== next.runId || !activeStates.has(record.state)) return false;
            try { await persist({ ...record, state, updatedAt: Date.now() }); return true; }
            catch (error) {
              stopped = true;
              if (error === timedOut) { unavailable = true; uncertain = dispatched; }
              else {
                try { await persist({ ...record, state: "PREPARATION_UNCERTAIN", updatedAt: Date.now() }); }
                catch { unavailable = true; uncertain = dispatched; }
              }
              return false;
            }
          });
        };
        const result = await execute({ api: controlledApi, review, permissionRequest: Promise.resolve(true),
          fresh: () => !stopped && !unavailable && !blockedReason && record?.runId === next.runId, onState: progress });
        completed = true;
        await serial;
        if ((!stopped || blockedReason) && record?.runId === next.runId && activeStates.has(record.state)) {
          try { await enqueue(() => persist({ ...record, state: blockedReason || result, updatedAt: Date.now() })); }
          catch (error) {
            stopped = true;
            if (error === timedOut) { unavailable = true; uncertain = dispatched; }
            else {
              try { await enqueue(() => persist({ ...record, state: "PREPARATION_UNCERTAIN", updatedAt: Date.now() })); }
              catch { unavailable = true; uncertain = dispatched; }
            }
          }
        }
      }).catch(async () => {
        stopped = true;
        if (record?.runId !== next.runId || !activeStates.has(record.state)) return;
        try { await enqueue(() => persist({ ...record, state: "PREPARATION_UNCERTAIN", updatedAt: Date.now() })); }
        catch { unavailable = true; uncertain = dispatched; }
      }).finally(release);
      return { ok: true, record: next };
    });
  }
  return { handle, idle: async () => { await execution; await serial; } };
}
