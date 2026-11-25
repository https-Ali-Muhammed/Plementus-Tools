import assert from "node:assert/strict";
import { test } from "node:test";
import { reviewWorkspaceBranch } from "../src/popup/workspace-branch-navigation.mjs";

const plan = { github: { organization: "fixture-owner", repository: "disposable-repo", mode: "existing" },
  branches: { production: "main", staging: "plementus-mvp-check-1" },
  projectName: "private customer", subscriptionReference: "secret" };

test("derives only the exact sandbox operation from the reviewed plan", () => {
  assert.deepEqual(reviewWorkspaceBranch(plan, true), {
    state: "PREVIEW_READY", errors: {}, repository: "fixture-owner/disposable-repo",
    sourceBranch: "main", newBranch: "plementus-mvp-check-1",
    destination: "https://github.com/fixture-owner/disposable-repo/branches",
  });
});

test("requires an existing disposable sandbox and valid distinct branches", () => {
  for (const [change, field] of [
    [{ github: { ...plan.github, mode: "new" } }, "mode"],
    [{ github: { ...plan.github, organization: "" } }, "repository"],
    [{ github: { ...plan.github, repository: "" } }, "repository"],
    [{ github: { ...plan.github, organization: "https-Ali-Muhammed", repository: "Plementus-Tools" } }, "repository"],
    [{ branches: { ...plan.branches, production: "bad..source" } }, "sourceBranch"],
    [{ branches: { ...plan.branches, production: "" } }, "sourceBranch"],
    [{ branches: { ...plan.branches, staging: "develop" } }, "newBranch"],
    [{ branches: { ...plan.branches, staging: "" } }, "newBranch"],
    [{ branches: { production: "main", staging: "main" } }, "newBranch"],
  ]) {
    const result = reviewWorkspaceBranch({ ...plan, ...change }, true);
    assert.equal(result.state, "NOT_CONFIGURED");
    assert.ok(result.errors[field], field);
    assert.equal("destination" in result, false);
  }
  assert.ok(reviewWorkspaceBranch(plan, false).errors.acknowledged);
  assert.equal(reviewWorkspaceBranch(null, true).state, "NOT_CONFIGURED");
  assert.equal(reviewWorkspaceBranch({ ...plan, branches: {
    production: "plementus-mvp-check", staging: "plementus-mvp-other",
  } }, true).state, "PREVIEW_READY");
});
