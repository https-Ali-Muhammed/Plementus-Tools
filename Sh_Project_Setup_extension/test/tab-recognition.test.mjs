import test from "node:test";
import assert from "node:assert/strict";
import { recognizeTabs } from "../src/browser/tab-recognition.mjs";

const fixture = () => {
  const tabs = ["https://plementus.example/projects", "https://github.com/fixture-org", "https://odoo-sh.example/projects"]
    .map((url, index) => ({ id: index + 1, url, documentId: `fixture-document-${index + 1}`,
      permission: "granted", accessible: true, status: "complete", pendingNavigation: false }));
  return {
    expectedOrigins: { plementus: "https://plementus.example", github: "https://github.com", "odoo-sh": "https://odoo-sh.example" },
    selectionSnapshot: { epoch: "fixture-context-1", tabs },
    currentSnapshot: { epoch: "fixture-context-1", tabs: structuredClone(tabs) },
    selections: [{ role: "plementus", tabId: 1 }, { role: "github", tabId: 2 }, { role: "odoo-sh", tabId: 3 }],
  };
};
const expected = decision => ({ decision, selections: decision === "selection_bound"
  ? [{ role: "plementus", tabId: 1 }, { role: "github", tabId: 2 }, { role: "odoo-sh", tabId: 3 }] : [],
  accountVerified: false, executionAuthorized: false, evidenceTier: "OFFLINE_SIMULATED" });
const refuses = (change, decision = "blocked") => {
  const input = fixture(); change(input);
  assert.deepEqual(recognizeTabs(input), expected(decision));
};

test("explicit choices bind three fixture tabs without account or execution authority", () => {
  assert.deepEqual(recognizeTabs(fixture()), expected("selection_bound"));
});

test("selection order and inventory order do not choose or misassign roles", () => {
  const input = fixture(); input.selections.reverse(); input.currentSnapshot.tabs.reverse();
  assert.deepEqual(recognizeTabs(input), expected("selection_bound"));
});

test("missing choices never select the first or sole matching candidate", () => {
  for (const selections of [null, [], [{ role: "github", tabId: 2 }]]) refuses(f => { f.selections = selections; });
});

test("duplicate roles, extra choices, unknown roles and reused tabs fail", () => {
  for (const change of [f => { f.selections[1].role = "plementus"; },
    f => { f.selections.push({ role: "github", tabId: 2 }); },
    f => { f.selections[1].role = "customer-odoo"; },
    f => { f.selections[1].tabId = 1; }]) refuses(change);
});

test("missing, wrong-role and closed tabs return no partial bindings", () => {
  for (const change of [f => { f.selections[1].tabId = 4; },
    f => { f.selections[1].tabId = 3; f.selections[2].tabId = 2; },
    f => { f.currentSnapshot.tabs.splice(1, 1); },
    f => { f.selectionSnapshot.tabs.splice(1, 1); }]) refuses(change);
});

test("duplicate candidate IDs fail in either observation even if data is identical", () => {
  for (const snapshot of ["selectionSnapshot", "currentSnapshot"]) {
    refuses(f => { f[snapshot].tabs.push({ ...f[snapshot].tabs[1] }); });
    refuses(f => { f[snapshot].tabs.push({ ...f[snapshot].tabs[1], url: "https://github.com/other-fixture" }); });
  }
});

test("duplicate-origin matches require an explicit tab choice and never automatic matching", () => {
  const input = fixture();
  for (const name of ["selectionSnapshot", "currentSnapshot"]) input[name].tabs.push({
    ...input[name].tabs[1], id: 4, documentId: "fixture-document-4", url: "https://github.com/other-fixture" });
  input.selections[1].tabId = 4;
  const result = recognizeTabs(input);
  assert.deepEqual(result, { ...expected("selection_bound"), selections: [
    { role: "plementus", tabId: 1 }, { role: "github", tabId: 4 }, { role: "odoo-sh", tabId: 3 }] });
  input.selections.splice(1, 1);
  assert.deepEqual(recognizeTabs(input), expected("blocked"));
});

