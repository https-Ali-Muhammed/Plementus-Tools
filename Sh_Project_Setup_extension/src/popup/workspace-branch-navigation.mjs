import { validateSandboxBranchRequest } from "./sandbox-branch-assistant.mjs";

export function reviewWorkspaceBranch(plan, acknowledged) {
  const github = plan?.github;
  const branches = plan?.branches;
  const repository = `${github?.organization ?? ""}/${github?.repository ?? ""}`;
  const sourceBranch = branches?.production;
  const newBranch = branches?.staging;
  const valid = values => validateSandboxBranchRequest({
    repository: "fixture-owner/disposable-repo", sourceBranch: "main",
    newBranch: "plementus-mvp-check", acknowledged: true, ...values,
  }).state === "PREVIEW_READY";
  const errors = {};
  if (github?.mode !== "existing") errors.mode = "Select Existing Repository in the reviewed setup plan.";
  if (!valid({ repository })) errors.repository = "Choose an exact disposable repository; protected repositories are excluded.";
  if (!valid({ sourceBranch,
    newBranch: sourceBranch === "plementus-mvp-check" ? "plementus-mvp-other" : "plementus-mvp-check" }))
    errors.sourceBranch = "Enter a valid Production source branch.";
  if (!valid({ newBranch })) errors.newBranch = "Staging branch must begin plementus-mvp- and be valid.";
  if (sourceBranch === newBranch && typeof sourceBranch === "string")
    errors.newBranch = "Staging branch must differ from Production branch.";
  if (acknowledged !== true) errors.acknowledged = "Confirm the repository is a disposable sandbox.";
  if (Object.keys(errors).length) return { state: "NOT_CONFIGURED", errors };
  return { ...validateSandboxBranchRequest({ repository, sourceBranch, newBranch, acknowledged }), errors };
}
