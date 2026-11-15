const SCHEMAS = [
  {
    "version": [
      1,
      999
    ],
    "projectToken": [
      null,
      "fixture-project-001",
      "fixture-project-002"
    ],
    "environmentToken": [
      null,
      "fixture-production-001",
      "fixture-staging-001"
    ],
    "documentGeneration": [
      null,
      1,
      1000000
    ],
    "contextGeneration": [
      null,
      1,
      1000000
    ],
    "sequence": [
      0,
      1000000
    ],
    "lifecycle": [
      "active",
      "cancelled",
      "interrupted",
      "worker_lost",
      "session_lost"
    ],
    "utilityToken": [
      null,
      "fixture-utility-001",
      "fixture-utility-002"
    ],
    "moduleToken": [
      null,
      "pl_auth",
      "cedar_labels",
      "fixture-missing-module"
    ],
    "review": [
      "pending",
      "reviewed",
      "declined"
    ]
  },
  {
    "version": [
      1,
      999
    ],
    "projectToken": [
      null,
      "fixture-project-001",
      "fixture-project-002"
    ],
    "environmentToken": [
      null,
      "fixture-production-001",
      "fixture-staging-001"
    ],
    "documentGeneration": [
      null,
      1,
      1000000
    ],
    "contextGeneration": [
      null,
      1,
      1000000
    ],
    "sequence": [
      0,
      1000000
    ],
    "lifecycle": [
      "active",
      "cancelled",
      "interrupted",
      "worker_lost",
      "session_lost"
    ],
    "authentication": [
      "none",
      "login",
      "mfa",
      "captcha",
      "session_expired"
    ],
    "utilityToken": [
      null,
      "fixture-utility-001",
      "fixture-utility-002"
    ],
    "handoff": [
      "none",
      "review_required",
      "configured",
      "access_reported",
      "unknown",
      "failed",
      "denied",
      "conflicting"
    ],
    "writeOutcome": [
      "none",
      "uncertain"
    ]
  },
  {
    "version": [
      1,
      999
    ],
    "projectToken": [
      null,
      "fixture-project-001",
      "fixture-project-002"
    ],
    "environmentToken": [
      null,
      "fixture-production-001",
      "fixture-staging-001"
    ],
    "documentGeneration": [
      null,
      1,
      1000000
    ],
    "contextGeneration": [
      null,
      1,
      1000000
    ],
    "sequence": [
      0,
      1000000
    ],
    "lifecycle": [
      "active",
      "cancelled",
      "interrupted",
      "worker_lost",
      "session_lost"
    ],
    "authentication": [
      "none",
      "login",
      "mfa",
      "captcha",
      "session_expired"
    ],
    "databaseToken": [
      null,
      "fixture-customer-db-001",
      "fixture-customer-db-002"
    ],
    "moduleToken": [
      null,
      "pl_auth",
      "cedar_labels",
      "fixture-missing-module"
    ],
    "availability": [
      "available",
      "missing",
      "unknown",
      "stale",
      "conflicting"
    ],
    "installation": [
      "not_installed",
      "static_installed",
      "reported_installed",
      "unknown",
      "stale",
      "conflicting"
    ],
    "approval": [
      "awaiting_approval",
      "missing",
      "reviewed",
      "declined",
      "conflicting"
    ],
    "writeOutcome": [
      "none",
      "uncertain"
    ]
  }
];

