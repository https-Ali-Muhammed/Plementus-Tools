const ORIGIN = 'https://odoo-sh.fixture.invalid';
const CONFIGURATION_KEYS = 'version,fixtureVersion,expectedOrigin,selections,documentGeneration,contextGeneration,projectSlot,branchSlot,access,lifecycle';
const OBSERVATION_KEYS = 'version,fixtureVersion,origin,tabSlot,documentGeneration,contextGeneration,projectSlot,branchSlot,markers';
// Invented fixture tokens, never selectors or evidence of provider state.
const PAGES = Object.freeze({
  'fx:auth-required': 'AUTH_REQUIRED',
  'fx:project-list': 'PROJECT_LIST',
  'fx:project-detail': 'PROJECT_DETAIL',
  'fx:project-settings': 'PROJECT_SETTINGS',
  'fx:submodule-key-settings': 'SUBMODULE_KEY_SETTINGS',
  'fx:branch-build': 'BRANCH_BUILD',
  'fx:production-context': 'PRODUCTION_CONTEXT',
  'fx:staging-context': 'STAGING_CONTEXT',
});

function record(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).join(',') === keys;
}

function integer(value, maximum) {
  return Number.isInteger(value) && value >= 1 && value <= maximum;
}

function nullableInteger(value, maximum) {
  return value === null || integer(value, maximum);
}

function printable(value, maximum) {
  return typeof value === 'string' && value.length >= 1 && value.length <= maximum
    && /^[\x20-\x7e]+$/.test(value);
}

function parse(text, configuration) {
  if (!text.length || !/^[\x00-\x7f]+$/.test(text)) return null;
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (JSON.stringify(value) !== text
      || !record(value, configuration ? CONFIGURATION_KEYS : OBSERVATION_KEYS)
      || !integer(value.version, 999) || !integer(value.fixtureVersion, 999)
      || !nullableInteger(value.documentGeneration, 1000000)
      || !nullableInteger(value.contextGeneration, 1000000)
      || !nullableInteger(value.projectSlot, 3) || !nullableInteger(value.branchSlot, 3)) return null;
  if (configuration) {
    if (!printable(value.expectedOrigin, 128)
        || !Array.isArray(value.selections) || value.selections.length > 3
        || !value.selections.every(selection => record(selection, 'role,tabSlot')
          && ['odoo-sh', 'github', 'plementus'].includes(selection.role) && integer(selection.tabSlot, 3))
        || !['fixture_available', 'missing', 'denied', 'unknown'].includes(value.access)
        || !['current', 'cancelled', 'context_lost', 'unexpected_navigation'].includes(value.lifecycle)) return null;
  } else if (!(value.origin === null || printable(value.origin, 128))
      || !nullableInteger(value.tabSlot, 3)
      || !Array.isArray(value.markers) || value.markers.length > 16
      || !value.markers.every(marker => printable(marker, 64))) return null;
  return value;
}

function result(reason, pageClass = 'UNKNOWN', projectContext = 'UNAVAILABLE', branchContext = 'UNAVAILABLE') {
  let resultClass = 'MANUAL_REVIEW';
  if (['invalid_input', 'input_too_large', 'unsupported_contract_version', 'unsupported_fixture_version', 'unsupported_site'].includes(reason)) resultClass = 'REJECTED';
  else if (['selection_conflict', 'duplicate_marker', 'interruption_conflict', 'page_conflict', 'target_conflict'].includes(reason)) resultClass = 'AMBIGUOUS_PAGE';
  else if (['unsupported_marker', 'page_unknown'].includes(reason)) resultClass = 'UNKNOWN_PAGE';
  else if (reason === 'operator_cancelled') resultClass = 'CANCELLED';
  else if (reason === 'fixture_page_match') resultClass = 'FIXTURE_MATCH';

  let nextStep;
  switch (reason) {
    case 'invalid_input': case 'input_too_large': nextStep = 'CORRECT_FIXTURE'; break;
    case 'unsupported_contract_version': case 'unsupported_fixture_version': nextStep = 'REVIEW_VERSION'; break;
    case 'selection_conflict': case 'selection_missing': case 'tab_mismatch': case 'unsupported_site':
    case 'source_context_missing': case 'document_context_missing': case 'stale_generation':
    case 'context_lost': case 'unexpected_navigation': nextStep = 'FRESH_SELECTION'; break;
    case 'permission_denied': case 'permission_unavailable': nextStep = 'MANUAL_ACCESS'; break;
    case 'duplicate_marker': case 'interruption_conflict': case 'page_conflict':
    case 'unsupported_marker': case 'page_unknown': nextStep = 'MANUAL_PAGE'; break;
    case 'target_conflict': case 'target_context_missing': nextStep = 'MANUAL_TARGET'; break;
    case 'login_required': case 'mfa_required': case 'captcha_required': nextStep = 'MANUAL_AUTH'; break;
    case 'operator_cancelled': nextStep = 'STOP'; break;
    case 'fixture_page_match': nextStep = 'REVIEW_FIXTURE'; break;
  }
  return Object.freeze({
    version: 1,
    fixtureVersion: 1,
    resultClass,
    reason,
    pageClass,
    projectContext,
    branchContext,
    evidenceTier: 'SIMULATED',
    provenance: 'SYNTHETIC_UNTRUSTED',
    fixtureOnly: true,
    nextStep,
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
  });
}

