const PROJECTS = [null, 'fixture-project-001', 'fixture-project-002'];
const ENVIRONMENTS = [null, 'fixture-production-001', 'fixture-staging-001'];
const BRANCHES = [null, 'main', 'develop'];
const LIFECYCLES = ['active', 'cancelled', 'interrupted', 'worker_lost', 'session_lost'];
const AUTHENTICATION = ['none', 'login', 'mfa', 'captcha', 'session_expired'];
const READINESS = ['ready', 'pending', 'failed', 'unknown', 'missing', 'stale', 'conflicting'];
const COMMON = [
  ['version', 1, 999], ['projectToken', PROJECTS],
  ['sourceEnvironmentToken', ENVIRONMENTS], ['destinationEnvironmentToken', ENVIRONMENTS],
  ['sourceBranch', BRANCHES], ['stagingBranch', BRANCHES],
  ['documentGeneration', 1, 1000000, true], ['contextGeneration', 1, 1000000, true],
];
const REQUEST_SCHEMA = [...COMMON, ['sequence', 0, 999999], ['lifecycle', LIFECYCLES],
  ['intent', ['neutralized_copy']], ['review', ['missing', 'pending', 'reviewed', 'declined']]];
const OBSERVATION = [...COMMON, ['sequence', 1, 1000000], ['lifecycle', LIFECYCLES],
  ['authentication', AUTHENTICATION]];
const SCHEMAS = [REQUEST_SCHEMA,
  [...OBSERVATION, ['environmentState', ['awaiting_copy', 'present', 'missing', 'stale', 'conflicting', 'unknown']],
    ['branchState', ['created', 'missing', 'pending', 'conflicting']],
    ['buildReadiness', READINESS], ['databaseReadiness', READINESS]],
  [...OBSERVATION, ['copyState', ['not_started', 'review_required', 'pending', 'reported_complete', 'failed', 'unknown']],
    ['writeOutcome', ['none', 'uncertain']], ['approvalEvidence', ['missing', 'caller_reported']]],
  [...OBSERVATION, ['neutralizationState', ['not_assessed', 'pending', 'reported_neutralized', 'incomplete',
    'conflicting', 'unknown', 'manual_verification']]],
];

function parse(text, schema) {
  if (!/^[\x20-\x7e]+$/.test(text)) return null;
  let value;
  try { value = JSON.parse(text); } catch { return null; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== schema.length) return null;
  for (let i = 0; i < schema.length; i++) {
    const [key, domain, maximum, nullable] = schema[i];
    if (keys[i] !== key) return null;
    const v = value[key];
    if (Array.isArray(domain)) {
      if (!domain.includes(v)) return null;
    } else if (!(nullable && v === null) && !(Number.isInteger(v) && v >= domain && v <= maximum)) return null;
  }
  return JSON.stringify(value) === text ? value : null;
}

function result(reason, nextStep, states = ['UNRESOLVED', 'UNRESOLVED', 'UNRESOLVED', 'UNRESOLVED', 'UNRESOLVED']) {
  return Object.freeze({ version: 1, evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true,
    reason, nextStep, syntheticBranch: states[0], syntheticBuild: states[1], syntheticDatabase: states[2],
    syntheticCopy: states[3], syntheticNeutralization: states[4],
    browserObserved: false, permissionVerified: false, accountVerified: false, rightsVerified: false,
    subscriptionVerified: false, approvalGranted: false, executionAuthorized: false, mutationAuthorized: false,
    installationAuthorized: false, trustedContinuingContext: false, associationVerified: false,
    productionDatabaseVerified: false, stagingCopyVerified: false, moduleInstalled: false,
    effectsApplied: false, readAuthorized: false, writeAuthorized: false,
  });
}