test("denied or removed permission and inaccessible selections fail in either observation", () => {
  for (const snapshot of ["selectionSnapshot", "currentSnapshot"]) {
    refuses(f => { f[snapshot].tabs[1].permission = "denied"; });
    refuses(f => { f[snapshot].tabs[1].accessible = false; });
  }
});

test("unavailable URL, document or permission observations remain unknown", () => {
  for (const snapshot of ["selectionSnapshot", "currentSnapshot"]) {
    for (const [key, value] of [["url", null], ["url", undefined], ["url", ""],
      ["documentId", null], ["permission", "unknown"], ["permission", null], ["permission", undefined]]) {
      refuses(f => { f[snapshot].tabs[1][key] = value; }, "unknown");
    }
    for (const key of ["url", "permission", "documentId"]) refuses(f => { delete f[snapshot].tabs[1][key]; }, "unknown");
  }
});

test("missing prior metadata cannot hide current permission denial", () => {
  for (const key of ["url", "documentId", "permission"]) refuses(f => {
    delete f.selectionSnapshot.tabs[0][key];
    f.currentSnapshot.tabs[0].permission = "denied";
  });
});

test("unavailable selected fields cannot hide malformed metadata or known URL/document drift", () => {
  for (const snapshot of ["selectionSnapshot", "currentSnapshot"]) {
    for (const documentId of ["", "malformed", 1, {}, "fixture-document-10000"]) refuses(f => {
      delete f[snapshot].tabs[0].url;
      f[snapshot].tabs[0].documentId = documentId;
    });
    refuses(f => { delete f[snapshot].tabs[0].documentId; f[snapshot].tabs[0].url = "not-a-url"; });
    refuses(f => { delete f[snapshot].tabs[0].url; f[snapshot].tabs[0].permission = true; });
    refuses(f => { delete f[snapshot].tabs[0].permission; f[snapshot].tabs[0].url = "https://wrong.example/"; });
    for (const missing of ["url", "permission"]) refuses(f => {
      delete f[snapshot].tabs[0][missing];
      f.currentSnapshot.tabs[0].documentId = "fixture-document-4";
    });
    for (const missing of ["documentId", "permission"]) refuses(f => {
      delete f[snapshot].tabs[0][missing];
      f.currentSnapshot.tabs[0].url = "https://plementus.example/changed";
    });
  }
});

test("missing earlier-role metadata cannot hide another selected role's hard failure", () => {
  for (const missingSnapshot of ["selectionSnapshot", "currentSnapshot"]) {
    for (const invalidSnapshot of ["selectionSnapshot", "currentSnapshot"]) {
      for (const change of [f => { f[invalidSnapshot].tabs[1].permission = "denied"; },
        f => { f[invalidSnapshot].tabs[2].accessible = false; },
        f => { f[invalidSnapshot].tabs[2].pendingNavigation = true; },
        f => { f[invalidSnapshot].tabs[2].status = "loading"; },
        f => { f[invalidSnapshot].tabs.splice(2, 1); },
        f => { f[invalidSnapshot].tabs[2].url = "https://wrong.example/"; }]) refuses(f => {
        delete f[missingSnapshot].tabs[0].url;
        change(f);
      });
    }
  }
});

test("incorrect exact origins, lookalikes, ports and unsupported schemes fail", () => {
  for (const url of ["https://github.com.lookalike.example/fixture", "https://github.example/fixture",
    "https://github.com:444/fixture", "http://github.com/fixture", "file:///fixture", "about:blank",
    "chrome://settings/", "data:text/plain,fixture", "javascript:void(0)", "not-a-url",
    "https://fixture@github.com/fixture", "https://github.com@lookalike.example/fixture"]) {
    refuses(f => { f.currentSnapshot.tabs[1].url = url; f.selectionSnapshot.tabs[1].url = url; });
  }
});

