import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as flow from '../src/customer-odoo/apps-mock-install-fixture-flow.mjs';
import { assessFixtureCustomerApps } from '../src/customer-odoo/apps-fixture-adapter.mjs';

const { simulateFixtureCustomerAppsInstall: simulate } = flow;
const flags = 'browserObserved permissionVerified accountVerified rightsVerified subscriptionVerified approvalGranted executionAuthorized mutationAuthorized installationAuthorized trustedContinuingContext associationVerified productionDatabaseVerified stagingCopyVerified moduleInstalled effectsApplied readAuthorized writeAuthorized'.split(' ');
const labels = {
  syntheticEnvironment: ['UNRESOLVED', 'PRODUCTION_PREVIEW'],
  syntheticTestEnvironment: ['UNRESOLVED', 'AVAILABLE_NOT_SELECTED'],
  syntheticAvailability: ['UNRESOLVED', 'SYNTHETIC_AVAILABLE'],
  syntheticApproval: ['UNRESOLVED', 'SYNTHETIC_UNREVIEWED', 'SYNTHETIC_MOCK_APPROVED'],
  syntheticAttempt: ['UNRESOLVED', 'SYNTHETIC_NOT_ATTEMPTED', 'SYNTHETIC_ATTEMPT_REPORTED', 'SYNTHETIC_ATTEMPTED'],
  syntheticInstallation: ['UNRESOLVED', 'SYNTHETIC_UNCONFIRMED', 'SYNTHETIC_INSTALLED_LISTING_CONFIRMED', 'SYNTHETIC_NOT_INSTALLED'],
  syntheticReconciliation: ['UNRESOLVED', 'SYNTHETIC_REQUIRED', 'SYNTHETIC_NOT_REQUIRED', 'SYNTHETIC_RECONCILED'],
};
const keys = ['version', 'evidenceTier', 'provenance', 'fixtureOnly', 'classification', 'reason', 'nextStep', ...Object.keys(labels), ...flags];
const steps = ['CORRECT_FIXTURE', 'REVIEW_VERSION', 'STOP', 'FRESH_FIXTURE_CONTEXT', 'MANUAL_AUTH', 'MOCK_REVIEW', 'MOCK_RECONCILIATION', 'MOCK_REVIEW_COMPLETE'];
function discovery(r = {}, s = {}) {
  return assessFixtureCustomerApps(JSON.stringify({ version: 1, databaseToken: 'fixture-customer-db-001', environment: 'production',
    moduleToken: 'pl_auth', documentGeneration: 4, contextGeneration: 5, sequence: 7, review: 'reviewed', lifecycle: 'active', ...r }),
  JSON.stringify({ version: 1, page: 'customer-odoo-apps', databaseToken: 'fixture-customer-db-001', selectedEnvironment: 'production',
    testEnvironment: 'available', moduleToken: 'pl_auth', plAuthMarker: 'module-pl-auth', plAuthAvailability: 'available',
    plAuthInstallation: 'not_installed', cedarLabelsMarker: 'module-cedar-labels', cedarLabelsAvailability: 'available',
    cedarLabelsInstallation: 'static_installed', approval: 'awaiting_approval', installControl: 'disabled',
    documentGeneration: 4, contextGeneration: 5, sequence: 8, authentication: 'none', lifecycle: 'active', ...s }));
}
function fixture() {
  const identity = { version: 1, databaseToken: 'fixture-customer-db-001', environment: 'production', moduleToken: 'pl_auth',
    documentGeneration: 4, contextGeneration: 5, sequence: 8 };
  return [discovery(),
    { ...identity, operation: 'simulate', priorOutcome: 'none', lifecycle: 'active', authentication: 'none' },
    { ...identity, sequence: 9, decision: 'synthetic_approved' },
    { ...identity, sequence: 10, status: 'attempted', outcome: 'reported_success' },
    { ...identity, sequence: 11, state: 'synthetic_installed', testEnvironment: 'available',
      cedarLabelsInstallation: 'static_installed', lifecycle: 'active', authentication: 'none' },
  ];
}
function changed(patches = {}) {
  const f = fixture(); for (const [i, patch] of Object.entries(patches)) Object.assign(f[i], patch); return f;
}
function boundary(out) {
  assert.ok(out && typeof out === 'object'); assert.deepEqual(Reflect.ownKeys(out), keys); assert.ok(Object.isFrozen(out));
  assert.equal(out.version, 1); assert.equal(out.evidenceTier, 'SIMULATED'); assert.equal(out.provenance, 'SYNTHETIC_UNTRUSTED');
  assert.equal(out.fixtureOnly, true); assert.ok(steps.includes(out.nextStep));
  assert.equal(out.classification, out.nextStep === 'MOCK_REVIEW_COMPLETE' ? 'SIMULATED_CONFIRMATION'
    : out.nextStep === 'MOCK_RECONCILIATION' ? 'MOCK_RECONCILE_REQUIRED' : 'STOP');
  for (const [key, domain] of Object.entries(labels)) assert.ok(domain.includes(out[key]), key);
  for (const key of flags) assert.equal(out[key], false, key);
  assert.ok(Object.values(out).every(v => ['string', 'number', 'boolean'].includes(typeof v)));
  const text = JSON.stringify(out); assert.ok(text.length <= 2048); assert.match(text, /^[\x20-\x7e]+$/);
  assert.doesNotMatch(text, /fixture-secret|fixture-customer|https?:|<|@|approvedToInstall|installationVerified|writeAllowed/);
}
const exercised = [];
function wire(args, reason, step = 'MOCK_RECONCILIATION', reconcile) {
  const out = simulate(...args); assert.equal(out?.reason, reason); assert.equal(out?.nextStep, step); boundary(out);
  if (reconcile) assert.equal(out.syntheticReconciliation, reconcile);
  exercised.push([[...args], JSON.stringify(out)]); return out;
}
function run(patches = {}, reason = 'mock_installed_confirmed', step = 'MOCK_REVIEW_COMPLETE', reconcile) {
  return wire(changed(patches).map(JSON.stringify), reason, step, reconcile);
}
const idle = { 3: { status: 'not_attempted', outcome: 'none' }, 4: { state: 'missing' } };
const reconcile = { 1: { operation: 'reconcile', priorOutcome: 'uncertain' }, 2: { decision: 'missing' },
  3: { status: 'not_attempted', outcome: 'none' } };

