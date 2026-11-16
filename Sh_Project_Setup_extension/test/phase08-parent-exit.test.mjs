import test from 'node:test';
import assert from 'node:assert/strict';
import { readFixturePermissions } from '../src/github/permission-reader.mjs';
import { readFixtureRepositoryMetadata } from '../src/github/repository-discovery.mjs';
import { evaluateFixtureApiFailure } from '../src/github/api-error-fixtures.mjs';

const organization = 'fixture-org-alpha';
const repository = 'fixture-repo-demo';
const selection = { organization, repository };
const permissionText = (read = 'allowed', admin = 'denied', repositoryRead = 'allowed') => JSON.stringify({
  selection,
  organizations: [{ id: organization, read, admin }],
  repositories: [{ id: repository, organization, read: repositoryRead }],
});
const metadataText = (branchState = 'available', branches = ['fixture-main', 'fixture-develop'], defaultBranch = 'fixture-main') => JSON.stringify({
  selection,
  repositories: [{ id: repository, organization, visibility: 'private', branchState, branches, defaultBranch }],
});
const failureText = (status = null, hint = 'none', transport = 'none') => JSON.stringify({ status, hint, transport });

const allowed = ['allowed/fixture_allowed', 'denied/fixture_denied', 'allowed/fixture_allowed'];
const deniedRepository = ['allowed/fixture_allowed', 'denied/fixture_denied', 'denied/fixture_denied'];
const deniedOrganization = ['denied/fixture_denied', 'denied/fixture_denied', 'allowed/fixture_allowed'];
const ambiguous = Array(3).fill('unknown/ambiguous_fixture');
const invalid = Array(3).fill('unknown/invalid_fixture');
const unknown = ['unknown/fixture_unknown', 'denied/fixture_denied', 'unknown/fixture_unknown'];
const unavailable = ['unknown/fixture_unavailable', 'denied/fixture_denied', 'unknown/fixture_unavailable'];
const available = { visibility: 'private/fixture_private', discovery: 'available/fixture_branches_available',
  branches: ['fixture-main', 'fixture-develop'], defaultBranch: 'fixture-main' };
const unknownBranches = { visibility: 'private/fixture_private', discovery: 'unknown/fixture_branches_unknown',
  branches: [], defaultBranch: null };
const unavailableBranches = { visibility: 'private/fixture_private', discovery: 'unavailable/fixture_branches_unavailable',
  branches: [], defaultBranch: null };
const invalidMetadata = { visibility: 'unknown/invalid_fixture', discovery: 'unknown/invalid_fixture',
  branches: [], defaultBranch: null };

const duplicatePermissions = JSON.parse(permissionText());
duplicatePermissions.repositories.push({ ...duplicatePermissions.repositories[0], read: 'denied' });
const malformedPermissions = JSON.parse(permissionText());
malformedPermissions.credential = 'SECRET_TOKEN';
const malformedMetadata = JSON.parse(metadataText());
malformedMetadata.credential = 'SECRET_TOKEN';
const positivePermissions = permissionText();
const positiveMetadata = metadataText();
const noFailure = failureText();