export function assessFixtureStagingCopy(requestText, stagingText, copyText, neutralizationText) {
  const texts = [requestText, stagingText, copyText, neutralizationText];
  if (texts.some(t => typeof t !== 'string')) return result('invalid_input', 'CORRECT_FIXTURE');
  if (texts.some(t => t.length > 1024)) return result('input_too_large', 'CORRECT_FIXTURE');
  const all = texts.map((t, i) => parse(t, SCHEMAS[i]));
  if (all.some(v => v === null)) return result('invalid_input', 'CORRECT_FIXTURE');
  const [r, s, c, n] = all, observations = [s, c, n];
  if (all.some(v => v.version !== 1)) return result('unsupported_version', 'REVIEW_VERSION');
  if (c.writeOutcome === 'uncertain') return result('possible_write_unresolved', 'MANUAL_RECONCILIATION');
  if (c.copyState === 'unknown') return result('copy_unknown', 'MANUAL_RECONCILIATION');
  if (all.some(v => v.lifecycle === 'cancelled')) return result('operator_cancelled', 'STOP');
  if (all.some(v => ['worker_lost', 'session_lost'].includes(v.lifecycle))) return result('context_lost', 'FRESH_FIXTURE_CONTEXT');
  if (all.some(v => v.lifecycle === 'interrupted')) return result('lifecycle_interrupted', 'FRESH_FIXTURE_CONTEXT');
  if (observations.some(v => v.authentication !== 'none')) return result('authentication_required', 'MANUAL_AUTH');
  for (const [key, prefix] of [['documentGeneration', 'document_generation'], ['contextGeneration', 'context_generation']]) {
    if (all.some(v => v[key] === null)) return result(prefix + '_missing', 'FRESH_FIXTURE_CONTEXT');
    if (observations.some(v => v[key] !== r[key])) return result(prefix + '_mismatch', 'FRESH_FIXTURE_CONTEXT');
  }
  if (observations.some(v => v.sequence === r.sequence)) return result('duplicate_observation', 'FRESH_FIXTURE_CONTEXT');
  if (observations.some(v => v.sequence < r.sequence)) return result('delayed_observation', 'FRESH_FIXTURE_CONTEXT');
  if (observations.some(v => v.sequence > r.sequence + 1)) return result('observation_gap', 'FRESH_FIXTURE_CONTEXT');
  if (all.some(v => v.projectToken === null || v.sourceEnvironmentToken === null || v.destinationEnvironmentToken === null))
    return result('target_missing', 'MANUAL_FIXTURE_TARGET');
  if (all.some(v => v.projectToken !== 'fixture-project-001')) return result('project_mismatch', 'MANUAL_FIXTURE_TARGET');
  if (all.some(v => v.sourceEnvironmentToken !== 'fixture-production-001')) return result('source_mismatch', 'MANUAL_FIXTURE_TARGET');
  if (all.some(v => v.destinationEnvironmentToken !== 'fixture-staging-001')) return result('destination_mismatch', 'MANUAL_FIXTURE_TARGET');
  if (all.some(v => v.sourceBranch === null || v.stagingBranch === null)) return result('branch_missing', 'MANUAL_FIXTURE_TARGET');
  if (all.some(v => v.sourceBranch !== 'main' || v.stagingBranch !== 'develop')) return result('branch_mismatch', 'MANUAL_FIXTURE_TARGET');
  const states = [s.branchState, s.buildReadiness, s.databaseReadiness, c.copyState, n.neutralizationState].map(v => v.toUpperCase());
  if (n.neutralizationState === 'reported_neutralized' && c.copyState !== 'reported_complete')
    return result('neutralization_without_copy', 'MANUAL_RECONCILIATION', states);
  const attempted = ['pending', 'reported_complete', 'failed'].includes(c.copyState);
  if (attempted && r.review !== 'reviewed') return result('copy_review_conflict', 'MANUAL_RECONCILIATION', states);
  if (attempted && c.approvalEvidence === 'missing') return result('copy_approval_missing', 'MANUAL_RECONCILIATION', states);
  if (r.review === 'declined') return result('review_declined', 'STOP', states);
  if (r.review === 'missing') return result('copy_review_missing', 'MANUAL_COPY_REVIEW', states);
  if (r.review === 'pending') return result('copy_review_required', 'MANUAL_COPY_REVIEW', states);
  if (['missing', 'stale', 'conflicting', 'unknown'].includes(s.environmentState))
    return result('staging_environment_' + s.environmentState, s.environmentState === 'stale' ? 'FRESH_FIXTURE_CONTEXT'
      : s.environmentState === 'conflicting' ? 'MANUAL_RECONCILIATION' : 'MANUAL_STAGING_EVIDENCE', states);
  if (s.branchState !== 'created') return result('staging_branch_' + s.branchState,
    s.branchState === 'conflicting' ? 'MANUAL_RECONCILIATION' : 'MANUAL_STAGING_EVIDENCE', states);
  const readiness = [s.buildReadiness, s.databaseReadiness];
  for (const [state, reason, step] of [
    ['conflicting', 'staging_evidence_conflicting', 'MANUAL_RECONCILIATION'],
    ['missing', 'staging_evidence_missing', 'MANUAL_STAGING_EVIDENCE'],
    ['stale', 'staging_evidence_stale', 'FRESH_FIXTURE_CONTEXT'],
    ['failed', 'staging_failed', 'MANUAL_FAILURE_REVIEW'],
    ['unknown', 'staging_unknown', 'MANUAL_STAGING_EVIDENCE'],
  ]) if (readiness.includes(state)) return result(reason, step, states);
  if (s.buildReadiness === 'pending') return result('staging_build_pending', 'MANUAL_STAGING_EVIDENCE', states);
  if (s.databaseReadiness === 'pending') return result('staging_database_pending', 'MANUAL_STAGING_EVIDENCE', states);
  if (c.copyState === 'not_started') return result('copy_not_started', 'MANUAL_COPY_REVIEW', states);
  if (c.copyState === 'review_required') return result('copy_review_required', 'MANUAL_COPY_REVIEW', states);
  if (c.copyState === 'pending') return result('copy_pending', 'MANUAL_COPY_OBSERVATION', states);
  if (c.copyState === 'failed') return result('copy_failed', 'MANUAL_RECONCILIATION', states);
  // shortcut: reported approval and outcomes lack authenticated history; upgrade only under an authorized binding contract.
  if (n.neutralizationState !== 'reported_neutralized') return result('neutralization_' + n.neutralizationState,
    ['incomplete', 'conflicting', 'unknown'].includes(n.neutralizationState)
      ? 'MANUAL_RECONCILIATION' : 'MANUAL_NEUTRALIZATION_REVIEW', states);
  return result('synthetic_reported_copy_neutralization', 'MANUAL_INDEPENDENT_VERIFICATION', states);
}
