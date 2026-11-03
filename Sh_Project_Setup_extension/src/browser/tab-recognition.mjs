const roles = ["plementus", "github", "odoo-sh"];
const unknown = Symbol("unknown");
function fail() { throw new Error("Tab recognition unavailable"); }

function record(value, required, optional = []) {
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) fail();
  const keys = Reflect.ownKeys(value);
  if (keys.length > required.length + optional.length || required.some(key => !keys.includes(key))) fail();
  return Object.fromEntries(keys.map(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!required.includes(key) && !optional.includes(key)) fail();
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) fail();
    return [key, descriptor.value];
  }));
}

function list(value, maximum) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const length = descriptors.length.value;
  if (length < 1 || length > maximum || Reflect.ownKeys(descriptors).length !== length + 1) fail();
  return Array.from({ length }, (_, index) => {
    const descriptor = descriptors[index];
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) fail();
    return descriptor.value;
  });
}

function httpsUrl(value) {
  if (typeof value !== "string" || value.length > 2048) fail();
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.href !== value) fail();
  return url;
}

function snapshot(value) {
  const data = record(value, ["epoch", "tabs"]);
  if (typeof data.epoch !== "string" || !/^fixture-context-[1-9][0-9]{0,3}$/.test(data.epoch)) fail();
  const tabs = new Map();
  for (const item of list(data.tabs, 32)) {
    const tab = record(item, ["id", "accessible", "status", "pendingNavigation"], ["url", "permission", "documentId"]);
    if (!Number.isSafeInteger(tab.id) || tab.id < 1 || tabs.has(tab.id) || typeof tab.accessible !== "boolean" ||
        typeof tab.pendingNavigation !== "boolean" || !["complete", "loading", "unloaded"].includes(tab.status)) fail();
    tabs.set(tab.id, tab);
  }
  return { epoch: data.epoch, tabs };
}

const decision = (state, selections = []) => Object.freeze({ decision: state,
  selections: Object.freeze(selections.map(selection => Object.freeze(selection))),
  accountVerified: false, executionAuthorized: false, evidenceTier: "OFFLINE_SIMULATED" });

// Caller-supplied snapshots model freshness only; this disconnected evaluator has no runtime authority.
export function recognizeTabs(input) {
  try {
    const data = record(input, ["expectedOrigins", "selectionSnapshot", "currentSnapshot", "selections"]);
    const origins = record(data.expectedOrigins, roles);
    for (const role of roles) {
      const origin = origins[role];
      if (typeof origin !== "string") fail();
      const url = httpsUrl(`${origin}/`);
      if (url.origin !== origin || (role === "github" ? origin !== "https://github.com" : !url.hostname.endsWith(".example"))) fail();
    }
    if (new Set(Object.values(origins)).size !== roles.length) fail();
    const selected = snapshot(data.selectionSnapshot);
    const current = snapshot(data.currentSnapshot);
    if (selected.epoch !== current.epoch) fail();
    const selections = list(data.selections, 3).map(item => record(item, ["role", "tabId"]));
    if (selections.length !== 3 || new Set(selections.map(item => item.role)).size !== 3 ||
        new Set(selections.map(item => item.tabId)).size !== 3 || selections.some(item =>
          !roles.includes(item.role) || !Number.isSafeInteger(item.tabId) || item.tabId < 1)) fail();
    const bindings = [];
    let metadataUnavailable = false;
    for (const role of roles) {
      const { tabId } = selections.find(item => item.role === role);
      const before = selected.tabs.get(tabId);
      const after = current.tabs.get(tabId);
      if (!before || !after) fail();
      for (const tab of [before, after]) {
        if (!tab.accessible || tab.pendingNavigation || tab.status !== "complete" || tab.permission === "denied") fail();
        if (tab.url == null || tab.url === "") metadataUnavailable = true;
        else if (httpsUrl(tab.url).origin !== origins[role]) fail();
        if (tab.documentId == null) metadataUnavailable = true;
        else if (typeof tab.documentId !== "string" || !/^fixture-document-[1-9][0-9]{0,3}$/.test(tab.documentId)) fail();
        if (tab.permission == null || tab.permission === "unknown") metadataUnavailable = true;
        else if (tab.permission !== "granted") fail();
      }
      if ((before.url != null && before.url !== "" && after.url != null && after.url !== "" && before.url !== after.url) ||
          (before.documentId != null && after.documentId != null && before.documentId !== after.documentId)) fail();
      bindings.push({ role, tabId });
    }
    if (metadataUnavailable) throw unknown;
    return decision("selection_bound", bindings);
  } catch (error) {
    return decision(error === unknown ? "unknown" : "blocked");
  }
}
