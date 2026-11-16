import assert from "node:assert/strict";
import { test } from "node:test";
import { assessTabObservation } from "../src/popup/tab-observation.mjs";

const tab = url => ({ id: 7, windowId: 2, active: true, incognito: false, status: "complete", url });

test("identifies only the exact HTTPS GitHub origin", () => {
  assert.deepEqual(assessTabObservation(tab("https://github.com")), { state: "github", repositoryCandidate: null });
  for (const url of ["http://github.com/acme/tools", "https://github.com.evil.test/acme/tools",
    "https://notgithub.com/acme/tools", "https://github.com:444/acme/tools",
    "chrome-extension://abc/popup.html", "https://user:secret@github.com/acme/tools"]) {
    assert.deepEqual(assessTabObservation(tab(url)), { state: "unsupported" }, url);
  }
});

test("offers only a safe conventional owner/repository candidate", () => {
  for (const url of ["https://github.com/acme/tools", "https://github.com/acme/tools/?token=secret#fragment"]) {
    assert.deepEqual(assessTabObservation(tab(url)), { state: "github", repositoryCandidate: "acme/tools" });
  }
  for (const url of ["https://github.com/", "https://github.com/acme",
    "https://github.com/acme/tools/tree/main", "https://github.com/%61cme/tools",
    "https://github.com/acme/bad%2Fname", "https://github.com/-acme/tools",
    "https://github.com/acme/..", "https://github.com/settings/profile"]) {
    assert.deepEqual(assessTabObservation(tab(url)), { state: "github", repositoryCandidate: null }, url);
  }
});

test("rejects missing, stale, private and pending tab metadata", () => {
  const valid = tab("https://github.com/acme/tools");
  for (const value of [undefined, {}, { ...valid, active: false }, { ...valid, incognito: true },
    { ...valid, incognito: undefined }, { ...valid, status: "loading" },
    { ...valid, pendingUrl: "https://example.test" }, { ...valid, url: undefined },
    { ...valid, id: undefined }, { ...valid, windowId: undefined }]) {
    assert.deepEqual(assessTabObservation(value), { state: "access-unavailable" });
  }
});

test("returns no authority, persistence data, or provider operation", () => {
  const result = assessTabObservation(tab("https://github.com/acme/tools?token=secret#fragment"));
  assert.deepEqual(result, { state: "github", repositoryCandidate: "acme/tools" });
  assert.equal(JSON.stringify(result).includes("secret"), false);
});