export function recognizeFixtureOdooShPage(configurationText, observationText) {
  if (typeof configurationText !== 'string' || typeof observationText !== 'string') return result('invalid_input');
  if (configurationText.length > 8192 || observationText.length > 8192) return result('input_too_large');
  const configuration = parse(configurationText, true);
  const observation = parse(observationText, false);
  if (!configuration || !observation) return result('invalid_input');
  if (configuration.version !== 1 || observation.version !== 1) return result('unsupported_contract_version');
  if (configuration.fixtureVersion !== 1 || observation.fixtureVersion !== 1) return result('unsupported_fixture_version');
  if (configuration.lifecycle === 'cancelled') return result('operator_cancelled');
  if (configuration.expectedOrigin !== ORIGIN) return result('unsupported_site');
  const selections = configuration.selections;
  if (new Set(selections.map(selection => selection.role)).size !== selections.length
      || new Set(selections.map(selection => selection.tabSlot)).size !== selections.length) return result('selection_conflict');
  const selected = selections.find(selection => selection.role === 'odoo-sh');
  if (!selected) return result('selection_missing');
  if (configuration.access === 'denied') return result('permission_denied');
  if (configuration.access === 'missing' || configuration.access === 'unknown') return result('permission_unavailable');
  if (configuration.lifecycle === 'context_lost') return result('context_lost');
  if (configuration.lifecycle === 'unexpected_navigation') return result('unexpected_navigation');
  if (observation.origin === null || observation.tabSlot === null) return result('source_context_missing');
  if (observation.origin !== ORIGIN) return result('unsupported_site');
  if (observation.tabSlot !== selected.tabSlot) return result('tab_mismatch');
  if (configuration.documentGeneration === null || configuration.contextGeneration === null
      || observation.documentGeneration === null || observation.contextGeneration === null) return result('document_context_missing');
  if (configuration.documentGeneration !== observation.documentGeneration
      || configuration.contextGeneration !== observation.contextGeneration) return result('stale_generation');
  const markers = observation.markers;
  if (new Set(markers).size !== markers.length) return result('duplicate_marker');
  const mfa = markers.includes('fx:mfa-required');
  const captcha = markers.includes('fx:captcha-required');
  if (mfa && captcha) return result('interruption_conflict');
  const pages = markers.filter(marker => Object.hasOwn(PAGES, marker));
  if (pages.length > 1) return result('page_conflict');
  if (markers.some(marker => !Object.hasOwn(PAGES, marker)
      && marker !== 'fx:mfa-required' && marker !== 'fx:captcha-required')) return result('unsupported_marker');
  if ((observation.projectSlot !== null && observation.projectSlot !== configuration.projectSlot)
      || (observation.branchSlot !== null && observation.branchSlot !== configuration.branchSlot)) return result('target_conflict');
  if (mfa) return result('mfa_required');
  if (captcha) return result('captcha_required');
  const pageClass = pages.length ? PAGES[pages[0]] : 'UNKNOWN';
  if (pageClass === 'AUTH_REQUIRED') return result('login_required', pageClass, 'NOT_REQUIRED', 'NOT_REQUIRED');
  if (!pages.length) return result('page_unknown');
  const requiresProject = pageClass !== 'PROJECT_LIST';
  const requiresBranch = ['BRANCH_BUILD', 'PRODUCTION_CONTEXT', 'STAGING_CONTEXT'].includes(pageClass);
  const projectContext = !requiresProject ? 'NOT_REQUIRED'
    : configuration.projectSlot !== null && observation.projectSlot !== null ? 'AVAILABLE' : 'UNAVAILABLE';
  const branchContext = !requiresBranch ? 'NOT_REQUIRED'
    : configuration.branchSlot !== null && observation.branchSlot !== null ? 'AVAILABLE' : 'UNAVAILABLE';
  const reason = projectContext === 'UNAVAILABLE' || branchContext === 'UNAVAILABLE'
    ? 'target_context_missing' : 'fixture_page_match';
  return result(reason, pageClass, projectContext, branchContext);
}
