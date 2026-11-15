const DATABASES = [null, 'fixture-customer-db-001', 'fixture-customer-db-002'];
const ENVIRONMENTS = [null, 'production', 'test'];
const MODULES = [null, 'pl_auth', 'cedar_labels', 'fixture-missing-module'];
const MARKERS = [null, 'module-pl-auth', 'module-cedar-labels'];
const AVAILABILITY = ['available', 'missing', 'unknown', 'stale', 'conflicting'];
const INSTALLATION = ['not_installed', 'static_installed', 'reported_installed', 'missing', 'unknown', 'stale', 'conflicting'];
const LIFECYCLES = ['active', 'cancelled', 'interrupted', 'worker_lost', 'session_lost'];
const GENERATIONS = [['documentGeneration', 1, 1000000, true], ['contextGeneration', 1, 1000000, true]];
const SCHEMAS = [
  [['version', 1, 999], ['databaseToken', DATABASES], ['environment', ENVIRONMENTS], ['moduleToken', MODULES],
    ...GENERATIONS, ['sequence', 0, 999999], ['review', ['missing', 'pending', 'reviewed', 'declined']], ['lifecycle', LIFECYCLES]],
  [['version', 1, 999], ['page', [null, 'customer-odoo-apps', 'plementus-database-info']], ['databaseToken', DATABASES],
    ['selectedEnvironment', ENVIRONMENTS], ['testEnvironment', ['available', 'selected', 'missing', 'unknown', 'stale', 'conflicting']],
    ['moduleToken', MODULES], ['plAuthMarker', MARKERS], ['plAuthAvailability', AVAILABILITY], ['plAuthInstallation', INSTALLATION],
    ['cedarLabelsMarker', MARKERS], ['cedarLabelsAvailability', AVAILABILITY], ['cedarLabelsInstallation', INSTALLATION],
    ['approval', ['awaiting_approval', 'missing', 'declined', 'conflicting', 'reported_approved']],
    ['installControl', ['disabled', 'enabled', 'missing', 'unknown']], ...GENERATIONS, ['sequence', 1, 1000000],
    ['authentication', ['none', 'login', 'mfa', 'captcha', 'session_expired']], ['lifecycle', LIFECYCLES]],
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
    classification: nextStep === 'MANUAL_APPS_REVIEW' ? 'MANUAL_REVIEW' : 'STOP', reason, nextStep,
    syntheticEnvironment: states[0], syntheticTestEnvironment: states[1], syntheticAvailability: states[2],
    syntheticInstallation: states[3], syntheticApproval: states[4],
    browserObserved: false, permissionVerified: false, accountVerified: false, rightsVerified: false,
    subscriptionVerified: false, approvalGranted: false, executionAuthorized: false, mutationAuthorized: false,
    installationAuthorized: false, trustedContinuingContext: false, associationVerified: false,
    productionDatabaseVerified: false, stagingCopyVerified: false, moduleInstalled: false,
    effectsApplied: false, readAuthorized: false, writeAuthorized: false,
  });
}

