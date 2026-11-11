/**
 * Disconnected fixture descriptions, never executable authority.
 * Primitive canonical printable-ASCII JSON only, <=4096 bytes; finite vocabulary.
 * Catalog 0..3; each independent declaration list 0..2 (two always conflict).
 * Validate every entry before selection. No target details leave this boundary.
 * All summaries are flat, frozen, <=384 bytes and permanently non-authorizing.
 * Synthetic freshness/consumption/context labels cannot establish runtime facts.
 * Assumes pristine native intrinsics. See PHASE_09_02.md for the closed schema.
 */
const suffixes = ['alpha', 'beta', 'gamma', 'delta'];
const targetFields = ['account', 'organization', 'repository', 'name', 'operation', 'visibility'];
const targetValues = {
  account: suffixes.map(s => `fixture-account-${s}`),
  organization: suffixes.map(s => `fixture-org-${s}`),
  repository: suffixes.map(s => `fixture-repo-${s}`),
  name: suffixes.map(s => `fixture-name-${s}`),
  operation: ['create-new', 'select-existing', 'unknown', 'unsupported'],
  visibility: ['private', 'public', 'internal', 'unknown', 'unavailable', 'unsupported'],
};
const repositoryStates = ['new', 'existing', 'unknown', 'unavailable', 'unsupported'];
const authorizationStates = ['declared', 'missing', 'denied', 'revoked', 'withdrawn', 'unknown', 'unavailable', 'unsupported'];
const approvalStates = ['declared', 'missing', 'denied', 'cancelled', 'withdrawn', 'unknown', 'unavailable', 'unsupported'];
const scopes = ['fixture-disposable-sandbox', 'unknown', 'unavailable', 'unsupported'];
const claims = ['fresh-fixture', 'stale-fixture', 'reused-fixture', 'unknown'];
const contexts = ['unchanged-fixture', 'changed-target', 'stale', 'cancelled', 'invalidated', 'interrupted', 'restarted', 'unknown'];

function record(value, fields) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
}
function target(value, catalog = false) {
  return record(value, catalog ? [...targetFields, 'state'] : targetFields) &&
    targetFields.every(field => targetValues[field].includes(value[field])) &&
    (!catalog || repositoryStates.includes(value.state));
}
function collection(value, limit, valid) {
  return Array.isArray(value) && value.length <= limit && value.every(valid);
}
function matches(left, right) { return targetFields.every(field => left[field] === right[field]); }
function result(outcome, reason) {
  return Object.freeze({
    evidenceTier: 'SIMULATED', fixtureOnly: true,
    accountVerified: false, executionAuthorized: false,
    approvalGranted: false, trustedContinuingContext: false,
    nextStep: 'manual', outcome, reason,
  });
}
function manual(reason) { return result('MANUAL_ONLY', reason); }

export function evaluateFixtureSandboxWriteApproval(text) {
  if (typeof text !== 'string' || text.length > 4096 || !/^[\x20-\x7e]*$/.test(text)) return manual('invalid_fixture');
  let input;
  try { input = JSON.parse(text); } catch { return manual('invalid_fixture'); }
  if (!record(input, ['preview', 'catalog', 'authorizations', 'approvals', 'context', 'writeState']) ||
      !target(input.preview) ||
      !collection(input.catalog, 3, item => target(item, true)) ||
      !collection(input.authorizations, 2, item => record(item, ['scope', 'decision', 'target']) &&
        scopes.includes(item.scope) && authorizationStates.includes(item.decision) && target(item.target)) ||
      !collection(input.approvals, 2, item => record(item, ['decision', 'claim', 'target']) &&
        approvalStates.includes(item.decision) && claims.includes(item.claim) && target(item.target)) ||
      !contexts.includes(input.context) || !['not-attempted-fixture', 'unknown-possible-write'].includes(input.writeState) ||
      JSON.stringify(input) !== text) return manual('invalid_fixture');

  const { preview, catalog, authorizations, approvals, context, writeState } = input;
  // Uncertainty must survive every otherwise well-shaped semantic denial.
  if (writeState === 'unknown-possible-write') return result('RECONCILE_REQUIRED', 'unknown_possible_write');
  if (catalog.some((item, index) =>
    (item.state === 'new' && item.operation !== 'create-new') ||
    (item.state === 'existing' && item.operation !== 'select-existing') ||
    catalog.some((other, otherIndex) => index !== otherIndex &&
      (item.repository === other.repository || (item.organization === other.organization &&
        (item.account !== other.account || item.name === other.name)))))) return manual('catalog_conflict');
  if (authorizations.length > 1 || approvals.length > 1) return manual('conflicting_declarations');
  if (context !== 'unchanged-fixture') return manual(`context_${context}`);
  const entry = catalog.find(item => item.repository === preview.repository);
  if (!entry) return manual('catalog_missing');
  if (!matches(entry, preview)) return manual('preview_mismatch');
  if (preview.operation !== 'create-new' || entry.state !== 'new') return manual('preview_not_creation');
  if (preview.visibility === 'public') return result('BLOCKED', 'public_visibility_blocked');
  if (preview.visibility !== 'private') return manual('visibility_unsupported');
  const authorization = authorizations[0];
  if (!authorization) return manual('authorization_missing');
  if (authorization.scope !== 'fixture-disposable-sandbox') return manual(`sandbox_scope_${authorization.scope}`);
  if (authorization.decision !== 'declared') return result(
    ['denied', 'revoked', 'withdrawn'].includes(authorization.decision) ? 'BLOCKED' : 'MANUAL_ONLY',
    `authorization_${authorization.decision}`);
  if (!matches(authorization.target, preview)) return manual('authorization_mismatch');
  const approval = approvals[0];
  if (!approval) return manual('approval_missing');
  if (approval.decision !== 'declared') return result(
    ['denied', 'cancelled', 'withdrawn'].includes(approval.decision) ? 'BLOCKED' : 'MANUAL_ONLY',
    `approval_${approval.decision}`);
  if (approval.claim !== 'fresh-fixture') return manual(`approval_claim_${approval.claim}`);
  if (!matches(approval.target, preview)) return manual('approval_mismatch');
  return result('SYNTHETIC_CHECKS_SATISFIED', 'synthetic_declarations_only');
}
