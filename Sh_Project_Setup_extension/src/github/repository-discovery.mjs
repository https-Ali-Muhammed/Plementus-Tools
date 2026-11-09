/**
 * Offline mock API: readFixtureRepositoryMetadata(text) -> frozen summary.
 * Primitive canonical ASCII JSON only (exact JSON.stringify form), <=3072
 * bytes. No coercion, caller objects, duplicate keys or alternate encodings.
 * Closed schema; every field is required:
 * {
 *   selection: { organization: orgId, repository: repoId },
 *   repositories: [{ id: repoId, organization: orgId, visibility,
 *     branchState, branches: [branchName], defaultBranch: branchName | null }]
 * }
 * IDs: fixture-org- / fixture-repo- plus [a-z][a-z0-9]{0,31}, exact case.
 * Catalog: 0..16 unique repository IDs, even across different organizations.
 * visibility: private | public | internal | unknown | unavailable | unsupported.
 * branchState: available | unknown | unavailable | unsupported.
 * branches: 0..8 unique names from branchNames below (maximum 17 ASCII bytes).
 * Available + nonempty requires a member default; empty requires null default.
 * Non-available requires [] and null. Entire catalog validates before selection.
 *
 * Output: visibility={state,reason}; branchDiscovery={state,reason,branches,
 * defaultBranch}, with fixed declarations/codes and allowlisted branch names.
 * Reasons: fixture_<visibility>, fixture_branches_<branchState>,
 * fixture_branches_empty, invalid_fixture, ambiguous_fixture,
 * repository_missing, ownership_mismatch. Invalid/ambiguous/missing/mismatch
 * return unknown states, [] and null. Outputs are deeply frozen <=1024 ASCII
 * bytes, omit all IDs/errors, and ALWAYS include the non-authority envelope.
 * Branch order is preserved; visibility never implies permissions or login.
 *
 * Assumes pristine native intrinsics; bounded JSON parsing creates inert data.
 * Fixed schema bounds traversal before reserialization. Caller hooks are not
 * inspected or invoked. No live API schema, permissions or product integration.
 */
const visibilities = ['private', 'public', 'internal', 'unknown', 'unavailable', 'unsupported'];
const branchStates = ['available', 'unknown', 'unavailable', 'unsupported'];
const branchNames = ['fixture-main', 'fixture-develop', 'fixture-staging', 'fixture-release',
  'fixture-feature-a', 'fixture-feature-b', 'fixture-hotfix', 'fixture-test', 'fixture-docs'];
const organizationId = /^fixture-org-[a-z][a-z0-9]{0,31}$/;
const repositoryId = /^fixture-repo-[a-z][a-z0-9]{0,31}$/;

function record(value, fields) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
}
function id(value, pattern) {
  return typeof value === 'string' && value.length <= 45 && pattern.test(value);
}
function result(visibility, visibilityReason, state, reason, branches = [], defaultBranch = null) {
  return Object.freeze({
    evidenceTier: 'SIMULATED', fixtureOnly: true,
    accountVerified: false, executionAuthorized: false,
    approvalGranted: false, trustedContinuingContext: false,
    nextStep: 'manual',
    visibility: Object.freeze({ state: visibility, reason: visibilityReason }),
    branchDiscovery: Object.freeze({ state, reason, branches: Object.freeze(branches), defaultBranch }),
  });
}
function unknown(reason) {
  return result('unknown', reason, 'unknown', reason);
}

export function readFixtureRepositoryMetadata(text) {
  if (typeof text !== 'string' || text.length > 3072 || !/^[\x20-\x7e]*$/.test(text)) {
    return unknown('invalid_fixture');
  }
  let input;
  try { input = JSON.parse(text); } catch { return unknown('invalid_fixture'); }
  if (!record(input, ['selection', 'repositories']) ||
      !record(input.selection, ['organization', 'repository']) ||
      !id(input.selection.organization, organizationId) || !id(input.selection.repository, repositoryId) ||
      !Array.isArray(input.repositories) || input.repositories.length > 16 ||
      !input.repositories.every(item => record(item, ['id', 'organization', 'visibility', 'branchState', 'branches', 'defaultBranch']) &&
        id(item.id, repositoryId) && id(item.organization, organizationId) && visibilities.includes(item.visibility) &&
        branchStates.includes(item.branchState) && Array.isArray(item.branches) && item.branches.length <= 8 &&
        item.branches.every(name => branchNames.includes(name)) &&
        (item.defaultBranch === null || branchNames.includes(item.defaultBranch))) ||
      JSON.stringify(input) !== text) {
    return unknown('invalid_fixture');
  }
  if (new Set(input.repositories.map(item => item.id)).size !== input.repositories.length ||
      input.repositories.some(item => new Set(item.branches).size !== item.branches.length ||
        (item.branchState !== 'available' && item.branches.length !== 0) ||
        (item.branches.length === 0 ? item.defaultBranch !== null : !item.branches.includes(item.defaultBranch)))) {
    return unknown('ambiguous_fixture');
  }
  const selected = input.repositories.find(item => item.id === input.selection.repository);
  if (!selected) return unknown('repository_missing');
  if (selected.organization !== input.selection.organization) return unknown('ownership_mismatch');
  const reason = selected.branchState === 'available' && selected.branches.length === 0 ?
    'fixture_branches_empty' : `fixture_branches_${selected.branchState}`;
  return result(selected.visibility, `fixture_${selected.visibility}`, selected.branchState, reason,
    selected.branches, selected.defaultBranch);
}
