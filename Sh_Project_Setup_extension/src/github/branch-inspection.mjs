import { readFixtureRepositoryMetadata } from './repository-discovery.mjs';

/**
 * Offline inspection of the accepted reader's validated synthetic output.
 * text uses the reader's unchanged canonical JSON contract (<=3072 ASCII bytes).
 * target is a primitive name admitted by that same reader, never a real branch.
 * No input names/IDs are returned. Missing is only inferred from available data;
 * conflicts retain unknown/manual, and defaultBranchAsNewTarget is null when
 * comparison is not possible. Every path denies authority and effects.
 * Pristine native intrinsics are assumed, as in the accepted reader.
 */
export function inspectFixtureBranches(text, target) {
  const discovery = readFixtureRepositoryMetadata(text).branchDiscovery;
  let defaultState = discovery.state;
  let targetState = discovery.state;
  let reason = discovery.reason;
  let defaultBranchAsNewTarget = null;

  if (reason === 'invalid_fixture') {
    defaultState = targetState = 'invalid';
  } else {
    if (discovery.state === 'available') {
      defaultState = discovery.defaultBranch === null ? 'missing' : 'existing';
    }
    // Reuse the reader's branch vocabulary/validation without copying its rules.
    const validTarget = typeof target === 'string' && target.length <= 17 &&
      readFixtureRepositoryMetadata(JSON.stringify({
        selection: { organization: 'fixture-org-inspection', repository: 'fixture-repo-inspection' },
        repositories: [{ id: 'fixture-repo-inspection', organization: 'fixture-org-inspection',
          visibility: 'unknown', branchState: 'available', branches: [target], defaultBranch: target }],
      })).branchDiscovery.state === 'available';
    if (!validTarget) {
      targetState = 'invalid';
      reason = 'invalid_target';
    } else if (discovery.state === 'available') {
      targetState = discovery.branches.includes(target) ? 'existing' : 'missing';
      defaultBranchAsNewTarget = discovery.defaultBranch === target;
      if (defaultBranchAsNewTarget) reason = 'default_branch_protected';
    }
  }

  return Object.freeze({
    evidenceTier: 'SIMULATED', fixtureOnly: true,
    accountVerified: false, permissionsVerified: false, executionAuthorized: false,
    approvalGranted: false, trustedContinuingContext: false, effectsEnabled: false,
    nextStep: 'manual',
    defaultBranch: Object.freeze({ state: defaultState }),
    targetBranch: Object.freeze({ state: targetState }),
    defaultBranchAsNewTarget, reason,
  });
}
