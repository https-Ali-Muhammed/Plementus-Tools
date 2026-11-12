const PROJECTS = [null, 'fixture-project-001', 'fixture-project-002'];
const REPOSITORIES = [null, 'fixture-repo-001', 'fixture-repo-002'];
const BRANCHES = [null, 'main', 'develop'];
const ENVIRONMENTS = [null, 'fixture-production-001', 'fixture-staging-001'];
const LIFECYCLES = ['active', 'cancelled', 'interrupted', 'worker_lost', 'session_lost'];
const AUTHENTICATION = ['none', 'login', 'mfa', 'captcha', 'session_expired'];
const READINESS = ['ready', 'pending', 'failed', 'unknown', 'missing', 'stale', 'conflicting', 'interrupted'];
// Numeric rules give inclusive minimum, maximum and optional null allowance.
const REQUEST_SCHEMA = [
  ['version', 1, 999], ['projectToken', PROJECTS], ['repositoryToken', REPOSITORIES],
  ['branch', BRANCHES], ['environmentToken', ENVIRONMENTS],
  ['documentGeneration', 1, 1000000, true], ['contextGeneration', 1, 1000000, true],
  ['sequence', 0, 999999], ['lifecycle', LIFECYCLES], ['review', ['pending', 'reviewed', 'declined']],
];
const ASSOCIATION_SCHEMA = [
  ['version', 1, 999], ['projectToken', PROJECTS], ['repositoryToken', REPOSITORIES],
  ['branch', BRANCHES], ['environmentToken', ENVIRONMENTS],
  ['documentGeneration', 1, 1000000, true], ['contextGeneration', 1, 1000000, true],
  ['sequence', 1, 1000000], ['lifecycle', LIFECYCLES], ['authentication', AUTHENTICATION],
  ['associationState', ['not_established', 'pending', 'reported', 'conflicting', 'unknown', 'failed']],
  ['writeOutcome', ['none', 'uncertain']],
];
const PRODUCTION_SCHEMA = [
  ['version', 1, 999], ['projectToken', PROJECTS], ['branch', BRANCHES], ['environmentToken', ENVIRONMENTS],
  ['documentGeneration', 1, 1000000, true], ['contextGeneration', 1, 1000000, true],
  ['sequence', 1, 1000000], ['lifecycle', LIFECYCLES], ['authentication', AUTHENTICATION],
  ['buildReadiness', READINESS], ['databaseReadiness', READINESS],
];

function parseFixture(text, schema) {
  if (!/^[\x20-\x7e]+$/.test(text)) return null;
  let parsed;
  try { parsed = JSON.parse(text); } catch { return null; }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const keys = Object.keys(parsed);
  if (keys.length !== schema.length) return null;
  for (let index = 0; index < schema.length; index++) {
    const [key, choicesOrMinimum, maximum, nullable] = schema[index];
    if (keys[index] !== key) return null;
    const value = parsed[key];
    if (Array.isArray(choicesOrMinimum)) {
      if (!choicesOrMinimum.includes(value)) return null;
    } else if (!(nullable && value === null)
      && !(Number.isInteger(value) && value >= choicesOrMinimum && value <= maximum)) return null;
  }
  return JSON.stringify(parsed) === text ? parsed : null;
}

function result(reason, nextStep, resultClass = 'MANUAL_REVIEW',
  syntheticAssociation = 'UNRESOLVED', syntheticBuild = 'UNRESOLVED', syntheticDatabase = 'UNRESOLVED') {
  return Object.freeze({
    version: 1, resultClass, syntheticAssociation, syntheticBuild, syntheticDatabase, reason,
    evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true, nextStep,
    browserObserved: false, permissionVerified: false, accountVerified: false, rightsVerified: false,
    subscriptionVerified: false, approvalGranted: false, executionAuthorized: false, mutationAuthorized: false,
    installationAuthorized: false, trustedContinuingContext: false, associationVerified: false,
    productionDatabaseVerified: false, stagingCopyVerified: false, moduleInstalled: false,
    effectsApplied: false, readAuthorized: false, writeAuthorized: false,
  });
}

