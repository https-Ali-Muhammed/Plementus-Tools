/**
 * Pure offline fixture preview; sole entry point accepts primitive canonical
 * printable ASCII JSON, <=4096 bytes. No coercion or caller object inspection.
 * Closed schema (every field required):
 * { selection: { account, organization, repository, operation, visibility },
 *   accounts: [{ id, state }],
 *   organizations: [{ id, account, createPermission }],
 *   repositories: [{ id, organization, name, state, visibility, readPermission }] }
 * Each catalog: 0..3 records. IDs/names: exactly fixture-account-/fixture-org-/
 * fixture-repo-/fixture-name- plus alpha, beta, gamma or delta (not free text).
 * Enums below are exhaustive. Duplicate IDs, orphan references, new entries
 * with known read permissions and same-org name collisions fail closed globally.
 * Whole-catalog validation precedes selection; new means proposed, not absent.
 * Creation assesses only synthetic org createPermission; existing selection
 * assesses only synthetic repo readPermission. No fixture declaration is a grant.
 * Every result is deeply frozen, <=768 ASCII bytes, manual and non-authorizing.
 * Only valid private previews expose allowlisted targets; all failures redact.
 * See PHASE_09_01.md for ordered reasons and the exact schema/outcome matrix.
 * Assumes pristine native intrinsics. No external state or integration.
 */
const suffixes = ['alpha', 'beta', 'gamma', 'delta'];
const accountIds = suffixes.map(suffix => `fixture-account-${suffix}`);
const organizationIds = suffixes.map(suffix => `fixture-org-${suffix}`);
const repositoryIds = suffixes.map(suffix => `fixture-repo-${suffix}`);
const repositoryNames = suffixes.map(suffix => `fixture-name-${suffix}`);
const permissions = ['allowed', 'denied', 'unknown', 'unavailable', 'unsupported'];
const visibilities = ['private', 'public', 'internal', 'unknown', 'unavailable', 'unsupported'];
const accountStates = ['current', 'stale', 'unknown', 'unavailable', 'unsupported'];
const repositoryStates = ['new', 'existing', 'unknown', 'unavailable', 'unsupported'];
const operations = ['create-new', 'select-existing', 'unknown', 'unsupported'];

function record(value, fields) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
}
function collection(value, valid) {
  return Array.isArray(value) && value.length <= 3 && value.every(valid);
}
function duplicateIds(items) {
  return new Set(items.map(item => item.id)).size !== items.length;
}
function result(outcome, reason, preview = null) {
  return Object.freeze({
    evidenceTier: 'SIMULATED', fixtureOnly: true,
    accountVerified: false, executionAuthorized: false,
    approvalGranted: false, trustedContinuingContext: false,
    nextStep: 'manual', outcome, reason, preview,
  });
}
function manual(reason) { return result('MANUAL_ONLY', reason); }

export function previewFixtureRepositoryCreation(text) {
  if (typeof text !== 'string' || text.length > 4096 || !/^[\x20-\x7e]*$/.test(text)) {
    return manual('invalid_fixture');
  }
  let input;
  try { input = JSON.parse(text); } catch { return manual('invalid_fixture'); }
  if (!record(input, ['selection', 'accounts', 'organizations', 'repositories']) ||
      !record(input.selection, ['account', 'organization', 'repository', 'operation', 'visibility']) ||
      !accountIds.includes(input.selection.account) || !organizationIds.includes(input.selection.organization) ||
      !repositoryIds.includes(input.selection.repository) || !operations.includes(input.selection.operation) ||
      !visibilities.includes(input.selection.visibility) ||
      !collection(input.accounts, item => record(item, ['id', 'state']) &&
        accountIds.includes(item.id) && accountStates.includes(item.state)) ||
      !collection(input.organizations, item => record(item, ['id', 'account', 'createPermission']) &&
        organizationIds.includes(item.id) && accountIds.includes(item.account) && permissions.includes(item.createPermission)) ||
      !collection(input.repositories, item => record(item, ['id', 'organization', 'name', 'state', 'visibility', 'readPermission']) &&
        repositoryIds.includes(item.id) && organizationIds.includes(item.organization) && repositoryNames.includes(item.name) &&
        repositoryStates.includes(item.state) && visibilities.includes(item.visibility) && permissions.includes(item.readPermission)) ||
      JSON.stringify(input) !== text) {
    return manual('invalid_fixture');
  }
  const { selection, accounts, organizations, repositories } = input;
  if ([accounts, organizations, repositories].some(duplicateIds) ||
      repositories.some(item => item.state === 'new' && item.readPermission !== 'unknown')) {
    return manual('inconsistent_fixture');
  }
  if (organizations.some(item => !accounts.some(account => account.id === item.account))) return manual('account_missing');
  if (repositories.some(item => !organizations.some(org => org.id === item.organization))) return manual('organization_missing');
  if (repositories.some((item, index) => repositories.some((other, otherIndex) =>
    index !== otherIndex && item.organization === other.organization && item.name === other.name))) {
    return result('BLOCKED', 'repository_collision');
  }
  const account = accounts.find(item => item.id === selection.account);
  if (!account) return manual('account_missing');
  const organization = organizations.find(item => item.id === selection.organization);
  if (!organization) return manual('organization_missing');
  const repository = repositories.find(item => item.id === selection.repository);
  if (!repository) return manual('repository_missing');
  if (organization.account !== account.id) return manual('account_mismatch');
  if (repository.organization !== organization.id) return manual('organization_mismatch');
  if (repository.visibility !== selection.visibility) return manual('inconsistent_fixture');
  if (account.state !== 'current') return manual(`fixture_account_${account.state}`);
  if (selection.operation === 'unknown') return manual('operation_ambiguous');
  if (selection.operation === 'unsupported') return manual('operation_unsupported');
  if (repository.state !== 'new' && repository.state !== 'existing') return manual(`fixture_repository_${repository.state}`);
  const creating = selection.operation === 'create-new';
  if (creating !== (repository.state === 'new')) return manual('inconsistent_fixture');
  if (selection.visibility === 'public') return result('BLOCKED', 'public_visibility_blocked');
  if (selection.visibility !== 'private') return manual(`fixture_visibility_${selection.visibility}`);
  const permission = creating ? organization.createPermission : repository.readPermission;
  if (permission === 'denied') return result('BLOCKED', 'fixture_permission_denied');
  if (permission !== 'allowed') return manual(`fixture_permission_${permission}`);
  const target = Object.freeze({ operation: selection.operation, account: account.id,
    organization: organization.id, repository: repository.id, name: repository.name, visibility: 'private' });
  return result(creating ? 'PRIVATE_CREATION_PREVIEW' : 'EXISTING_SELECTION_PREVIEW',
    creating ? 'synthetic_private_creation_only' : 'synthetic_existing_selection_only', target);
}