test('Mock Apps baseline comes from accepted discovery; published HTML remains not installed and disabled', () => {
  const html = readFileSync(new URL('../fixtures/customer-odoo/apps.html', import.meta.url), 'utf8');
  assert.equal(discovery().reason, 'synthetic_not_installed');
  assert.match(html, /module-pl-auth" data-availability="available" data-installation="not-installed"/);
  assert.match(html, /module-cedar-labels" data-availability="available" data-installation="installed"/);
  assert.match(html, /install-control" disabled/);
  const out = run();
  assert.equal(out.syntheticEnvironment, 'PRODUCTION_PREVIEW'); assert.equal(out.syntheticTestEnvironment, 'AVAILABLE_NOT_SELECTED');
  assert.equal(out.syntheticAvailability, 'SYNTHETIC_AVAILABLE'); assert.equal(out.syntheticApproval, 'SYNTHETIC_MOCK_APPROVED');
  assert.equal(out.syntheticAttempt, 'SYNTHETIC_ATTEMPTED');
  assert.equal(out.syntheticInstallation, 'SYNTHETIC_INSTALLED_LISTING_CONFIRMED');
  assert.equal(out.syntheticReconciliation, 'SYNTHETIC_NOT_REQUIRED');
});
test('Mock Apps availability plus approval is still no attempt and no installation', () => {
  const out = run(idle, 'mock_not_attempted', 'MOCK_REVIEW');
  assert.equal(out.syntheticAttempt, 'SYNTHETIC_NOT_ATTEMPTED'); assert.equal(out.syntheticInstallation, 'SYNTHETIC_UNCONFIRMED');
  assert.equal(out.syntheticReconciliation, 'SYNTHETIC_NOT_REQUIRED');
});
for (const decision of ['missing', 'declined', 'conflicting', 'stale']) {
  test(`Mock Apps approval ${decision} blocks a hypothetical attempt`, () => {
    const out = run({ ...idle, 2: { decision } }, 'mock_approval_' + decision, 'MOCK_REVIEW', 'SYNTHETIC_NOT_REQUIRED');
    assert.equal(out.syntheticApproval, 'SYNTHETIC_UNREVIEWED'); assert.equal(out.syntheticAttempt, 'SYNTHETIC_NOT_ATTEMPTED');
  });
  test(`Mock Apps approval ${decision} cannot erase a reported attempt`, () => {
    const out = run({ 2: { decision } }, 'mock_approval_' + decision, 'MOCK_RECONCILIATION', 'SYNTHETIC_REQUIRED');
    assert.equal(out.syntheticAttempt, 'SYNTHETIC_ATTEMPT_REPORTED'); assert.equal(out.syntheticInstallation, 'SYNTHETIC_UNCONFIRMED');
  });
}
for (const outcome of ['none', 'missing', 'stale', 'timeout', 'unknown'])
  test(`Mock Apps attempted ${outcome} requires reconciliation even with installed post data`, () => {
    const out = run({ 3: { outcome } }, 'mock_result_' + outcome, 'MOCK_RECONCILIATION', 'SYNTHETIC_REQUIRED');
    assert.equal(out.syntheticAttempt, 'SYNTHETIC_ATTEMPTED'); assert.equal(out.syntheticInstallation, 'SYNTHETIC_UNCONFIRMED');
  });
for (const state of ['missing', 'stale', 'unknown', 'conflicting'])
  test(`Mock Apps successful attempt plus ${state} post state remains unconfirmed`, () => {
    run({ 4: { state } }, 'mock_post_' + state, 'MOCK_RECONCILIATION', 'SYNTHETIC_REQUIRED');
  });
test('Mock Apps failed attempt needs a separate compatible absence; contrary success is a conflict', () => {
  run({ 3: { outcome: 'failed' }, 4: { state: 'missing' } }, 'mock_post_missing', 'MOCK_RECONCILIATION');
  run({ 3: { outcome: 'failed' } }, 'mock_result_conflict', 'MOCK_RECONCILIATION');
  const out = run({ 3: { outcome: 'failed' }, 4: { state: 'synthetic_not_installed' } }, 'mock_attempt_failed', 'MOCK_REVIEW', 'SYNTHETIC_NOT_REQUIRED');
  assert.equal(out.syntheticInstallation, 'SYNTHETIC_NOT_INSTALLED');
  run({ 4: { state: 'synthetic_not_installed' } }, 'mock_result_conflict', 'MOCK_RECONCILIATION');
});
test('Mock Apps no-attempt contradictions never create an attempted or confirmed operation', () => {
  run({ ...idle, 3: { status: 'not_attempted', outcome: 'reported_success' } }, 'attempt_envelope_conflict', 'MOCK_RECONCILIATION');
  for (const state of ['synthetic_installed', 'synthetic_not_installed', 'unknown', 'stale', 'conflicting']) {
    const out = run({ ...idle, 4: { state } }, 'observation_without_attempt', 'MOCK_REVIEW');
    assert.equal(out.syntheticAttempt, 'SYNTHETIC_NOT_ATTEMPTED'); assert.equal(out.syntheticInstallation, 'SYNTHETIC_UNCONFIRMED');
  }
});
test('Mock Apps uncertainty blocks new hypothetical attempts despite fresh approval and apparent success', () => {
  for (const p of [{}, idle, { 2: { decision: 'declined' } }, { 4: { state: 'synthetic_not_installed' } }])
    run({ ...p, 1: { priorOutcome: 'uncertain' } }, 'mock_reconciliation_required', 'MOCK_RECONCILIATION', 'SYNTHETIC_REQUIRED');
});
for (const [state, reason, installation] of [
  ['synthetic_installed', 'mock_reconciled_installed', 'SYNTHETIC_INSTALLED_LISTING_CONFIRMED'],
  ['synthetic_not_installed', 'mock_reconciled_not_installed', 'SYNTHETIC_NOT_INSTALLED']])
  test(`Mock Apps explicit reconciliation ${state} observes only and grants no retry`, () => {
    const out = run({ ...reconcile, 4: { state } }, reason, 'MOCK_REVIEW_COMPLETE', 'SYNTHETIC_RECONCILED');
    assert.equal(out.syntheticAttempt, 'SYNTHETIC_NOT_ATTEMPTED'); assert.equal(out.syntheticApproval, 'SYNTHETIC_UNREVIEWED');
    assert.equal(out.syntheticInstallation, installation);
    run({ 1: { priorOutcome: 'uncertain' } }, 'mock_reconciliation_required', 'MOCK_RECONCILIATION');
  });
test('Mock Apps reconciliation rejects missing history fresh approval or another attempt', () => {
  run({ ...reconcile, 1: { operation: 'reconcile', priorOutcome: 'none' } }, 'reconciliation_without_history', 'MOCK_REVIEW');
  for (const p of [{ 2: { decision: 'synthetic_approved' } }, { 2: { decision: 'declined' } },
    { 3: { status: 'attempted', outcome: 'reported_success' } }, { 3: { status: 'not_attempted', outcome: 'failed' } }])
    run({ ...reconcile, ...p }, 'reconciliation_attempt_conflict', 'MOCK_RECONCILIATION', 'SYNTHETIC_REQUIRED');
  for (const state of ['missing', 'stale', 'unknown', 'conflicting'])
    run({ ...reconcile, 4: { state } }, 'mock_post_' + state, 'MOCK_RECONCILIATION', 'SYNTHETIC_REQUIRED');
});

const cases = [
  [{ 1: { version: 2 } }, 'unsupported_version', 'REVIEW_VERSION'],
  [{ 1: { lifecycle: 'cancelled' } }, 'operator_cancelled', 'STOP'],
  [{ 4: { lifecycle: 'worker_lost' } }, 'context_lost', 'FRESH_FIXTURE_CONTEXT'],
  [{ 1: { lifecycle: 'interrupted' } }, 'interrupted', 'FRESH_FIXTURE_CONTEXT'],
  [{ 4: { authentication: 'login' } }, 'authentication_required', 'MANUAL_AUTH'],
  [{ 1: { priorOutcome: 'uncertain' } }, 'mock_reconciliation_required', 'MOCK_RECONCILIATION'],
  [{ 1: { databaseToken: 'fixture-customer-db-002' } }, 'target_incompatible', 'MOCK_REVIEW'],
  [{ 1: { documentGeneration: null } }, 'context_missing', 'FRESH_FIXTURE_CONTEXT'],
  [{ 1: { sequence: 999998 } }, 'sequence_exhausted', 'FRESH_FIXTURE_CONTEXT'],
  [{ 2: { moduleToken: 'cedar_labels' } }, 'approval_context_mismatch', 'FRESH_FIXTURE_CONTEXT'],
  [{ 2: { sequence: 8 } }, 'approval_sequence_mismatch', 'FRESH_FIXTURE_CONTEXT'],
  [{ 3: { databaseToken: 'fixture-customer-db-002' } }, 'attempt_context_mismatch', 'FRESH_FIXTURE_CONTEXT'],
  [{ 3: { sequence: 9 } }, 'attempt_sequence_mismatch', 'FRESH_FIXTURE_CONTEXT'],
  [{ 4: { environment: 'test' } }, 'observation_context_mismatch', 'FRESH_FIXTURE_CONTEXT'],
  [{ 4: { sequence: 10 } }, 'observation_sequence_mismatch', 'FRESH_FIXTURE_CONTEXT'],
  [{ 4: { testEnvironment: 'selected' } }, 'post_catalog_conflict', 'MOCK_RECONCILIATION'],
  [{ 2: { decision: 'missing' } }, 'mock_approval_missing', 'MOCK_RECONCILIATION'],
  [{ 3: { outcome: 'timeout' } }, 'mock_result_timeout', 'MOCK_RECONCILIATION'],
  [{ 4: { state: 'stale' } }, 'mock_post_stale', 'MOCK_RECONCILIATION'],
];
for (const [i, [patch, reason, step]] of cases.entries())
  test(`Mock Apps failure ${i + 1}: ${reason}`, () => run(patch, reason, step));
test('Mock Apps compatible failure pairs obey exact precedence and preserve uncertain attempts', () => {
  let pairs = 0;
  for (let i = 0; i < cases.length; i++) for (let j = i + 1; j < cases.length; j++) {
    const [a, reason, step] = cases[i], [b] = cases[j];
    if (Object.keys(a).some(side => Object.keys(a[side]).some(k => Object.hasOwn(b[side] || {}, k)))) continue;
    const p = {}; for (const side of new Set([...Object.keys(a), ...Object.keys(b)])) p[side] = { ...b[side], ...a[side] };
    run(p, reason, step, i === 0 ? 'UNRESOLVED' : 'SYNTHETIC_REQUIRED'); pairs++;
  }
  assert.ok(pairs > 140);
});
for (const side of [1, 4]) test(`Mock Apps lifecycle and authentication at envelope ${side} preserve uncertainty`, () => {
  for (const [lifecycle, reason, step] of [['cancelled', 'operator_cancelled', 'STOP'],
    ['interrupted', 'interrupted', 'FRESH_FIXTURE_CONTEXT'], ['worker_lost', 'context_lost', 'FRESH_FIXTURE_CONTEXT'],
    ['session_lost', 'context_lost', 'FRESH_FIXTURE_CONTEXT']]) {
    run({ [side]: { lifecycle } }, reason, step, 'SYNTHETIC_REQUIRED');
    run({ ...idle, [side]: { ...idle[side], lifecycle } }, reason, step, 'SYNTHETIC_NOT_REQUIRED');
    run({ ...reconcile, [side]: { ...reconcile[side], lifecycle } }, reason, step, 'SYNTHETIC_REQUIRED');
  }
  for (const authentication of ['login', 'mfa', 'captcha', 'session_expired'])
    run({ [side]: { authentication } }, 'authentication_required', 'MANUAL_AUTH', 'SYNTHETIC_REQUIRED');
});
test('Mock Apps every identity field and generation must agree on all three later envelopes', () => {
  for (const [side, kind] of [[2, 'approval'], [3, 'attempt'], [4, 'observation']])
    for (const [key, values] of [['databaseToken', [null, 'fixture-customer-db-002']], ['environment', [null, 'test']],
      ['moduleToken', [null, 'cedar_labels', 'fixture-missing-module']], ['documentGeneration', [null, 1, 1000000]],
      ['contextGeneration', [null, 1, 1000000]]]) for (const value of values) {
      const p = { [side]: { [key]: value } };
      run(p, kind + '_context_mismatch', 'FRESH_FIXTURE_CONTEXT', 'SYNTHETIC_REQUIRED');
      run({ ...reconcile, [side]: { ...reconcile[side], [key]: value } }, kind + '_context_mismatch', 'FRESH_FIXTURE_CONTEXT', 'SYNTHETIC_REQUIRED');
    }
});
test('Mock Apps duplicate delayed future swapped and out-of-order observations fail closed', () => {
  for (const [side, kind, expected] of [[2, 'approval', 9], [3, 'attempt', 10], [4, 'observation', 11]])
    for (const sequence of [0, 7, 8, expected - 1, expected + 1, 1000000])
      run({ [side]: { sequence } }, kind + '_sequence_mismatch', 'FRESH_FIXTURE_CONTEXT');
  const args = fixture().map(JSON.stringify); [args[2], args[3]] = [args[3], args[2]];
  wire(args, 'invalid_input', 'CORRECT_FIXTURE');
});
test('Mock Apps missing targets Test and static cedar_labels cannot become installation targets', () => {
  for (const [key, values] of [['databaseToken', [null, 'fixture-customer-db-002']], ['environment', [null, 'test']],
    ['moduleToken', [null, 'cedar_labels', 'fixture-missing-module']]]) for (const value of values) {
    const p = {}; for (const side of [1, 2, 3, 4]) p[side] = { [key]: value };
    run(p, 'target_incompatible', 'MOCK_REVIEW');
  }
  for (const key of ['documentGeneration', 'contextGeneration']) run({ 1: { [key]: null } }, 'context_missing', 'FRESH_FIXTURE_CONTEXT');
});
test('Mock Apps unselected Test and existing cedar listing remain distinct and static', () => {
  for (const key of ['testEnvironment', 'cedarLabelsInstallation'])
    for (const value of key === 'testEnvironment' ? ['selected', 'missing', 'stale', 'unknown', 'conflicting'] : ['not_installed', 'missing', 'stale', 'unknown', 'conflicting']) {
      run({ 4: { [key]: value } }, 'post_catalog_conflict', 'MOCK_RECONCILIATION');
      run({ ...idle, 4: { state: 'missing', [key]: value } }, 'post_catalog_conflict', 'MOCK_REVIEW');
    }
});
test('Mock Apps only the exact compatible accepted discovery result is admitted', () => {
  const variants = [discovery({ review: 'pending' }), discovery({ review: 'declined' }), discovery({}, { installControl: 'enabled' }),
    discovery({ moduleToken: 'cedar_labels' }, { moduleToken: 'cedar_labels' }), discovery({}, { plAuthAvailability: 'unknown' }),
    discovery({}, { selectedEnvironment: 'test' }), discovery({}, { documentGeneration: 9 }), discovery({}, { plAuthInstallation: 'reported_installed' })];
  const base = discovery();
  for (const key of Object.keys(base)) {
    const missing = { ...base }; delete missing[key]; variants.push(missing);
    variants.push({ ...base, [key]: typeof base[key] === 'boolean' ? !base[key] : 'fixture-secret' });
  }
  variants.push({ ...base, extra: true }, Object.fromEntries(Object.entries(base).reverse()));
  for (const value of variants) { const args = fixture().map(JSON.stringify); args[0] = JSON.stringify(value); wire(args, 'discovery_incompatible', 'MOCK_REVIEW'); }
  for (const value of ['', '{', '{}', 'null', '[]', ' ' + JSON.stringify(base), JSON.stringify(base).replace('"version":1', '"version":1,"version":1')]) {
    const args = fixture().map(JSON.stringify); args[0] = value; wire(args, 'discovery_incompatible', 'MOCK_REVIEW');
  }
});

for (const side of [1, 2, 3, 4]) {
  test(`Mock Apps envelope ${side} is closed ordered flat and bounded`, () => {
    const base = fixture();
    const reject = value => { const args = base.map(JSON.stringify); args[side] = JSON.stringify(value); wire(args, 'invalid_input', 'CORRECT_FIXTURE'); };
    for (const key of Object.keys(base[side])) {
      const missing = { ...base[side] }; delete missing[key]; reject(missing);
      for (const value of [true, false, [], {}, 1.5, 'fixture-secret']) reject({ ...base[side], [key]: value });
    }
    for (const key of ['__proto__', 'constructor', 'url', 'html', 'selector', 'command', 'token', 'credentials', ...flags])
      reject({ ...base[side], [key]: true });
    reject(Object.fromEntries(Object.entries(base[side]).reverse()));
    for (const value of [null, [], 1, true, 'fixture-secret']) reject(value);
    for (const key of ['version', 'sequence', 'documentGeneration', 'contextGeneration'])
      for (const value of [-1, key === 'version' ? 1000 : 1000001, 1.5, '1', Number.MAX_SAFE_INTEGER]) reject({ ...base[side], [key]: value });
    reject({ ...base[side], version: 0 }); reject({ ...base[side], documentGeneration: 0 }); reject({ ...base[side], contextGeneration: 0 });
    for (const version of [2, 999]) run({ [side]: { version } }, 'unsupported_version', 'REVIEW_VERSION');
  });
  test(`Mock Apps envelope ${side} rejects noncanonical and malformed JSON without echo`, () => {
    const args = fixture().map(JSON.stringify), text = args[side];
    for (const bad of ['', '{}', 'null', '{', '[1]', '<html>fixture-secret</html>', 'https://fixture-secret.invalid',
      ' ' + text, text + '\n', '\u00a0' + text, text.replace('"version":1', '"version":1.0'),
      text.replace('"version":1', '"version":1e0'), text.replace('"version":1', '"version":1,"version":1'),
      text.replace('"version":1', '"version":2,"version":1'), text.replace('"version"', '"ver\\u0073ion"'),
      text.replace('fixture-customer', 'fixture\\u002dcustomer'), text.replace(':1,', ': 1,'), text.replace(':1,', ':NaN,'),
      text.replace(':1,', ':Infinity,'), text.slice(0, -1) + ',}', text.replace(':1,', ':01,')]) {
      const a = [...args]; a[side] = bad; wire(a, 'invalid_input', 'CORRECT_FIXTURE');
    }
    const a = [...args]; a[side] = text.replace(/"sequence":\d+/, '"sequence":-0'); wire(a, 'invalid_input', 'CORRECT_FIXTURE');
  });
}
test('Mock Apps size and primitive checks cover all inputs before semantic results', () => {
  for (const side of [0, 1, 2, 3, 4]) for (const extra of [0, 1]) {
    const args = fixture().map(JSON.stringify), max = side === 0 ? 2048 : 1024;
    args[side] += ' '.repeat(max + extra - args[side].length);
    wire(args, extra ? 'input_too_large' : side === 0 ? 'discovery_incompatible' : 'invalid_input', extra || side !== 0 ? 'CORRECT_FIXTURE' : 'MOCK_REVIEW');
  }
  const args = fixture().map(JSON.stringify); args[1] = '{}'; args[2] = ' '.repeat(1025);
  wire(args, 'input_too_large', 'CORRECT_FIXTURE'); args[4] = {}; wire(args, 'invalid_input', 'CORRECT_FIXTURE');
  const a = changed({ 1: { version: 2, lifecycle: 'cancelled' } }).map(JSON.stringify); a[4] = '{}';
  wire(a, 'invalid_input', 'CORRECT_FIXTURE'); a[4] = JSON.stringify(fixture()[4]); a[0] = '{}';
  wire(a, 'unsupported_version', 'REVIEW_VERSION');
});
test('Mock Apps hostile objects and revoked callable proxies never execute hooks on any input', () => {
  let touched = 0; const trap = () => { touched++; throw Error('fixture-secret'); };
  const hostile = Object.defineProperties({}, { length: { get: trap }, toString: { value: trap }, toJSON: { value: trap }, [Symbol.toPrimitive]: { value: trap } });
  const proxy = new Proxy({}, Object.fromEntries(['get', 'ownKeys', 'getPrototypeOf', 'getOwnPropertyDescriptor', 'has'].map(k => [k, trap])));
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const bad of [hostile, proxy, revoked.proxy, new Proxy(() => {}, { get: trap, apply: trap }),
    new String('{}'), null, undefined, [], 1, true, Symbol('fixture-secret'), 1n]) for (const side of [0, 1, 2, 3, 4]) {
    const args = fixture().map(JSON.stringify); args[side] = bad; wire(args, 'invalid_input', 'CORRECT_FIXTURE');
  }
  assert.equal(touched, 0);
});
test('Mock Apps numeric limits support consistent rounds without durable freshness', () => {
  for (const generation of [1, 1000000]) for (const sequence of [0, 999997]) {
    const p = {}; for (const side of [1, 2, 3, 4]) p[side] = { documentGeneration: generation, contextGeneration: generation, sequence: sequence + side - 1 };
    run(p);
  }
});
test('Mock Apps records are immutable and stateless replay cannot authenticate or remember history', () => {
  const first = run(), second = run(); assert.deepEqual(first, second); assert.notEqual(first, second);
  assert.throws(() => { first.moduleInstalled = true; }, TypeError); assert.throws(() => { first.writeAllowed = true; }, TypeError);
  assert.throws(() => { delete first.reason; }, TypeError);
  run({ 3: { outcome: 'unknown' } }, 'mock_result_unknown', 'MOCK_RECONCILIATION');
  run({ 1: { lifecycle: 'cancelled' } }, 'operator_cancelled', 'STOP');
  assert.deepEqual(run(), first);
  const args = fixture().map(JSON.stringify); args[0] = JSON.stringify(first); wire(args, 'discovery_incompatible', 'MOCK_REVIEW');
});
test('apps mock-install isolation: initialization evaluation and reconciliation access no capabilities or consumers', () => {
  assert.deepEqual(Object.keys(flow), ['simulateFixtureCustomerAppsInstall']);
  const source = readFileSync(new URL('../src/customer-odoo/apps-mock-install-fixture-flow.mjs', import.meta.url), 'utf8');
  const names = 'import require fetch XMLHttpRequest WebSocket chrome browser localStorage sessionStorage indexedDB process eval Function globalThis window document navigator Date performance setTimeout setInterval setImmediate queueMicrotask Worker Promise console'.split(' ');
  assert.doesNotMatch(source, new RegExp('\\b(?:' + names.join('|') + ')\\b'));
  assert.doesNotMatch(source, /Math\.random|node:|child_process|apps-fixture-adapter|assessFixtureCustomerApps|\.click\s*\(/);
  for (const f of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true }))
    if (f.isFile() && /\.(mjs|js|html|json)$/.test(f.name) && f.name !== 'apps-mock-install-fixture-flow.mjs')
      assert.doesNotMatch(readFileSync(`${f.parentPath}/${f.name}`, 'utf8'), /apps-mock-install-fixture-flow|simulateFixtureCustomerAppsInstall/);
  let touched = 0; const context = {};
  for (const key of [...names, 'location', 'caches', 'clipboard']) Object.defineProperty(context, key, { get() { touched++; throw Error('capability'); } });
  const isolated = runInNewContext(source.replace('export function', 'function') + '\nsimulateFixtureCustomerAppsInstall;', context,
    { codeGeneration: { strings: false, wasm: false } });
  // Filtered isolation runs must exercise their own behavior, independently of other tests.
  for (const [p, reason, step] of [[{}, 'mock_installed_confirmed', 'MOCK_REVIEW_COMPLETE'], ...cases,
    [idle, 'mock_not_attempted', 'MOCK_REVIEW'], [reconcile, 'mock_reconciled_installed', 'MOCK_REVIEW_COMPLETE'],
    [{ 3: { outcome: 'failed' }, 4: { state: 'synthetic_not_installed' } }, 'mock_attempt_failed', 'MOCK_REVIEW'],
    [{ 2: { decision: 'declined' } }, 'mock_approval_declined', 'MOCK_RECONCILIATION'],
    [{ 4: { state: 'missing' } }, 'mock_post_missing', 'MOCK_RECONCILIATION']]) {
    const out = isolated(...changed(p).map(JSON.stringify)); assert.equal(out?.reason, reason); assert.equal(out?.nextStep, step); boundary(out);
  }
  for (const [args, expected] of exercised) assert.equal(JSON.stringify(isolated(...args)), expected);
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const side of [0, 1, 2, 3, 4]) { const args = fixture().map(JSON.stringify); args[side] = revoked.proxy; assert.equal(isolated(...args)?.reason, 'invalid_input'); }
  assert.equal(touched, 0);
});