test("URL normalization, whitespace, controls and empty userinfo cannot hide a different URL", () => {
  for (const url of [" https://github.com/fixture", "https://GITHUB.com/fixture", "https://github.com/a/../fixture",
    "https://github.com/fi\nxture", "https://@github.com/fixture", "https://github.com:443/fixture"]) {
    refuses(f => { f.currentSnapshot.tabs[1].url = url; f.selectionSnapshot.tabs[1].url = url; });
  }
});

test("same-origin path, query and fragment changes invalidate selected observations", () => {
  for (const url of ["https://github.com/other-fixture", "https://github.com/fixture-org?view=fixture",
    "https://github.com/fixture-org#fixture"]) refuses(f => { f.currentSnapshot.tabs[1].url = url; });
});

test("reload, replacement and document changes fail even at the same URL", () => {
  refuses(f => { f.currentSnapshot.tabs[1].documentId = "fixture-document-4"; });
  refuses(f => { f.currentSnapshot.tabs[1].id = 4; });
});

test("pending or incomplete navigation blocks even with an unchanged committed URL", () => {
  for (const snapshot of ["selectionSnapshot", "currentSnapshot"]) {
    refuses(f => { f[snapshot].tabs[1].pendingNavigation = true; });
    for (const status of ["loading", "unloaded"]) refuses(f => { f[snapshot].tabs[1].status = status; });
  }
});

test("changed context markers model stale selection after popup loss or worker restart", () => {
  refuses(f => { f.currentSnapshot.epoch = "fixture-context-2"; });
  refuses(f => { f.currentSnapshot = null; });
  refuses(f => { f.selectionSnapshot = null; });
});

test("wrong-account and signed-out states cannot be distinguished from these observations", () => {
  // Same origin/URL can show any account; no account observation or authority is supplied.
  const input = fixture();
  assert.deepEqual(recognizeTabs(input), expected("selection_bound"));
  assert.equal(recognizeTabs(input).accountVerified, false);
  refuses(f => { f.currentSnapshot.tabs[1].accountVerified = true; });
});

test("fixture origin configuration must be explicit, distinct and restricted to synthetic hosts", () => {
  for (const change of [f => { delete f.expectedOrigins; }, f => { delete f.expectedOrigins.github; },
    f => { f.expectedOrigins.plementus = "https://real.invalid"; },
    f => { f.expectedOrigins.plementus = "https://example.com"; },
    f => { f.expectedOrigins.plementus = "https://plementus.example/"; },
    f => { f.expectedOrigins.plementus = "http://plementus.example"; },
    f => { f.expectedOrigins.plementus = "https://fixture@plementus.example"; },
    f => { f.expectedOrigins.github = "https://other.example"; },
    f => { f.expectedOrigins["odoo-sh"] = f.expectedOrigins.plementus; }]) refuses(change);
});

test("configured fixture ports match exactly without broadening the allowed origin", () => {
  const input = fixture(); input.expectedOrigins.plementus = "https://portal.example:8443";
  for (const name of ["selectionSnapshot", "currentSnapshot"]) input[name].tabs[0].url = "https://portal.example:8443/projects";
  assert.deepEqual(recognizeTabs(input), expected("selection_bound"));
  input.currentSnapshot.tabs[0].url = "https://portal.example/projects";
  assert.deepEqual(recognizeTabs(input), expected("blocked"));
});

test("origin objects are rejected without coercing caller-supplied code", () => {
  let calls = 0;
  const input = fixture();
  input.expectedOrigins.plementus = { toString() { calls++; return "https://plementus.example"; } };
  assert.deepEqual(recognizeTabs(input), expected("blocked"));
  assert.equal(calls, 0);
});

