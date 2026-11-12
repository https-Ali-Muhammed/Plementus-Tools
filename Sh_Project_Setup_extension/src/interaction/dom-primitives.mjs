const FALSE_FLAGS = Object.freeze({
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
const CONTEXT_KEYS = 'version,resultClass,reason,recognizerReason,evidenceTier,provenance,fixtureOnly,nextStep,'
  + Object.keys(FALSE_FLAGS).join(',');
const SNAPSHOT_KEYS = 'version,documentGeneration,contextGeneration,projectSlot,branchSlot,interruption,elements';
const ELEMENT_KEYS = 'token,kind,visible,enabled,documentGeneration,contextGeneration,projectSlot,branchSlot';
const INTENT_KEYS = 'version,operation,token,expectedKind,documentGeneration,contextGeneration,projectSlot,branchSlot,value';
const REASONS = ('invalid_input,input_too_large,unsupported_binding_version,unsupported_contract_version,'
  + 'unsupported_fixture_version,operator_cancelled,unsupported_site,selection_conflict,selection_missing,'
  + 'permission_denied,permission_unavailable,context_lost,context_restarted,unexpected_navigation,'
  + 'source_context_missing,tab_mismatch,document_context_missing,stale_generation,duplicate_marker,'
  + 'interruption_conflict,page_conflict,unsupported_marker,target_conflict,mfa_required,captcha_required,'
  + 'login_required,page_unknown,target_context_missing,binding_selection_missing,binding_tab_mismatch,'
  + 'binding_origin_mismatch,binding_generation_missing,binding_generation_stale,binding_target_mismatch,'
  + 'account_context_conflicting,account_context_unavailable,account_context_drift,account_continuity_unknown,'
  + 'binding_permission_denied,binding_permission_unavailable,operation_rights_denied,'
  + 'operation_rights_unavailable,synthetic_context_match').split(',');
const CATALOG = Object.freeze({ 'toy:button-a': 'button', 'toy:input-a': 'input', 'toy:label-a': 'label' });
const KINDS = ['button', 'input', 'label'];
const OPERATIONS = ['inspect', 'click_preview', 'fill_preview'];
const AUTH_REASONS = ['login_required', 'mfa_required', 'captcha_required'];

function result(reason, nextStep, resultClass = 'MANUAL_REVIEW') {
  return Object.freeze({ version: 1, resultClass, reason, evidenceTier: 'SIMULATED',
    provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true, previewOnly: true, nextStep, ...FALSE_FLAGS });
}

function record(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).join(',') === keys;
}

function parse(text) {
  if (!text.length || !/^[\x20-\x7e]+$/.test(text)) return null;
  try {
    const value = JSON.parse(text);
    return JSON.stringify(value) === text ? value : null;
  } catch {
    return null;
  }
}

function integer(value, maximum) {
  return Number.isInteger(value) && value >= 1 && value <= maximum;
}

function continuityShape(value) {
  return integer(value.documentGeneration, 1000000) && integer(value.contextGeneration, 1000000)
    && integer(value.projectSlot, 3) && integer(value.branchSlot, 3);
}

function token(value) {
  return typeof value === 'string' && /^toy:[a-z-]{1,16}$/.test(value);
}

function contextShape(value) {
  return record(value, CONTEXT_KEYS) && integer(value.version, 999)
    && ['SYNTHETIC_CONTEXT_MATCH', 'MANUAL_REVIEW', 'REJECTED', 'CANCELLED'].includes(value.resultClass)
    && REASONS.includes(value.reason)
    && [...REASONS, 'NOT_ASSESSED', 'fixture_page_match'].includes(value.recognizerReason)
    && value.evidenceTier === 'SIMULATED' && value.provenance === 'SYNTHETIC_UNTRUSTED'
    && value.fixtureOnly === true
    && ['CORRECT_FIXTURE', 'REVIEW_VERSION', 'STOP', 'FRESH_SELECTION', 'MANUAL_TARGET',
      'MANUAL_ACCOUNT', 'MANUAL_ACCESS', 'MANUAL_AUTH', 'MANUAL_PAGE', 'REVIEW_FIXTURE'].includes(value.nextStep)
    && Object.keys(FALSE_FLAGS).every(key => value[key] === false);
}

function elementShape(value) {
  return record(value, ELEMENT_KEYS) && token(value.token) && KINDS.includes(value.kind)
    && typeof value.visible === 'boolean' && typeof value.enabled === 'boolean' && continuityShape(value);
}

function snapshotShape(value) {
  return record(value, SNAPSHOT_KEYS) && integer(value.version, 999) && continuityShape(value)
    && ['none', 'login', 'mfa', 'captcha', 'unexpected_dialog'].includes(value.interruption)
    && Array.isArray(value.elements) && value.elements.length <= 8 && value.elements.every(elementShape);
}

function intentShape(value) {
  return record(value, INTENT_KEYS) && integer(value.version, 999) && continuityShape(value)
    && typeof value.operation === 'string' && /^[a-z_]{1,24}$/.test(value.operation)
    && token(value.token) && KINDS.includes(value.expectedKind)
    && [null, 'toy-value-a', 'toy-value-b'].includes(value.value);
}

function sameGenerations(a, b) {
  return a.documentGeneration === b.documentGeneration && a.contextGeneration === b.contextGeneration;
}

function sameTarget(a, b) {
  return a.projectSlot === b.projectSlot && a.branchSlot === b.branchSlot;
}

export function previewFixtureDomInteraction(contextText, snapshotText, intentText) {
  if (typeof contextText !== 'string' || typeof snapshotText !== 'string' || typeof intentText !== 'string')
    return result('invalid_input', 'CORRECT_FIXTURE', 'REJECTED');
  if (contextText.length > 2048 || snapshotText.length > 4096 || intentText.length > 512)
    return result('input_too_large', 'CORRECT_FIXTURE', 'REJECTED');
  const context = parse(contextText);
  const snapshot = parse(snapshotText);
  const intent = parse(intentText);
  if (!contextShape(context) || !snapshotShape(snapshot) || !intentShape(intent))
    return result('invalid_input', 'CORRECT_FIXTURE', 'REJECTED');
  if (context.version !== 1 || snapshot.version !== 1 || intent.version !== 1)
    return result('unsupported_version', 'REVIEW_VERSION', 'REJECTED');
  if (!OPERATIONS.includes(intent.operation)) return result('unsupported_operation', 'CORRECT_FIXTURE', 'REJECTED');
  if (intent.operation === 'fill_preview' ? intent.value === null : intent.value !== null)
    return result('invalid_intent', 'CORRECT_FIXTURE', 'REJECTED');
  // Serialized fixture evidence cannot authenticate or bind this inventory.
  if (context.resultClass !== 'SYNTHETIC_CONTEXT_MATCH' || context.reason !== 'synthetic_context_match'
      || context.recognizerReason !== 'fixture_page_match' || context.nextStep !== 'REVIEW_FIXTURE') {
    const step = AUTH_REASONS.includes(context.reason) || AUTH_REASONS.includes(context.recognizerReason)
      || context.nextStep === 'MANUAL_AUTH' ? 'MANUAL_AUTH'
      : context.resultClass === 'CANCELLED' || context.reason === 'operator_cancelled'
        || context.nextStep === 'STOP' ? 'STOP' : 'FRESH_SELECTION';
    return result('context_not_matching', step);
  }
  if (snapshot.interruption !== 'none') return result('manual_interruption',
    snapshot.interruption === 'unexpected_dialog' ? 'MANUAL_DIALOG' : 'MANUAL_AUTH');
  if (!sameGenerations(snapshot, intent)) return result('stale_generation', 'FRESH_SELECTION');
  if (!sameTarget(snapshot, intent)) return result('target_mismatch', 'MANUAL_TARGET');
  if (!Object.hasOwn(CATALOG, intent.token) || snapshot.elements.some(item => !Object.hasOwn(CATALOG, item.token)))
    return result('unknown_element', 'MANUAL_SELECTOR');
  const matches = snapshot.elements.filter(item => item.token === intent.token);
  if (matches.length === 0) return result('element_missing', 'MANUAL_SELECTOR');
  if (matches.length !== 1) return result('element_ambiguous', 'MANUAL_SELECTOR');
  const match = matches[0];
  if (!sameGenerations(snapshot, match)) return result('stale_generation', 'FRESH_SELECTION');
  if (!sameTarget(snapshot, match)) return result('target_mismatch', 'MANUAL_TARGET');
  if (!match.visible) return result('element_hidden', 'MANUAL_SELECTOR');
  if (!match.enabled) return result('element_disabled', 'MANUAL_SELECTOR');
  if (match.kind !== intent.expectedKind || CATALOG[intent.token] !== match.kind
      || (intent.operation === 'click_preview' && match.kind !== 'button')
      || (intent.operation === 'fill_preview' && match.kind !== 'input'))
    return result('kind_mismatch', 'CORRECT_FIXTURE', 'BLOCKED');
  return result(intent.operation === 'inspect' ? 'inspection_preview' : intent.operation,
    'REVIEW_FIXTURE', 'PREVIEW_READY');
}