function parse(text, schema) {
  if (!/^[\x20-\x7e]+$/.test(text)) return null;
  let value;
  try { value = JSON.parse(text); } catch { return null; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (JSON.stringify(Object.keys(value)) !== JSON.stringify(Object.keys(schema))) return null;
  for (const [key, domain] of Object.entries(schema)) {
    const v = value[key];
    if (['version', 'sequence', 'documentGeneration', 'contextGeneration'].includes(key)) {
      const numeric = domain.filter(x => x !== null);
      if (!(v === null && domain[0] === null) && !(Number.isInteger(v) && v >= numeric[0] && v <= numeric[1])) return null;
    } else if (!domain.includes(v)) return null;
  }
  return JSON.stringify(value) === text ? value : null;
}
function result(reason, nextStep, utilities = 'UNRESOLVED', module = 'UNRESOLVED') {
  return Object.freeze({version: 1, evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true,
    reason, nextStep, syntheticUtilities: utilities, syntheticModule: module, utilitiesReason: utilities, moduleReason: module,
    browserObserved: false,
    permissionVerified: false,
    accountVerified: false,
    rightsVerified: false,
    subscriptionVerified: false,
    approvalGranted: false,
    executionAuthorized: false,
    mutationAuthorized: false,
    installationAuthorized: false,
    trustedContinuingContext: false,
    associationVerified: false,
    productionDatabaseVerified: false,
    stagingCopyVerified: false,
    moduleInstalled: false,
    effectsApplied: false,
    readAuthorized: false,
    writeAuthorized: false,
  });
}
export function assessFixtureUtilitiesModules(requestText, utilitiesText, modulesText) {
  const texts = [requestText, utilitiesText, modulesText];
  if (texts.some(t => typeof t !== 'string')) return result('invalid_input', 'CORRECT_FIXTURE');
  if (texts.some(t => t.length > 1024)) return result('input_too_large', 'CORRECT_FIXTURE');
  const all = texts.map((t, i) => parse(t, SCHEMAS[i]));
  if (all.some(v => v === null)) return result('invalid_input', 'CORRECT_FIXTURE');
  const [r, u, m] = all, observations = [u, m];
  if (all.some(v => v.version !== 1)) return result('unsupported_version', 'REVIEW_VERSION');
  if (observations.some(v => v.writeOutcome === 'uncertain')) return result('possible_write_unresolved', 'MANUAL_RECONCILIATION');
  if (all.some(v => v.lifecycle === 'cancelled')) return result('operator_cancelled', 'STOP');
  if (all.some(v => ['worker_lost', 'session_lost'].includes(v.lifecycle))) return result('context_lost', 'FRESH_FIXTURE_CONTEXT');
  if (all.some(v => v.lifecycle === 'interrupted')) return result('interrupted', 'FRESH_FIXTURE_CONTEXT');
  if (observations.some(v => v.authentication !== 'none')) return result('authentication_required', 'MANUAL_AUTH');
  for (const [key, prefix] of [['documentGeneration', 'document_generation'], ['contextGeneration', 'context_generation']]) {
    if (all.some(v => v[key] === null)) return result(prefix + '_missing', 'FRESH_FIXTURE_CONTEXT');
    if (observations.some(v => v[key] !== r[key])) return result(prefix + '_mismatch', 'FRESH_FIXTURE_CONTEXT');
  }
  if (observations.some(v => v.sequence === r.sequence)) return result('duplicate_observation', 'FRESH_FIXTURE_CONTEXT');
  if (observations.some(v => v.sequence < r.sequence)) return result('delayed_observation', 'FRESH_FIXTURE_CONTEXT');
  if (observations.some(v => v.sequence > r.sequence + 1)) return result('observation_gap', 'FRESH_FIXTURE_CONTEXT');
  if (all.some(v => v.projectToken === null || v.environmentToken === null)) return result('target_missing', 'MANUAL_FIXTURE_TARGET');
  if (all.some(v => v.projectToken !== 'fixture-project-001' || v.environmentToken !== 'fixture-production-001')) return result('target_mismatch', 'MANUAL_FIXTURE_TARGET');
  const utility = utilityReason(r, u), module = moduleReason(r, m);
  const reasons = [utility, module];
  const nextStep = reasons.some(v => /unknown|conflict|failed|untrusted/.test(v)) ? 'MANUAL_RECONCILIATION'
    : reasons.some(v => ['utilities_denied', 'approval_declined'].includes(v)) ? 'STOP' : 'MANUAL_CHECKPOINT_REVIEW';
  return result(utility === 'no_optional_utilities' ? module : utility, nextStep, utility, module);
}
function utilityReason(r, u) {
  if (r.utilityToken !== u.utilityToken || r.utilityToken === 'fixture-utility-002') return 'utilities_target_mismatch';
  if (['unknown', 'conflicting', 'failed'].includes(u.handoff)) return 'utilities_' + u.handoff;
  if (r.review === 'declined' || u.handoff === 'denied') return 'utilities_denied';
  if (r.utilityToken === null) return u.handoff === 'none' ? 'no_optional_utilities' : 'utilities_conflicting';
  if (['none', 'review_required'].includes(u.handoff)) return 'utilities_review_required';
  return u.handoff === 'configured' ? 'configuration_unverified' : 'access_unverified';
}
function moduleReason(r, m) {
  if (m.databaseToken !== 'fixture-customer-db-001') return 'module_target_mismatch';
  if (r.moduleToken === null || r.moduleToken === 'fixture-missing-module') return 'module_missing';
  if (m.moduleToken !== r.moduleToken) return 'module_selection_mismatch';
  if (m.availability !== 'available') return 'availability_' + m.availability;
  if (['conflicting', 'stale', 'unknown'].includes(m.installation)) return 'installation_' + m.installation;
  if (r.moduleToken === 'pl_auth' && m.installation !== 'not_installed'
    || r.moduleToken === 'cedar_labels' && m.installation === 'not_installed') return 'installation_baseline_conflict';
  if (m.installation === 'reported_installed') return 'installation_report_untrusted';
  if (m.approval !== 'reviewed') return 'approval_' + m.approval;
  return m.installation === 'static_installed' ? 'static_fixture_installed' : 'installation_pending';
}
