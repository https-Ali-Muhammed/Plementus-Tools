import { prepareNativeBranchForm } from "./sandbox-branch-assistant.mjs";

const githubOrigin = { origins: ["https://github.com/*"] };

// Serialized into the top frame. It returns no page content.
export function inspectWorkspaceBranchPage(repository) {
  return window.top === window && location.origin === "https://github.com" &&
    location.pathname === `/${repository}/branches` && !location.search && !location.hash;
}

// Fixture-supported contract: one visible, enabled, non-submitting branch opener outside forms.
export function openNativeBranchDialog(repository) {
  try {
    if (window.top !== window || location.origin !== "https://github.com" ||
        location.pathname !== `/${repository}/branches` || location.search || location.hash) return "UNSUPPORTED_PAGE";
    const visible = element => element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility === "visible" && getComputedStyle(element).display !== "none";
    if ([...document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"]')].some(visible))
      return "UNSUPPORTED_UI";
    const actionable = button => button.isConnected && visible(button) && !button.matches(":disabled") &&
      !button.closest('form, [inert], [aria-disabled="true"], [aria-hidden="true"]') &&
      button.type === "button" &&
      button.textContent.trim().replace(/\s+/g, " ") === "New branch" &&
      !button.hasAttribute("form") && !button.hasAttribute("formaction") && !button.hasAttribute("aria-haspopup");
    const openers = [...document.querySelectorAll("button")].filter(actionable);
    if (openers.length !== 1) return "UNSUPPORTED_UI";
    if (window.top !== window || location.origin !== "https://github.com" ||
        location.pathname !== `/${repository}/branches` || location.search || location.hash ||
        !actionable(openers[0])) return "UNSUPPORTED_PAGE";
    openers[0].click();
    return "DIALOG_OPENED";
  } catch {
    return "UNSUPPORTED_UI";
  }
}

// Read-only, bounded observation of the same document after the opener click.
export function waitForNativeBranchDialog(repository, timeoutMs) {
  return new Promise(resolve => {
    const ready = () => {
      if (window.top !== window || location.origin !== "https://github.com" ||
          location.pathname !== `/${repository}/branches` || location.search || location.hash) return false;
      const visible = element => element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility === "visible" && getComputedStyle(element).display !== "none";
      return [...document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"]')].filter(visible).length === 1;
    };
    if (ready()) { resolve(true); return; }
    const observer = new MutationObserver(() => { if (ready()) finish(true); });
    const finish = value => { clearTimeout(timer); observer.disconnect(); resolve(value); };
    const timer = setTimeout(() => finish(false), timeoutMs);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  });
}

// This read proves the prepared form only at the instant it runs.
export function verifyPreparedNativeBranchForm(repository, sourceBranch, newBranch) {
  try {
    if (window.top !== window || location.origin !== "https://github.com" ||
        location.pathname !== `/${repository}/branches` || location.search || location.hash) return false;
    const visible = element => element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility === "visible" && getComputedStyle(element).display !== "none" &&
      !element.closest('[hidden], [aria-hidden="true"]');
    const dialogs = [...document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"]')]
      .filter(visible);
    if (dialogs.length !== 1) return false;
    const dialog = dialogs[0];
    const normalized = node => node.textContent.trim().replace(/\s+/g, " ");
    const headings = [...dialog.querySelectorAll("h1, h2, h3, [role=heading]")]
      .filter(visible).filter(node => ["New branch", "Create a branch"].includes(normalized(node)));
    if (headings.length !== 1) return false;
    const labels = text => [...dialog.querySelectorAll("label")]
      .filter(node => visible(node) && normalized(node) === text);
    const controls = text => labels(text).map(label => label.control).filter(Boolean);
    const eligible = control => control?.isConnected && dialog.contains(control) && visible(control) &&
      !control.matches(":disabled") && !control.readOnly &&
      !control.closest('[inert], [aria-disabled="true"]');
    const names = controls("New branch name");
    if (names.length !== 1 || !eligible(names[0]) || names[0].tagName !== "INPUT" ||
        names[0].type !== "text" || names[0].value !== newBranch) return false;
    if (normalized(headings[0]) === "New branch") {
      const sources = controls("Source branch");
      return sources.length === 1 && sources[0] !== names[0] && eligible(sources[0]) &&
        ["INPUT", "SELECT"].includes(sources[0].tagName) && sources[0].value === sourceBranch;
    }
    const pickers = [...dialog.querySelectorAll('button[id^="ref-picker-"]')].filter(visible);
    return labels("Source").length === 1 && pickers.length === 1 &&
      pickers[0] !== names[0] && eligible(pickers[0]) && pickers[0].tagName === "BUTTON" &&
      pickers[0].type === "button" && pickers[0].getAttribute("aria-haspopup") === "true" &&
      normalized(pickers[0]) === sourceBranch &&
      pickers[0].getAttribute("aria-label")?.trim().replace(/\s+/g, " ") === `${sourceBranch} branch`;
  } catch { return false; }
}

const timedOut = Symbol("timed out");
const expiredBeforeDispatch = Symbol("expired before dispatch");
const isTimeout = value => value === timedOut || value === expiredBeforeDispatch;
async function withinDeadline(call, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return expiredBeforeDispatch;
  let timer;
  try {
    return await Promise.race([
      call(),
      new Promise(resolve => { timer = setTimeout(() => resolve(timedOut), remaining); }),
    ]);
  } finally { clearTimeout(timer); }
}

function validTab(tab, id, destination) {
  return tab?.id === id && Number.isInteger(tab.windowId) && tab.windowId >= 0 &&
    tab.incognito === false && tab.status === "complete" && tab.pendingUrl == null &&
    tab.url === destination;
}

async function readyTab(api, id, destination, deadline) {
  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      api.tabs.onUpdated.removeListener(updated);
      api.tabs.onRemoved.removeListener(removed);
      resolve(value);
    };
    const check = async () => {
      try {
        const tab = await api.tabs.get(id);
        if (tab?.url && tab.url !== destination || tab?.incognito === true || tab?.pendingUrl && tab.pendingUrl !== destination)
          finish("UNSUPPORTED_PAGE");
        else if (validTab(tab, id, destination)) finish("READY");
      } catch { finish("UNSUPPORTED_PAGE"); }
    };
    const updated = tabId => { if (tabId === id) void check(); };
    const removed = tabId => { if (tabId === id) finish("UNSUPPORTED_PAGE"); };
    const timer = setTimeout(() => finish("NAVIGATION_TIMEOUT"), Math.max(0, deadline - Date.now()));
    api.tabs.onUpdated.addListener(updated);
    api.tabs.onRemoved.addListener(removed);
    void check();
  });
}

export async function prepareWorkspaceBranch({ api, review, permissionRequest, fresh, onState, timeoutMs = 15000 }) {
  const report = state => { onState(state); return state; };
  try {
    if (!fresh()) return report("STALE_PLAN");
    const granted = await permissionRequest;
    if (!fresh()) return report("STALE_PLAN");
    if (granted === "MISSING") return report("PERMISSION_MISSING");
    if (granted !== true) return report("PERMISSION_DENIED");
    // The user-facing permission prompt is outside the operation deadline.
    const deadline = Date.now() + timeoutMs;
    const available = await withinDeadline(() => api.permissions.contains(githubOrigin), deadline);
    if (!fresh()) return report("STALE_PLAN");
    if (isTimeout(available) || Date.now() >= deadline) return report("NAVIGATION_TIMEOUT");
    if (available !== true) return report("PERMISSION_MISSING");
    report("NAVIGATION_PENDING");
    let created;
    try { created = await withinDeadline(() => api.tabs.create({ url: review.destination }), deadline); }
    catch { return report(fresh() ? "NAVIGATION_UNCONFIRMED" : "STALE_PLAN"); }
    if (!fresh()) return report("STALE_PLAN");
    if (isTimeout(created) || Date.now() >= deadline) return report("NAVIGATION_TIMEOUT");
    if (!Number.isInteger(created?.id) || created.id < 0 ||
        created.url !== undefined && created.url !== review.destination ||
        created.pendingUrl !== undefined && created.pendingUrl !== review.destination)
      return report("NAVIGATION_UNCONFIRMED");
    const id = created.id;
    const readiness = await readyTab(api, id, review.destination, deadline);
    if (!fresh()) return report("STALE_PLAN");
    if (Date.now() >= deadline) return report("NAVIGATION_TIMEOUT");
    if (readiness !== "READY") return report(readiness);
    const check = async timeoutState => {
      if (!fresh()) return "STALE_PLAN";
      const permission = await withinDeadline(() => api.permissions.contains(githubOrigin), deadline);
      if (!fresh()) return "STALE_PLAN";
      if (isTimeout(permission)) return timeoutState;
      if (permission !== true) return "PERMISSION_MISSING";
      try {
        const tab = await withinDeadline(() => api.tabs.get(id), deadline);
        if (!fresh()) return "STALE_PLAN";
        if (isTimeout(tab)) return timeoutState;
        if (!validTab(tab, id, review.destination)) return "UNSUPPORTED_PAGE";
      }
      catch { return "UNSUPPORTED_PAGE"; }
      if (!fresh()) return "STALE_PLAN";
      return Date.now() >= deadline ? timeoutState : null;
    };
    let issue = await check("NAVIGATION_TIMEOUT");
    if (issue) return report(issue);
    const discovered = await withinDeadline(() => api.scripting.executeScript({
      target: { tabId: id, frameIds: [0] }, func: inspectWorkspaceBranchPage, args: [review.repository],
    }), deadline);
    if (!fresh()) return report("STALE_PLAN");
    if (isTimeout(discovered) || Date.now() >= deadline) return report("NAVIGATION_TIMEOUT");
    const first = Array.isArray(discovered) && discovered.length === 1 ? discovered[0] : null;
    if (first?.frameId !== 0 || typeof first.documentId !== "string" || !first.documentId || first.result !== true)
      return report("UNSUPPORTED_PAGE");
    const documentId = first.documentId;
    const inject = async (func, args) => {
      const results = await withinDeadline(() => api.scripting.executeScript({
        target: { tabId: id, documentIds: [documentId] }, func, args,
      }), deadline);
      if (isTimeout(results)) return results;
      const result = Array.isArray(results) && results.length === 1 ? results[0] : null;
      return result?.frameId === 0 && result.documentId === documentId ? result.result : "DOCUMENT_CHANGED";
    };
    issue = await check("NAVIGATION_TIMEOUT");
    if (issue) return report(issue);
    report("OPENING_DIALOG");
    const opened = await inject(openNativeBranchDialog, [review.repository]);
    if (!fresh()) return report("STALE_PLAN");
    if (opened === expiredBeforeDispatch) return report("NAVIGATION_TIMEOUT");
    // A timed-out injection may still complete in Chrome; no further action is dispatched.
    if (opened === timedOut) return report("PREPARATION_UNCERTAIN");
    if (opened !== "DIALOG_OPENED") return report(opened === "UNSUPPORTED_PAGE" || opened === "DOCUMENT_CHANGED" ? "UNSUPPORTED_PAGE" : "UNSUPPORTED_UI");
    issue = await check("DIALOG_TIMEOUT");
    if (issue) return report(issue);
    report("WAITING_FOR_DIALOG");
    const remaining = Math.max(0, deadline - Date.now());
    const dialog = remaining && await inject(waitForNativeBranchDialog, [review.repository, remaining]);
    if (dialog === "DOCUMENT_CHANGED") return report("UNSUPPORTED_PAGE");
    if (dialog !== true || Date.now() >= deadline)
      return report("DIALOG_TIMEOUT");
    issue = await check("DIALOG_TIMEOUT");
    if (issue) return report(issue);
    report("PREPARING_FORM");
    const prepared = await inject(prepareNativeBranchForm, [review.repository, review.sourceBranch, review.newBranch]);
    if (prepared === expiredBeforeDispatch) return report("DIALOG_TIMEOUT");
    if (prepared === timedOut) return report("PREPARATION_UNCERTAIN");
    if (prepared === "DOCUMENT_CHANGED") return report("UNSUPPORTED_PAGE");
    issue = await check("PREPARATION_UNCERTAIN");
    if (issue) return report(issue);
    if (prepared !== "FORM_PREPARED") return report("PREPARATION_UNCERTAIN");
    const final = await inject(verifyPreparedNativeBranchForm,
      [review.repository, review.sourceBranch, review.newBranch]);
    if (final === "DOCUMENT_CHANGED") return report("UNSUPPORTED_PAGE");
    if (final !== true) return report("PREPARATION_UNCERTAIN");
    issue = await check("PREPARATION_UNCERTAIN");
    if (issue) return report(issue);
    return report("FORM_PREPARED");
  } catch {
    return report(fresh() ? "PREPARATION_UNCERTAIN" : "STALE_PLAN");
  }
}
