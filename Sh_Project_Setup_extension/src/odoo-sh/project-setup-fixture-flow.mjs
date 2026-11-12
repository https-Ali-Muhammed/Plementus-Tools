const MODES = [null, 'customer', 'partner-trial'];
const REFERENCES = ['present', 'absent'];
const PROJECTS = [null, 'fixture-project-001', 'fixture-project-002'];
const ENVIRONMENTS = [null, 'fixture-production-001', 'fixture-staging-001'];
const LIFECYCLES = ['active', 'cancelled', 'interrupted'];
// Numeric rules specify inclusive minimum, maximum, and optional null allowance.
const REQUEST_SCHEMA = [
  ['version', 1, 999], ['subscriptionMode', MODES], ['referencePlaceholder', REFERENCES],
  ['projectToken', PROJECTS], ['environmentToken', ENVIRONMENTS],
  ['documentGeneration', 1, 1000000, true], ['contextGeneration', 1, 1000000, true],
  ['sequence', 0, 999999], ['lifecycle', LIFECYCLES], ['review', ['pending', 'reviewed', 'declined']],
];
const OBSERVATION_SCHEMA = [
  ['version', 1, 999], ['page', ['project-setup', 'production', 'unknown']],
  ['selectedMode', MODES], ['referencePlaceholder', REFERENCES],
  ['projectToken', PROJECTS], ['environmentToken', ENVIRONMENTS],
  ['documentGeneration', 1, 1000000, true], ['contextGeneration', 1, 1000000, true],
  ['sequence', 1, 1000000], ['lifecycle', LIFECYCLES],
  ['authentication', ['none', 'login', 'mfa', 'captcha', 'session_expired']],
  ['evidence', ['complete', 'missing', 'unknown', 'conflicting', 'ambiguous']],
  ['setupState', ['not_submitted', 'submitted', 'pending', 'uncertain', 'failed', 'unknown']],
];

function parseFixture(text, schema) {
  if (!/^[\x20-\x7e]+$/.test(text)) return null;
  let parsed;
  try { parsed = JSON.parse(text); } catch { return null; }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)
    || JSON.stringify(parsed) !== text) return null;
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
  return parsed;
}

function result(reason, nextStep, resultClass = 'MANUAL_REVIEW', setupState = 'UNRESOLVED') {
  return Object.freeze({
    version: 1, resultClass, setupState, reason, evidenceTier: 'SIMULATED',
    provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true, nextStep,
    browserObserved: false, permissionVerified: false, accountVerified: false,
    rightsVerified: false, subscriptionVerified: false, approvalGranted: false,
    executionAuthorized: false, mutationAuthorized: false, installationAuthorized: false,
    trustedContinuingContext: false, associationVerified: false, productionDatabaseVerified: false,
    stagingCopyVerified: false, moduleInstalled: false, effectsApplied: false,
    readAuthorized: false, writeAuthorized: false,
  });
}

