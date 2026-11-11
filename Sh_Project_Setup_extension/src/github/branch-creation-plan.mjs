import { inspectFixtureBranches } from './branch-inspection.mjs';

/**
 * Pure offline planning from original fixture text, never a caller's summary.
 * Inspection owns input validation and bounds; native intrinsics are assumed.
 * A potential operation is descriptive only. Any future authorized executor must
 * independently recheck target absence and verify the current default's base SHA.
 */
export function planFixtureBranchCreation(text, target) {
  const inspection = inspectFixtureBranches(text, target);
  let outcome = 'MANUAL_REVIEW';
  let reason = inspection.reason;

  if (inspection.defaultBranch.state === 'invalid' || inspection.targetBranch.state === 'invalid') {
    outcome = 'BLOCKED';
  } else if (inspection.defaultBranchAsNewTarget === true) {
    outcome = 'BLOCKED';
    reason = 'default_branch_protected';
  } else if (inspection.defaultBranch.state === 'missing') {
    outcome = 'BLOCKED';
    reason = 'default_branch_missing';
  } else if (inspection.defaultBranch.state === 'existing' && inspection.defaultBranchAsNewTarget === false) {
    if (inspection.targetBranch.state === 'existing') {
      outcome = 'NO_ACTION';
      reason = 'target_already_exists';
    } else if (inspection.targetBranch.state === 'missing') {
      outcome = 'AWAITING_VERIFIED_BASE_SHA';
      reason = 'verified_base_sha_required';
    }
  }

  return Object.freeze({
    ...inspection, outcome, reason,
    potentialOperation: outcome === 'AWAITING_VERIFIED_BASE_SHA' ? 'CREATE_BRANCH' : null,
    baseCommitSha: null, baseShaVerified: false, targetVerified: false, creationAuthorized: false,
    requiresIndependentTargetVerification: true,
    requiresIndependentBaseShaVerification: true,
  });
}
