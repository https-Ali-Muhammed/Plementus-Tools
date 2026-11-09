/**
 * Isolated mock API: readFixturePermissions(text) -> deeply frozen summary.
 * text MUST be a primitive, canonical JSON string (JSON.stringify form), ASCII,
 * at most 3072 characters. No caller objects, boxed strings or coercion.
 * Exact input schema (all fields required, no extras):
 * {
 *   selection: { organization: orgId, repository: repoId },
 *   organizations: [{ id: orgId, read: permission, admin: permission }],
 *   repositories: [{ id: repoId, organization: orgId, read: permission }]
 * }
 * Arrays contain 0..16 records; IDs are case-sensitive invented fixture IDs:
 * fixture-org- or fixture-repo- followed by [a-z][a-z0-9]{0,31}.
 * permission: allowed | denied | unknown | unsupported | unavailable.
 * Duplicate IDs or admin=allowed with org read!=allowed are ambiguous.
 * Duplicate JSON keys and noncanonical encoding are invalid; no normalization.
 * Whole-catalog validation precedes exact selection; missing org blocks repo
 * association, while org read/admin never implies repo access or vice versa.
 *
 * Output: organization.{read,admin} and repository.read are {state,reason}.
 * state: allowed | denied | unknown | unsupported (unavailable maps to unknown).
 * Reasons: fixture_allowed/denied/unknown/unsupported/unavailable,
 * invalid_fixture, ambiguous_fixture, organization_missing,
 * repository_missing, ownership_mismatch. No input values or errors escape.
 * Every summary is fixtureOnly, SIMULATED, nextStep=manual, with four false
 * authority flags; all output is fixed-vocabulary ASCII and <=1024 bytes.
 * Positive assessments ONLY describe supplied fixtures, never real rights.
 *
 * No live API schema, account validation, v1 adapter or product integration.
 * Assumes pristine native intrinsics. Input-size bound applies before parsing;
 * fixed shallow schema bounds traversal; caller proxies/hooks are never read.
 */
const permissions = ['allowed', 'denied', 'unknown', 'unsupported', 'unavailable'];
const organizationId = /^fixture-org-[a-z][a-z0-9]{0,31}$/;
const repositoryId = /^fixture-repo-[a-z][a-z0-9]{0,31}$/;

function record(value, fields) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
}
function id(value, pattern) {
  return typeof value === 'string' && value.length <= 45 && pattern.test(value);
}
function collection(value, valid) {
  return Array.isArray(value) && value.length <= 16 && value.every(valid);
}
function assessment(state, reason) {
  return Object.freeze({ state, reason });
}
function declared(value) {
  return assessment(value === 'unavailable' ? 'unknown' : value, `fixture_${value}`);
}
function result(read, admin, repository) {
  return Object.freeze({
    evidenceTier: 'SIMULATED', fixtureOnly: true,
    accountVerified: false, executionAuthorized: false,
    approvalGranted: false, trustedContinuingContext: false,
    nextStep: 'manual',
    organization: Object.freeze({ read, admin }),
    repository: Object.freeze({ read: repository }),
  });
}
function unknown(reason) {
  const item = assessment('unknown', reason);
  return result(item, item, item);
}

export function readFixturePermissions(text) {
  if (typeof text !== 'string' || text.length > 3072 || !/^[\x20-\x7e]*$/.test(text)) {
    return unknown('invalid_fixture');
  }
  let input;
  try { input = JSON.parse(text); } catch { return unknown('invalid_fixture'); }
  if (!record(input, ['selection', 'organizations', 'repositories']) ||
      !record(input.selection, ['organization', 'repository']) ||
      !id(input.selection.organization, organizationId) || !id(input.selection.repository, repositoryId) ||
      !collection(input.organizations, item => record(item, ['id', 'read', 'admin']) &&
        id(item.id, organizationId) && permissions.includes(item.read) && permissions.includes(item.admin)) ||
      !collection(input.repositories, item => record(item, ['id', 'organization', 'read']) &&
        id(item.id, repositoryId) && id(item.organization, organizationId) && permissions.includes(item.read)) ||
      JSON.stringify(input) !== text) {
    return unknown('invalid_fixture');
  }
  if (new Set(input.organizations.map(item => item.id)).size !== input.organizations.length ||
      new Set(input.repositories.map(item => item.id)).size !== input.repositories.length ||
      input.organizations.some(item => item.admin === 'allowed' && item.read !== 'allowed')) {
    return unknown('ambiguous_fixture');
  }
  const organization = input.organizations.find(item => item.id === input.selection.organization);
  if (!organization) return unknown('organization_missing');
  const repository = input.repositories.find(item => item.id === input.selection.repository);
  const repositoryRead = !repository ? assessment('unknown', 'repository_missing') :
    repository.organization !== organization.id ? assessment('unknown', 'ownership_mismatch') :
      declared(repository.read);
  return result(declared(organization.read), declared(organization.admin), repositoryRead);
}