// API failure fixtures have no target identity and cannot correlate with either reader.
const cases = [
  ['positive permissions and private branches', positivePermissions, positiveMetadata, noFailure,
    allowed, available, ['UNKNOWN', 'missing_failure']],
  ['available private branches do not override denied repository read', permissionText('allowed', 'denied', 'denied'), positiveMetadata, noFailure,
    deniedRepository, available, ['UNKNOWN', 'missing_failure']],
  ['repository read does not grant denied organization read', permissionText('denied'), positiveMetadata, noFailure,
    deniedOrganization, available, ['UNKNOWN', 'missing_failure']],
  ['conflicting organization admin and read remain ambiguous', permissionText('denied', 'allowed'), positiveMetadata, noFailure,
    ambiguous, available, ['UNKNOWN', 'missing_failure']],
  ['duplicate conflicting repository declarations remain ambiguous', JSON.stringify(duplicatePermissions), positiveMetadata, noFailure,
    ambiguous, available, ['UNKNOWN', 'missing_failure']],
  ['unknown permissions do not change available metadata', permissionText('unknown', 'denied', 'unknown'), positiveMetadata, noFailure,
    unknown, available, ['UNKNOWN', 'missing_failure']],
  ['unavailable permissions do not change available metadata', permissionText('unavailable', 'denied', 'unavailable'), positiveMetadata, noFailure,
    unavailable, available, ['UNKNOWN', 'missing_failure']],
  ['unknown branch discovery does not change declared permissions', positivePermissions, metadataText('unknown', [], null), noFailure,
    allowed, unknownBranches, ['UNKNOWN', 'missing_failure']],
  ['unavailable branch discovery does not change declared permissions', positivePermissions, metadataText('unavailable', [], null), noFailure,
    allowed, unavailableBranches, ['UNKNOWN', 'missing_failure']],
  ['malformed permission input cannot borrow valid metadata', JSON.stringify(malformedPermissions), positiveMetadata, noFailure,
    invalid, available, ['UNKNOWN', 'missing_failure']],
  ['malformed metadata input cannot borrow valid permissions', positivePermissions, JSON.stringify(malformedMetadata), noFailure,
    allowed, invalidMetadata, ['UNKNOWN', 'missing_failure']],
  ['401 reports synthetic authentication failure without account verification', positivePermissions, positiveMetadata, failureText(401),
    allowed, available, ['AUTHENTICATION_FAILURE', 'fixture_authentication_failure']],
  ['ambiguous 403 does not assert permission denial', positivePermissions, positiveMetadata, failureText(403),
    allowed, available, ['UNKNOWN', 'fixture_ambiguous_403']],
  ['explicit 403 permission denial does not erase separate declarations', positivePermissions, positiveMetadata, failureText(403, 'permission-denied'),
    allowed, available, ['PERMISSION_DENIED', 'fixture_permission_denied']],
  ['explicit 403 rate limit remains separate failure evidence', positivePermissions, positiveMetadata, failureText(403, 'rate-limited'),
    allowed, available, ['RATE_LIMITED', 'fixture_rate_limited']],
  ['404 without hint cannot prove repository absence', positivePermissions, positiveMetadata, failureText(404),
    allowed, available, ['UNKNOWN', 'fixture_absent_or_hidden']],
  ['404 not-found hint cannot prove repository absence', positivePermissions, positiveMetadata, failureText(404, 'not-found'),
    allowed, available, ['UNKNOWN', 'fixture_not_found_unverified']],
  ['404 hidden-resource hint cannot prove repository absence', positivePermissions, positiveMetadata, failureText(404, 'hidden-resource'),
    allowed, available, ['UNKNOWN', 'fixture_hidden_resource']],
  ['429 remains a synthetic rate-limit classification', positivePermissions, positiveMetadata, failureText(429),
    allowed, available, ['RATE_LIMITED', 'fixture_rate_limited']],
  ['transport timeout cannot establish provider state', positivePermissions, positiveMetadata, failureText(null, 'none', 'timeout'),
    allowed, available, ['UNKNOWN', 'fixture_timeout']],
  ['transport interruption cannot establish provider state', positivePermissions, positiveMetadata, failureText(null, 'none', 'interrupted'),
    allowed, available, ['UNKNOWN', 'fixture_interrupted']],
  ['contradictory status and transport cannot establish denial', positivePermissions, positiveMetadata, failureText(403, 'permission-denied', 'timeout'),
    allowed, available, ['UNKNOWN', 'contradictory_fixture']],
  ['malformed failure input cannot establish authentication', positivePermissions, positiveMetadata,
    JSON.stringify({ status: 401, hint: 'none', transport: 'none', token: 'SECRET_TOKEN' }),
    allowed, available, ['UNKNOWN', 'invalid_fixture']],
];

function assertSafe(result) {
  assert.equal(result.evidenceTier, 'SIMULATED');
  assert.equal(result.fixtureOnly, true);
  assert.equal(result.nextStep, 'manual');
  for (const flag of ['accountVerified', 'executionAuthorized', 'approvalGranted', 'trustedContinuingContext']) {
    assert.equal(result[flag], false);
  }
  function assertFrozen(value) {
    assert.ok(Object.isFrozen(value));
    for (const item of Object.values(value)) if (item && typeof item === 'object') assertFrozen(item);
  }
  assertFrozen(result);
  assert.doesNotMatch(JSON.stringify(result), /fixture-org-alpha|fixture-repo-demo|SECRET_TOKEN|Bearer |stack|password|requestId/i);
}

for (const [name, permissionInput, metadataInput, failureInput, wantPermissions, wantMetadata, wantFailure] of cases) {
  test(name, () => {
    const permissions = readFixturePermissions(permissionInput);
    const metadata = readFixtureRepositoryMetadata(metadataInput);
    const failure = evaluateFixtureApiFailure(failureInput);
    for (const result of [permissions, metadata, failure]) assertSafe(result);
    const assessment = ({ state, reason }) => `${state}/${reason}`;
    assert.deepEqual([
      assessment(permissions.organization.read),
      assessment(permissions.organization.admin),
      assessment(permissions.repository.read),
    ], wantPermissions);
    assert.deepEqual({
      visibility: assessment(metadata.visibility),
      discovery: assessment(metadata.branchDiscovery),
      branches: metadata.branchDiscovery.branches,
      defaultBranch: metadata.branchDiscovery.defaultBranch,
    }, wantMetadata);
    assert.deepEqual([failure.category, failure.reason], wantFailure);
    assert.equal(failure.readOutcome, 'UNKNOWN');
  });
}