test("candidate inventory is dense and bounded at 32 with a valid upper boundary", () => {
  const input = fixture();
  for (const name of ["selectionSnapshot", "currentSnapshot"]) {
    for (let id = 4; id <= 32; id++) input[name].tabs.push({ ...input[name].tabs[0],
      id, documentId: `fixture-document-${id}`, url: `https://unrelated.example/fixture-${id}` });
  }
  assert.deepEqual(recognizeTabs(input), expected("selection_bound"));
  input.currentSnapshot.tabs.push({ ...input.currentSnapshot.tabs[0], id: 33 });
  assert.deepEqual(recognizeTabs(input), expected("blocked"));
  for (const tabs of [[], null, new Array(3)]) refuses(f => { f.currentSnapshot.tabs = tabs; });
});

test("tab IDs, synthetic document IDs, context IDs and URL lengths are validated without coercion", () => {
  for (const value of [-1, 0, 1.5, "2", NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    refuses(f => { f.currentSnapshot.tabs[1].id = value; });
    refuses(f => { f.selections[1].tabId = value; });
  }
  for (const value of ["", "customer-document", {}, 1, "fixture-document-10000"]) refuses(f => { f.currentSnapshot.tabs[1].documentId = value; });
  for (const value of [null, "", "customer-context", 1]) refuses(f => { f.currentSnapshot.epoch = value; });
  refuses(f => { f.currentSnapshot.tabs[1].url = `https://github.com/${"x".repeat(2048)}`; });
});

test("unexpected fields, malformed flags and exotic objects fail with generic decisions", () => {
  for (const input of [null, {}, [], new Date(), Object.create(null)]) assert.deepEqual(recognizeTabs(input), expected("blocked"));
  for (const change of [f => { f.execute = () => assert.fail("must not execute"); },
    f => { f.currentSnapshot.extra = true; }, f => { f.selections[0].title = "invented fixture"; },
    f => { f.currentSnapshot.tabs[1].permission = true; }, f => { f.currentSnapshot.tabs[1].accessible = "true"; },
    f => { f.currentSnapshot.tabs[1].pendingNavigation = "false"; },
    f => { f.currentSnapshot.tabs[1].status = "invented"; }]) refuses(change);
});

test("accessors, hidden fields, symbols and array additions are rejected without reading getters", () => {
  let calls = 0;
  for (const change of [f => { Object.defineProperty(f.currentSnapshot.tabs[1], "url", { enumerable: true, get() { calls++; return "https://github.com/fixture-org"; } }); },
    f => { Object.defineProperty(f, "extra", { value: true }); },
    f => { f[Symbol("fixture")] = true; },
    f => { f.currentSnapshot.tabs.extra = true; },
    f => { Object.defineProperty(f.currentSnapshot.tabs, "1", { enumerable: true, get() { calls++; return {}; } }); }]) refuses(change);
  assert.equal(calls, 0);
});

test("reflection exceptions cannot escape or expose raw diagnostics", () => {
  const input = new Proxy({}, { getPrototypeOf() { throw new Error("invented fixture diagnostic"); } });
  assert.deepEqual(recognizeTabs(input), expected("blocked"));
});

test("decisions and nested bindings are frozen, minimal and independent of input mutation", () => {
  const input = fixture(); const result = recognizeTabs(input);
  assert.deepEqual(result, expected("selection_bound"));
  assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.selections));
  for (const selection of result.selections) assert.ok(Object.isFrozen(selection));
  assert.throws(() => { result.executionAuthorized = true; }, TypeError);
  assert.throws(() => { result.selections[0].tabId = 9; }, TypeError);
  input.selections[0].tabId = 9;
  assert.deepEqual(result, expected("selection_bound"));
  assert.deepEqual(recognizeTabs(input), expected("blocked"));
  assert.ok(Object.isFrozen(recognizeTabs(input).selections));
});

test("frozen inputs are unchanged and deterministic evaluation has no durable replay claim", () => {
  const input = fixture(); const before = structuredClone(input);
  const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } };
  freeze(input);
  assert.deepEqual(recognizeTabs(input), expected("selection_bound"));
  assert.deepEqual(recognizeTabs(structuredClone(before)), expected("selection_bound"));
  assert.deepEqual(input, before);
});
