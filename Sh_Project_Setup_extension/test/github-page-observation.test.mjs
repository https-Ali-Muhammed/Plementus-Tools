import assert from "node:assert/strict";
import { test } from "node:test";
import { readGithubPage, validateGithubPageResult, sameGithubTab } from "../src/popup/github-page-observation.mjs";

const tab = (url = "https://github.com/microsoft/vscode?token=secret#fragment") => ({
  id: 7, windowId: 2, active: true, incognito: false, status: "complete", url,
});
const reviewed = { id: 7, windowId: 2, url: tab().url, repositoryCandidate: "microsoft/vscode" };

function withDocument(url, title, heading, callback) {
  const oldLocation = globalThis.location;
  const oldDocument = globalThis.document;
  globalThis.location = new URL(url);
  globalThis.document = {
    title,
    querySelector: selector => selector === "#repository-container-header h1" && heading != null
      ? { textContent: heading } : null,
  };
  try { return callback(); } finally {
    if (oldLocation === undefined) delete globalThis.location;
    else globalThis.location = oldLocation;
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
}

test("reader returns only bounded title and matching repository heading", () => {
  const result = withDocument("https://github.com/microsoft/vscode?token=secret#fragment",
    "  microsoft/vscode:   Code   ", " microsoft / vscode ",
    () => readGithubPage("microsoft/vscode"));
  assert.deepEqual(result, {
    origin: "https://github.com", repositoryCandidate: "microsoft/vscode",
    title: "microsoft/vscode: Code", heading: "microsoft / vscode",
  });
  assert.equal(JSON.stringify(result).includes("secret"), false);
  assert.deepEqual(validateGithubPageResult(result, "microsoft/vscode"), result);
});

test("reader leaves uncertain heading undetermined", () => {
  const result = withDocument("https://github.com/microsoft/vscode", "Code", "other / repo",
    () => readGithubPage("microsoft/vscode"));
  assert.equal(result.heading, null);
  assert.equal(validateGithubPageResult(result, "microsoft/vscode").heading, null);
});

test("reader rejects a decoded percent-encoded fragment echoed by the title", () => {
  const result = withDocument("https://github.com/microsoft/vscode#private%2Dtoken", "private-token", null,
    () => readGithubPage("microsoft/vscode"));
  assert.equal(result, null);
});

test("reader rejects a long fragment echoed before title truncation", () => {
  const fragment = "x".repeat(200);
  const result = withDocument(`https://github.com/microsoft/vscode#${fragment}`, fragment, null,
    () => readGithubPage("microsoft/vscode"));
  assert.equal(result, null);
});

test("reader allows a normal title when a tracking query is present", () => {
  const result = withDocument("https://github.com/microsoft/vscode?utm_source=chatgpt.com",
    "microsoft/vscode: Code", null, () => readGithubPage("microsoft/vscode"));
  assert.equal(result.title, "microsoft/vscode: Code");
});

test("reader rejects wrong origin, path, missing document data and title echoes of URL secrets", () => {
  for (const [url, title] of [
    ["https://github.com.evil.test/microsoft/vscode", "Code"],
    ["https://github.com/microsoft/other", "Code"],
    ["https://github.com/microsoft/vscode?token=secret", "secret"],
    ["https://github.com/microsoft/vscode?token=xy", "xy"],
    ["https://github.com/microsoft/vscode", ""],
  ]) {
    assert.equal(withDocument(url, title, null, () => readGithubPage("microsoft/vscode")), null);
  }
});

test("validator rejects malformed, mismatched and overlong results", () => {
  const good = { origin: "https://github.com", repositoryCandidate: "microsoft/vscode", title: "Code", heading: null };
  assert.equal(validateGithubPageResult({ ...good, origin: "https://github.com.evil.test" }, "microsoft/vscode"), null);
  assert.equal(validateGithubPageResult({ ...good, repositoryCandidate: "microsoft/other" }, "microsoft/vscode"), null);
  assert.equal(validateGithubPageResult({ ...good, title: "x".repeat(161) }, "microsoft/vscode"), null);
  assert.equal(validateGithubPageResult({ ...good, title: "Code", heading: "other / repo" }, "microsoft/vscode"), null);
  assert.equal(validateGithubPageResult({ ...good, access: true }, "microsoft/vscode"), null);
  assert.equal(validateGithubPageResult({ ...good, executed: true }, "microsoft/vscode"), null);
  assert.equal(validateGithubPageResult({ ...good, url: "https://github.com/microsoft/vscode?token=secret" }, "microsoft/vscode"), null);
  assert.equal(validateGithubPageResult(null, "microsoft/vscode"), null);
});

test("selected tab must retain identity, metadata, origin and candidate", () => {
  assert.equal(sameGithubTab(tab(), reviewed), true);
  for (const changed of [
    { ...tab(), id: 8 }, { ...tab(), windowId: 3 },
    { ...tab(), status: "loading" }, { ...tab(), pendingUrl: "https://github.com/other/repo" },
    tab("https://example.com/microsoft/vscode"), tab("https://github.com/microsoft/other"),
    tab("https://github.com/microsoft/vscode?token=changed#fragment"),
  ]) assert.equal(sameGithubTab(changed, reviewed), false);
});