export function assessFixtureProjectSetup(requestText, observationText) {
  if (typeof requestText !== 'string' || typeof observationText !== 'string')
    return result('invalid_input', 'CORRECT_FIXTURE', 'REJECTED');
  if (requestText.length > 1024 || observationText.length > 1024)
    return result('input_too_large', 'CORRECT_FIXTURE', 'REJECTED');
  const request = parseFixture(requestText, REQUEST_SCHEMA);
  const observation = parseFixture(observationText, OBSERVATION_SCHEMA);
  if (!request || !observation) return result('invalid_input', 'CORRECT_FIXTURE', 'REJECTED');
  if (request.version !== 1 || observation.version !== 1)
    return result('unsupported_version', 'REVIEW_VERSION', 'REJECTED');
  if (request.lifecycle === 'cancelled' || observation.lifecycle === 'cancelled')
    return result('operator_cancelled', 'STOP', 'CANCELLED', 'CANCELLED');
  if (observation.setupState === 'uncertain')
    return result('setup_uncertain', 'MANUAL_RECONCILIATION', 'SIMULATED_SETUP', 'UNCERTAIN');
  if (request.lifecycle === 'interrupted' || observation.lifecycle === 'interrupted')
    return result('lifecycle_interrupted', 'FRESH_FIXTURE_CONTEXT');
  if (observation.authentication !== 'none') return result('authentication_required', 'MANUAL_AUTH');
  if (observation.page === 'unknown') return result('page_unknown', 'MANUAL_FIXTURE_PAGE');
  if (observation.page !== 'project-setup') return result('wrong_fixture_page', 'MANUAL_FIXTURE_PAGE');
  if (request.documentGeneration === null || observation.documentGeneration === null)
    return result('document_generation_missing', 'FRESH_FIXTURE_CONTEXT');
  if (request.documentGeneration !== observation.documentGeneration)
    return result('document_generation_mismatch', 'FRESH_FIXTURE_CONTEXT');
  if (request.contextGeneration === null || observation.contextGeneration === null)
    return result('context_generation_missing', 'FRESH_FIXTURE_CONTEXT');
  if (request.contextGeneration !== observation.contextGeneration)
    return result('context_generation_mismatch', 'FRESH_FIXTURE_CONTEXT');
  if (observation.sequence === request.sequence) return result('duplicate_observation', 'FRESH_FIXTURE_CONTEXT');
  if (observation.sequence < request.sequence) return result('delayed_observation', 'FRESH_FIXTURE_CONTEXT');
  if (observation.sequence > request.sequence + 1) return result('observation_gap', 'FRESH_FIXTURE_CONTEXT');
  if (request.projectToken === null || observation.projectToken === null
    || request.environmentToken === null || observation.environmentToken === null)
    return result('target_missing', 'MANUAL_FIXTURE_TARGET');
  if (request.projectToken !== observation.projectToken || request.environmentToken !== observation.environmentToken)
    return result('target_mismatch', 'MANUAL_FIXTURE_TARGET');
  if (request.projectToken !== 'fixture-project-001' || request.environmentToken !== 'fixture-production-001')
    return result('fixture_target_mismatch', 'MANUAL_FIXTURE_TARGET');
  if (request.subscriptionMode === null || observation.selectedMode === null)
    return result('mode_missing', 'MANUAL_SUBSCRIPTION');
  if (request.subscriptionMode !== observation.selectedMode) return result('mode_mismatch', 'MANUAL_SUBSCRIPTION');
  if (request.referencePlaceholder === 'absent' || observation.referencePlaceholder === 'absent')
    return result('reference_placeholder_missing', 'MANUAL_SUBSCRIPTION');
  if (observation.evidence !== 'complete') return result('evidence_unresolved', 'MANUAL_FIXTURE_PAGE');
  if (observation.setupState === 'unknown') return result('setup_unknown', 'MANUAL_RECONCILIATION');
  if (request.review !== 'reviewed' && observation.setupState !== 'not_submitted')
    return result('review_outcome_conflict', 'MANUAL_RECONCILIATION');
  if (request.review === 'declined') return result('review_declined', 'STOP', 'MANUAL_REVIEW', 'DECLINED');
  if (request.review === 'pending')
    return result('creation_review_required', 'MANUAL_PROJECT_REVIEW', 'MANUAL_REVIEW', 'AWAITING_REVIEW');
  // shortcut: supplied reviews have no authenticated history, upgrade only under an authorized binding contract.
  if (observation.setupState === 'not_submitted')
    return result('synthetic_review_recorded', 'MANUAL_PROJECT_REVIEW', 'SIMULATED_SETUP', 'REVIEWED');
  if (observation.setupState === 'submitted')
    return result('synthetic_submitted', 'MANUAL_SETUP_OBSERVATION', 'SIMULATED_SETUP', 'SUBMITTED');
  if (observation.setupState === 'pending')
    return result('synthetic_pending', 'MANUAL_SETUP_OBSERVATION', 'SIMULATED_SETUP', 'PENDING');
  return result('synthetic_failed', 'MANUAL_FAILURE_REVIEW', 'SIMULATED_SETUP', 'FAILED');
}
