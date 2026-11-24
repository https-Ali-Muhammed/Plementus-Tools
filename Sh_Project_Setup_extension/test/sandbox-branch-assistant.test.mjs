import assert from "node:assert/strict";
import test from "node:test";
import { validateSandboxBranchRequest, matchesSandboxBranchesTab } from "../src/popup/sandbox-branch-assistant.mjs";

const valid = { repository: "fixture-owner/disposable-repo", sourceBranch: "main",
  newBranch: "plementus-mvp-check-1", acknowledged: true };

test("requires an exact disposable sandbox and an explicit acknowledgment", () => {
  assert.equal(validateSandboxBranchRequest(valid).state, "PREVIEW_READY");
  for (const repository of ["", "fixture-owner", "https://github.com/fixture-owner/disposable-repo",
    "fixture-owner/disposable-repo?token=secret", "microsoft/vscode", "MICROSOFT/VSCODE",
    "https-Ali-Muhammed/Plementus-Tools", "fixture-owner/..", "fixture-owner/repo.git"]) {
    assert.equal(validateSandboxBranchRequest({ ...valid, repository }).state, "NOT_CONFIGURED", repository);
  }
  assert.equal(validateSandboxBranchRequest({ ...valid, acknowledged: false }).state, "NOT_CONFIGURED");
});

test("validates both branch names and keeps source distinct from target", () => {
  for (const sourceBranch of ["", "../main", "main..old", "main//old", "main.lock", "main?token=x"]) {
    assert.equal(validateSandboxBranchRequest({ ...valid, sourceBranch }).state, "NOT_CONFIGURED");
  }
  for (const newBranch of ["main", "plementus-mvp-", "plementus-mvp-.bad",
    "plementus-mvp-test/other", "plementus-mvp-test..bad", "plementus-mvp-X",
    `plementus-mvp-${"a".repeat(60)}`]) {
    assert.equal(validateSandboxBranchRequest({ ...valid, newBranch }).state, "NOT_CONFIGURED");
  }
  assert.equal(validateSandboxBranchRequest({ ...valid, sourceBranch: valid.newBranch }).state, "NOT_CONFIGURED");
});

test("preview constructs only the canonical GitHub branches page", () => {
  assert.deepEqual(validateSandboxBranchRequest(valid), {
    state: "PREVIEW_READY", repository: valid.repository, sourceBranch: "main",
    newBranch: valid.newBranch, destination: "https://github.com/fixture-owner/disposable-repo/branches",
  });
});

test("matches only a complete active tab on the exact reviewed page", () => {
  const tab = { id: 7, windowId: 2, active: true, incognito: false, status: "complete",
    url: "https://github.com/fixture-owner/disposable-repo/branches" };
  assert.equal(matchesSandboxBranchesTab(tab, valid.repository), true);
  for (const url of ["https://github.com.evil.test/fixture-owner/disposable-repo/branches",
    "http://github.com/fixture-owner/disposable-repo/branches",
    "https://github.com/fixture-owner/other/branches",
    "https://github.com/fixture-owner/disposable-repo/branches?x=1",
    "https://github.com/fixture-owner/disposable-repo/branches#new",
    "https://github.com/fixture-owner/disposable-repo/branches/"]) {
    assert.equal(matchesSandboxBranchesTab({ ...tab, url }, valid.repository), false, url);
  }
  assert.equal(matchesSandboxBranchesTab({ ...tab, pendingUrl: tab.url }, valid.repository), false);
});