export function assessFixtureRepositoryProduction(requestText, associationText, productionText) {
  const texts = [requestText, associationText, productionText];
  if (texts.some(text => typeof text !== 'string')) return result('invalid_input', 'CORRECT_FIXTURE', 'REJECTED');
  if (texts.some(text => text.length > 1024)) return result('input_too_large', 'CORRECT_FIXTURE', 'REJECTED');
  const request = parseFixture(requestText, REQUEST_SCHEMA);
  const association = parseFixture(associationText, ASSOCIATION_SCHEMA);
  const production = parseFixture(productionText, PRODUCTION_SCHEMA);
  if (!request || !association || !production) return result('invalid_input', 'CORRECT_FIXTURE', 'REJECTED');
  const all = [request, association, production];
  const observations = [association, production];
  if (all.some(item => item.version !== 1)) return result('unsupported_version', 'REVIEW_VERSION', 'REJECTED');
  if (all.some(item => item.lifecycle === 'cancelled')) return result('operator_cancelled', 'STOP', 'CANCELLED');
  if (association.writeOutcome === 'uncertain') return result('possible_write_unresolved', 'MANUAL_RECONCILIATION');
  if (association.associationState === 'unknown') return result('association_unknown', 'MANUAL_RECONCILIATION');
  if (all.some(item => item.lifecycle === 'worker_lost' || item.lifecycle === 'session_lost'))
    return result('context_lost', 'FRESH_FIXTURE_CONTEXT');
  if (all.some(item => item.lifecycle === 'interrupted')) return result('lifecycle_interrupted', 'FRESH_FIXTURE_CONTEXT');
  if (observations.some(item => item.authentication !== 'none')) return result('authentication_required', 'MANUAL_AUTH');
  if (all.some(item => item.documentGeneration === null)) return result('document_generation_missing', 'FRESH_FIXTURE_CONTEXT');
  if (observations.some(item => item.documentGeneration !== request.documentGeneration))
    return result('document_generation_mismatch', 'FRESH_FIXTURE_CONTEXT');
  if (all.some(item => item.contextGeneration === null)) return result('context_generation_missing', 'FRESH_FIXTURE_CONTEXT');
  if (observations.some(item => item.contextGeneration !== request.contextGeneration))
    return result('context_generation_mismatch', 'FRESH_FIXTURE_CONTEXT');
  if (observations.some(item => item.sequence === request.sequence)) return result('duplicate_observation', 'FRESH_FIXTURE_CONTEXT');
  if (observations.some(item => item.sequence < request.sequence)) return result('delayed_observation', 'FRESH_FIXTURE_CONTEXT');
  if (observations.some(item => item.sequence > request.sequence + 1)) return result('observation_gap', 'FRESH_FIXTURE_CONTEXT');
  if (all.some(item => item.projectToken === null || item.environmentToken === null))
    return result('target_missing', 'MANUAL_FIXTURE_TARGET');
  if (observations.some(item => item.projectToken !== request.projectToken || item.environmentToken !== request.environmentToken))
    return result('target_mismatch', 'MANUAL_FIXTURE_TARGET');
  if (request.projectToken !== 'fixture-project-001' || request.environmentToken !== 'fixture-production-001')
    return result('fixture_target_mismatch', 'MANUAL_FIXTURE_TARGET');
  if (request.repositoryToken === null || association.repositoryToken === null) return result('repository_missing', 'MANUAL_ASSOCIATION');
  if (request.repositoryToken !== association.repositoryToken || request.repositoryToken !== 'fixture-repo-001')
    return result('repository_mismatch', 'MANUAL_ASSOCIATION');
  if (all.some(item => item.branch === null)) return result('branch_missing', 'MANUAL_FIXTURE_TARGET');
  if (observations.some(item => item.branch !== request.branch) || request.branch !== 'main')
    return result('branch_mismatch', 'MANUAL_FIXTURE_TARGET');
  if (association.associationState === 'conflicting') return result('association_conflicting', 'MANUAL_RECONCILIATION');
  if (request.review !== 'reviewed' && association.associationState !== 'not_established')
    return result('review_outcome_conflict', 'MANUAL_RECONCILIATION');
  if (request.review === 'declined') return result('review_declined', 'STOP');
  if (request.review === 'pending') return result('association_review_required', 'MANUAL_ASSOCIATION_REVIEW');
  if (association.associationState === 'not_established')
    return result('association_not_established', 'MANUAL_ASSOCIATION', 'MANUAL_REVIEW', 'NOT_ESTABLISHED');
  if (association.associationState === 'pending') return result('association_pending', 'MANUAL_ASSOCIATION', 'MANUAL_REVIEW', 'PENDING');
  if (association.associationState === 'failed') return result('association_failed', 'MANUAL_FAILURE_REVIEW', 'MANUAL_REVIEW', 'FAILED');
  // shortcut: supplied context/review has no authenticated history; upgrade only under a separately authorized binding contract.
  const states = [production.buildReadiness, production.databaseReadiness];
  const build = production.buildReadiness.toUpperCase();
  const database = production.databaseReadiness.toUpperCase();
  for (const [state, reason, step] of [
    ['conflicting', 'production_evidence_conflicting', 'MANUAL_RECONCILIATION'],
    ['missing', 'production_evidence_missing', 'MANUAL_PRODUCTION_EVIDENCE'],
    ['stale', 'production_evidence_stale', 'FRESH_FIXTURE_CONTEXT'],
    ['interrupted', 'production_interrupted', 'FRESH_FIXTURE_CONTEXT'],
    ['failed', 'production_failed', 'MANUAL_FAILURE_REVIEW'],
    ['unknown', 'production_unknown', 'MANUAL_PRODUCTION_EVIDENCE'],
  ]) if (states.includes(state)) return result(reason, step, 'SIMULATED_READINESS', 'REPORTED', build, database);
  if (states.every(state => state === 'pending'))
    return result('synthetic_both_pending', 'MANUAL_PRODUCTION_EVIDENCE', 'SIMULATED_READINESS', 'REPORTED', build, database);
  if (production.buildReadiness === 'pending')
    return result('synthetic_build_pending', 'MANUAL_PRODUCTION_EVIDENCE', 'SIMULATED_READINESS', 'REPORTED', build, database);
  if (production.databaseReadiness === 'pending')
    return result('synthetic_database_pending', 'MANUAL_PRODUCTION_EVIDENCE', 'SIMULATED_READINESS', 'REPORTED', build, database);
  return result('synthetic_pair_ready', 'MANUAL_FIXTURE_REVIEW', 'SIMULATED_READINESS', 'REPORTED', build, database);
}