export function assessFixtureCustomerApps(requestText, snapshotText) {
  if (typeof requestText !== 'string' || typeof snapshotText !== 'string') return result('invalid_input', 'CORRECT_FIXTURE');
  if (requestText.length > 1024 || snapshotText.length > 1024) return result('input_too_large', 'CORRECT_FIXTURE');
  const r = parse(requestText, SCHEMAS[0]), s = parse(snapshotText, SCHEMAS[1]);
  if (r === null || s === null) return result('invalid_input', 'CORRECT_FIXTURE');
  if (r.version !== 1 || s.version !== 1) return result('unsupported_version', 'REVIEW_VERSION');
  const all = [r, s];
  if (all.some(v => v.lifecycle === 'cancelled')) return result('operator_cancelled', 'STOP');
  if (all.some(v => ['worker_lost', 'session_lost'].includes(v.lifecycle))) return result('context_lost', 'FRESH_FIXTURE_CONTEXT');
  if (all.some(v => v.lifecycle === 'interrupted')) return result('interrupted', 'FRESH_FIXTURE_CONTEXT');
  if (s.authentication !== 'none') return result('authentication_required', 'MANUAL_AUTH');
  for (const [key, prefix] of [['documentGeneration', 'document_generation'], ['contextGeneration', 'context_generation']]) {
    if (all.some(v => v[key] === null)) return result(prefix + '_missing', 'FRESH_FIXTURE_CONTEXT');
    if (r[key] !== s[key]) return result(prefix + '_mismatch', 'FRESH_FIXTURE_CONTEXT');
  }
  if (s.sequence === r.sequence) return result('duplicate_observation', 'FRESH_FIXTURE_CONTEXT');
  if (s.sequence < r.sequence) return result('delayed_observation', 'FRESH_FIXTURE_CONTEXT');
  if (s.sequence > r.sequence + 1) return result('observation_gap', 'FRESH_FIXTURE_CONTEXT');
  if (s.page === null) return result('page_missing', 'MANUAL_FIXTURE_TARGET');
  if (s.page !== 'customer-odoo-apps') return result('page_mismatch', 'MANUAL_FIXTURE_TARGET');
  if (all.some(v => v.databaseToken === null)) return result('database_missing', 'MANUAL_FIXTURE_TARGET');
  if (all.some(v => v.databaseToken !== 'fixture-customer-db-001')) return result('database_mismatch', 'MANUAL_FIXTURE_TARGET');
  if (r.environment === null || s.selectedEnvironment === null) return result('environment_missing', 'MANUAL_FIXTURE_TARGET');
  if (r.environment !== s.selectedEnvironment) return result('environment_mismatch', 'MANUAL_FIXTURE_TARGET');
  if (s.selectedEnvironment !== 'production') return result('environment_baseline_conflict', 'MANUAL_FIXTURE_TARGET');
  if (s.testEnvironment !== 'available') return result('test_environment_' + s.testEnvironment, 'MANUAL_FIXTURE_TARGET');
  if (r.moduleToken === null || r.moduleToken === 'fixture-missing-module') return result('module_missing', 'MANUAL_APPS_REVIEW');
  if (s.moduleToken !== r.moduleToken) return result('module_selection_mismatch', 'MANUAL_FIXTURE_TARGET');
  const availability = r.moduleToken === 'pl_auth' ? s.plAuthAvailability : s.cedarLabelsAvailability;
  const installation = r.moduleToken === 'pl_auth' ? s.plAuthInstallation : s.cedarLabelsInstallation;
  const states = ['PRODUCTION_PREVIEW', 'AVAILABLE_NOT_SELECTED',
    ...[availability, installation, s.approval].map(v => 'SYNTHETIC_' + v.toUpperCase())];
  if (s.installControl === 'enabled') return result('install_control_conflict', 'STOP', states);
  if (s.installControl !== 'disabled') return result('install_control_' + s.installControl, 'MANUAL_APPS_REVIEW', states);
  if (s.plAuthMarker === null || s.cedarLabelsMarker === null) return result('catalog_marker_missing', 'MANUAL_APPS_REVIEW', states);
  if (s.plAuthMarker !== 'module-pl-auth' || s.cedarLabelsMarker !== 'module-cedar-labels')
    return result('catalog_marker_conflict', 'MANUAL_APPS_REVIEW', states);
  for (const [kind, values] of [['availability', [s.plAuthAvailability, s.cedarLabelsAvailability]],
    ['installation', [s.plAuthInstallation, s.cedarLabelsInstallation]]])
    for (const state of ['conflicting', 'stale', 'missing', 'unknown'])
      if (values.includes(state)) return result(kind + '_' + state, 'MANUAL_APPS_REVIEW', states);
  if (s.plAuthInstallation !== 'not_installed' || s.cedarLabelsInstallation === 'not_installed')
    return result('installation_baseline_conflict', 'MANUAL_APPS_REVIEW', states);
  if (s.cedarLabelsInstallation === 'reported_installed') return result('installation_report_untrusted', 'MANUAL_APPS_REVIEW', states);
  if (r.review === 'declined') return result('review_declined', 'STOP', states);
  if (s.approval === 'declined') return result('approval_declined', 'STOP', states);
  if (s.approval === 'conflicting') return result('approval_conflicting', 'MANUAL_APPS_REVIEW', states);
  if (s.approval === 'reported_approved') return result('approval_baseline_conflict', 'MANUAL_APPS_REVIEW', states);
  if (r.review === 'missing') return result('review_missing', 'MANUAL_APPS_REVIEW', states);
  if (s.approval === 'missing') return result('approval_missing', 'MANUAL_APPS_REVIEW', states);
  if (r.review === 'pending') return result('approval_awaiting_review', 'MANUAL_APPS_REVIEW', states);
  // shortcut: caller rounds have no authenticated history; upgrade only under a separately authorized context contract.
  return result(installation === 'not_installed' ? 'synthetic_not_installed' : 'synthetic_static_installed', 'MANUAL_APPS_REVIEW', states);
}
