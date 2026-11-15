import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as adapter from '../src/customer-odoo/apps-fixture-adapter.mjs';

const { assessFixtureCustomerApps } = adapter;
const flags = 'browserObserved permissionVerified accountVerified rightsVerified subscriptionVerified approvalGranted executionAuthorized mutationAuthorized installationAuthorized trustedContinuingContext associationVerified productionDatabaseVerified stagingCopyVerified moduleInstalled effectsApplied readAuthorized writeAuthorized'.split(' ');
const keys = ['version', 'evidenceTier', 'provenance', 'fixtureOnly', 'classification', 'reason', 'nextStep',
  'syntheticEnvironment', 'syntheticTestEnvironment', 'syntheticAvailability', 'syntheticInstallation', 'syntheticApproval', ...flags];
const steps = ['CORRECT_FIXTURE', 'REVIEW_VERSION', 'STOP', 'FRESH_FIXTURE_CONTEXT', 'MANUAL_AUTH', 'MANUAL_FIXTURE_TARGET', 'MANUAL_APPS_REVIEW'];
const stateDomains = {
  syntheticEnvironment: ['UNRESOLVED', 'PRODUCTION_PREVIEW'],
  syntheticTestEnvironment: ['UNRESOLVED', 'AVAILABLE_NOT_SELECTED'],
  syntheticAvailability: ['UNRESOLVED', 'SYNTHETIC_AVAILABLE', 'SYNTHETIC_MISSING', 'SYNTHETIC_UNKNOWN', 'SYNTHETIC_STALE', 'SYNTHETIC_CONFLICTING'],
  syntheticInstallation: ['UNRESOLVED', 'SYNTHETIC_NOT_INSTALLED', 'SYNTHETIC_STATIC_INSTALLED', 'SYNTHETIC_REPORTED_INSTALLED', 'SYNTHETIC_MISSING', 'SYNTHETIC_UNKNOWN', 'SYNTHETIC_STALE', 'SYNTHETIC_CONFLICTING'],
  syntheticApproval: ['UNRESOLVED', 'SYNTHETIC_AWAITING_APPROVAL', 'SYNTHETIC_MISSING', 'SYNTHETIC_DECLINED', 'SYNTHETIC_CONFLICTING', 'SYNTHETIC_REPORTED_APPROVED'],
};
function fixture() {
  return [
    { version: 1, databaseToken: 'fixture-customer-db-001', environment: 'production', moduleToken: 'pl_auth',
      documentGeneration: 4, contextGeneration: 5, sequence: 7, review: 'pending', lifecycle: 'active' },
    { version: 1, page: 'customer-odoo-apps', databaseToken: 'fixture-customer-db-001', selectedEnvironment: 'production',
      testEnvironment: 'available', moduleToken: 'pl_auth', plAuthMarker: 'module-pl-auth', plAuthAvailability: 'available',
      plAuthInstallation: 'not_installed', cedarLabelsMarker: 'module-cedar-labels', cedarLabelsAvailability: 'available',
      cedarLabelsInstallation: 'static_installed', approval: 'awaiting_approval', installControl: 'disabled',
      documentGeneration: 4, contextGeneration: 5, sequence: 8, authentication: 'none', lifecycle: 'active' },
  ];
}
function changed(r = {}, s = {}) {
  const f = fixture(); Object.assign(f[0], r); Object.assign(f[1], s); return f;
}
const exercised = [];
function boundary(out) {
  assert.ok(out && typeof out === 'object');
  assert.deepEqual(Object.keys(out), keys);
  assert.ok(Object.isFrozen(out));
  assert.equal(out.version, 1); assert.equal(out.evidenceTier, 'SIMULATED');
  assert.equal(out.provenance, 'SYNTHETIC_UNTRUSTED'); assert.equal(out.fixtureOnly, true);
  assert.ok(steps.includes(out.nextStep));
  assert.equal(out.classification, out.nextStep === 'MANUAL_APPS_REVIEW' ? 'MANUAL_REVIEW' : 'STOP');
  for (const [key, domain] of Object.entries(stateDomains)) assert.ok(domain.includes(out[key]), key);
  for (const key of flags) assert.equal(out[key], false, key);
  assert.ok(Object.values(out).every(v => ['string', 'boolean', 'number'].includes(typeof v)));
  const text = JSON.stringify(out);
  assert.ok(text.length <= 2048); assert.match(text, /^[\x20-\x7e]+$/);
  assert.doesNotMatch(text, /fixture-customer|fixture-secret|https?:|@|<|installationVerified|approvedToInstall|writeAllowed/);
}
function wire(args, reason, step) {
  const out = assessFixtureCustomerApps(...args);
  assert.equal(out?.reason, reason); if (step) assert.equal(out?.nextStep, step);
  boundary(out); exercised.push([args, JSON.stringify(out)]); return out;
}
function run(r = {}, s = {}, reason = 'approval_awaiting_review', step = 'MANUAL_APPS_REVIEW') {
  return wire(changed(r, s).map(JSON.stringify), reason, step);
}

test('Apps published markers ground the complete synthetic baseline', () => {
  const html = readFileSync(new URL('../fixtures/customer-odoo/apps.html', import.meta.url), 'utf8');
  const s = fixture()[1];
  assert.match(html, /SIMULATED TEST FIXTURE — NOT REAL CUSTOMER SYSTEM/);
  assert.match(html, new RegExp(`data-fixture="${s.page}" data-database-id="${s.databaseToken}"`));
  assert.match(html, new RegExp(`data-fixture="environment-selection" data-selected="${s.selectedEnvironment}"`));
  assert.match(html, /production-indicator" data-state="selected">Production — selected for preview only/);
  assert.match(html, /test-indicator" data-state="available">Test — available as a separate target/);
  assert.equal(s.testEnvironment, 'available');
  assert.match(html, /module-pl-auth" data-availability="available" data-installation="not-installed"/);
  assert.match(html, /module-cedar-labels" data-availability="available" data-installation="installed"/);
  assert.deepEqual([s.plAuthMarker, s.plAuthAvailability, s.plAuthInstallation], ['module-pl-auth', 'available', 'not_installed']);
  assert.deepEqual([s.cedarLabelsMarker, s.cedarLabelsAvailability, s.cedarLabelsInstallation], ['module-cedar-labels', 'available', 'static_installed']);
  assert.match(html, /module-approval-checkpoint" data-state="awaiting-approval"/);
  assert.match(html, /Candidate: pl_auth; target: Production; current simulated state: not installed/);
  assert.match(html, /install-control" disabled/);
  assert.deepEqual([s.moduleToken, s.approval, s.installControl], ['pl_auth', 'awaiting_approval', 'disabled']);
  assert.doesNotMatch(html, /test-indicator" data-state="selected"|<script\b|<form\b/);
});
test('Apps Production preview separates Test availability and not-installed pl_auth', () => {
  const out = run();
  assert.deepEqual(Object.fromEntries(Object.keys(stateDomains).map(k => [k, out[k]])), {
    syntheticEnvironment: 'PRODUCTION_PREVIEW', syntheticTestEnvironment: 'AVAILABLE_NOT_SELECTED',
    syntheticAvailability: 'SYNTHETIC_AVAILABLE', syntheticInstallation: 'SYNTHETIC_NOT_INSTALLED', syntheticApproval: 'SYNTHETIC_AWAITING_APPROVAL',
  });
});
test('Apps reviewed intent still leaves pl_auth uninstalled and approval awaiting', () => {
  const out = run({ review: 'reviewed' }, {}, 'synthetic_not_installed');
  assert.equal(out.syntheticInstallation, 'SYNTHETIC_NOT_INSTALLED');
  assert.equal(out.syntheticApproval, 'SYNTHETIC_AWAITING_APPROVAL');
});
test('Apps cedar_labels is only a static installed listing across review intents', () => {
  for (const [review, reason, step] of [['pending', 'approval_awaiting_review', 'MANUAL_APPS_REVIEW'],
    ['reviewed', 'synthetic_static_installed', 'MANUAL_APPS_REVIEW'], ['missing', 'review_missing', 'MANUAL_APPS_REVIEW'],
    ['declined', 'review_declined', 'STOP']]) {
    const out = run({ moduleToken: 'cedar_labels', review }, { moduleToken: 'cedar_labels' }, reason, step);
    assert.equal(out.syntheticInstallation, 'SYNTHETIC_STATIC_INSTALLED');
    assert.equal(out.syntheticAvailability, 'SYNTHETIC_AVAILABLE');
    assert.equal(out.moduleInstalled, false);
  }
});

// Ordered independent mutations pin first-applicable precedence as well as each failure.
const cases = [
  [{ version: 2 }, {}, 'unsupported_version', 'REVIEW_VERSION'],
  [{ lifecycle: 'cancelled' }, {}, 'operator_cancelled', 'STOP'],
  [{}, { lifecycle: 'worker_lost' }, 'context_lost', 'FRESH_FIXTURE_CONTEXT'],
  [{ lifecycle: 'interrupted' }, {}, 'interrupted', 'FRESH_FIXTURE_CONTEXT'],
  [{}, { authentication: 'login' }, 'authentication_required', 'MANUAL_AUTH'],
  [{ documentGeneration: null }, {}, 'document_generation_missing', 'FRESH_FIXTURE_CONTEXT'],
  [{}, { documentGeneration: 3 }, 'document_generation_mismatch', 'FRESH_FIXTURE_CONTEXT'],
  [{ contextGeneration: null }, {}, 'context_generation_missing', 'FRESH_FIXTURE_CONTEXT'],
  [{}, { contextGeneration: 6 }, 'context_generation_mismatch', 'FRESH_FIXTURE_CONTEXT'],
  [{}, { sequence: 7 }, 'duplicate_observation', 'FRESH_FIXTURE_CONTEXT'],
  [{}, { sequence: 6 }, 'delayed_observation', 'FRESH_FIXTURE_CONTEXT'],
  [{}, { sequence: 9 }, 'observation_gap', 'FRESH_FIXTURE_CONTEXT'],
  [{}, { page: null }, 'page_missing', 'MANUAL_FIXTURE_TARGET'],
  [{}, { page: 'plementus-database-info' }, 'page_mismatch', 'MANUAL_FIXTURE_TARGET'],
  [{ databaseToken: null }, {}, 'database_missing', 'MANUAL_FIXTURE_TARGET'],
  [{}, { databaseToken: 'fixture-customer-db-002' }, 'database_mismatch', 'MANUAL_FIXTURE_TARGET'],
  [{ environment: null }, {}, 'environment_missing', 'MANUAL_FIXTURE_TARGET'],
  [{ environment: 'test' }, {}, 'environment_mismatch', 'MANUAL_FIXTURE_TARGET'],
  [{ environment: 'test' }, { selectedEnvironment: 'test' }, 'environment_baseline_conflict', 'MANUAL_FIXTURE_TARGET'],
  ...['selected', 'missing', 'unknown', 'stale', 'conflicting'].map(v => [{}, { testEnvironment: v }, 'test_environment_' + v, 'MANUAL_FIXTURE_TARGET']),
  [{ moduleToken: null }, {}, 'module_missing', 'MANUAL_APPS_REVIEW'],
  [{}, { moduleToken: 'cedar_labels' }, 'module_selection_mismatch', 'MANUAL_FIXTURE_TARGET'],
  [{}, { installControl: 'enabled' }, 'install_control_conflict', 'STOP'],
  ...['missing', 'unknown'].map(v => [{}, { installControl: v }, 'install_control_' + v, 'MANUAL_APPS_REVIEW']),
  [{}, { plAuthMarker: null }, 'catalog_marker_missing', 'MANUAL_APPS_REVIEW'],
  [{}, { cedarLabelsMarker: 'module-pl-auth' }, 'catalog_marker_conflict', 'MANUAL_APPS_REVIEW'],
  ...['conflicting', 'stale', 'missing', 'unknown'].map(v => [{}, { plAuthAvailability: v }, 'availability_' + v, 'MANUAL_APPS_REVIEW']),
  ...['conflicting', 'stale', 'missing', 'unknown'].map(v => [{}, { plAuthInstallation: v }, 'installation_' + v, 'MANUAL_APPS_REVIEW']),
  [{}, { plAuthInstallation: 'static_installed' }, 'installation_baseline_conflict', 'MANUAL_APPS_REVIEW'],
  [{}, { cedarLabelsInstallation: 'reported_installed' }, 'installation_report_untrusted', 'MANUAL_APPS_REVIEW'],
  [{ review: 'declined' }, {}, 'review_declined', 'STOP'],
  [{}, { approval: 'declined' }, 'approval_declined', 'STOP'],
  [{}, { approval: 'conflicting' }, 'approval_conflicting', 'MANUAL_APPS_REVIEW'],
  [{}, { approval: 'reported_approved' }, 'approval_baseline_conflict', 'MANUAL_APPS_REVIEW'],
  [{ review: 'missing' }, {}, 'review_missing', 'MANUAL_APPS_REVIEW'],
  [{}, { approval: 'missing' }, 'approval_missing', 'MANUAL_APPS_REVIEW'],
];
for (const [i, [r, s, reason, step]] of cases.entries()) test(`Apps failure ${i + 1}: ${reason}`, () => run(r, s, reason, step));
test('Apps every compatible pair respects documented first-applicable precedence', () => {
  let pairs = 0;
  for (let i = 0; i < cases.length; i++) for (let j = i + 1; j < cases.length; j++) {
    const a = cases[i], b = cases[j];
    if ([0, 1].some(side => Object.keys(a[side]).some(k => Object.hasOwn(b[side], k)))) continue;
    run({ ...b[0], ...a[0] }, { ...b[1], ...a[1] }, a[2], a[3]); pairs++;
  }
  assert.ok(pairs > 800);
});
test('Apps all lifecycle states and authentication barriers stop on either applicable side', () => {
  for (const side of [0, 1]) for (const [lifecycle, reason, step] of [
    ['cancelled', 'operator_cancelled', 'STOP'], ['interrupted', 'interrupted', 'FRESH_FIXTURE_CONTEXT'],
    ['worker_lost', 'context_lost', 'FRESH_FIXTURE_CONTEXT'], ['session_lost', 'context_lost', 'FRESH_FIXTURE_CONTEXT']]) {
    const f = fixture(); f[side].lifecycle = lifecycle; wire(f.map(JSON.stringify), reason, step);
  }
  for (const authentication of ['login', 'mfa', 'captcha', 'session_expired'])
    run({}, { authentication }, 'authentication_required', 'MANUAL_AUTH');
});
test('Apps generations require nonmissing matching claims in both envelopes', () => {
  for (const [key, prefix] of [['documentGeneration', 'document_generation'], ['contextGeneration', 'context_generation']])
    for (const side of [0, 1]) for (const value of [null, 1, 1000000]) {
      const f = fixture(); f[side][key] = value;
      wire(f.map(JSON.stringify), prefix + (value === null ? '_missing' : '_mismatch'), 'FRESH_FIXTURE_CONTEXT');
    }
});
test('Apps wrong or absent target never emits selected-state labels', () => {
  for (const side of [0, 1]) for (const databaseToken of [null, 'fixture-customer-db-002']) {
    const f = fixture(); f[side].databaseToken = databaseToken;
    const out = wire(f.map(JSON.stringify), databaseToken === null ? 'database_missing' : 'database_mismatch', 'MANUAL_FIXTURE_TARGET');
    for (const key of Object.keys(stateDomains)) assert.equal(out[key], 'UNRESOLVED');
  }
  run({}, { selectedEnvironment: null }, 'environment_missing', 'MANUAL_FIXTURE_TARGET');
  run({}, { selectedEnvironment: 'test' }, 'environment_mismatch', 'MANUAL_FIXTURE_TARGET');
  run({ databaseToken: 'fixture-customer-db-002' }, { databaseToken: 'fixture-customer-db-002' }, 'database_mismatch', 'MANUAL_FIXTURE_TARGET');
});
test('Apps unknown absent and mismatched selections cannot inherit another module', () => {
  run({ moduleToken: 'fixture-missing-module' }, {}, 'module_missing');
  run({ moduleToken: 'fixture-missing-module' }, { moduleToken: 'fixture-missing-module' }, 'module_missing');
  for (const moduleToken of [null, 'fixture-missing-module', 'cedar_labels'])
    run({}, { moduleToken }, 'module_selection_mismatch', 'MANUAL_FIXTURE_TARGET');
});
test('Apps both marker identities must agree even when their row is not selected', () => {
  for (const [key, wrong] of [['plAuthMarker', 'module-cedar-labels'], ['cedarLabelsMarker', 'module-pl-auth']]) {
    run({}, { [key]: null }, 'catalog_marker_missing'); run({}, { [key]: wrong }, 'catalog_marker_conflict');
  }
  run({}, { plAuthMarker: 'module-cedar-labels', cedarLabelsMarker: 'module-pl-auth' }, 'catalog_marker_conflict');
});
test('Apps unavailable stale missing conflicting and unknown catalog evidence stays manual', () => {
  for (const moduleToken of ['pl_auth', 'cedar_labels'])
    for (const key of ['plAuthAvailability', 'cedarLabelsAvailability', 'plAuthInstallation', 'cedarLabelsInstallation'])
      for (const value of ['unknown', 'missing', 'stale', 'conflicting']) {
        const kind = key.endsWith('Availability') ? 'availability' : 'installation';
        run({ moduleToken, review: 'reviewed' }, { moduleToken, [key]: value }, kind + '_' + value);
      }
  assert.equal(run({}, { plAuthInstallation: 'unknown' }, 'installation_unknown').syntheticInstallation, 'SYNTHETIC_UNKNOWN');
  assert.equal(run({}, { plAuthAvailability: 'unknown' }, 'availability_unknown').syntheticAvailability, 'SYNTHETIC_UNKNOWN');
});
test('Apps all cross-row uncertainty combinations obey global state priority', () => {
  const states = ['conflicting', 'stale', 'missing', 'unknown', 'available'];
  for (const a of states) for (const b of states) {
    if (a === 'available' && b === 'available') continue;
    const first = states.find(v => v === a || v === b);
    run({}, { plAuthAvailability: a, cedarLabelsAvailability: b }, 'availability_' + first);
  }
  const installs = ['conflicting', 'stale', 'missing', 'unknown'];
  for (const a of installs) for (const b of installs)
    run({}, { plAuthInstallation: a, cedarLabelsInstallation: b }, 'installation_' + installs.find(v => v === a || v === b));
});
test('Apps contrary installed reports and fabricated approvals never override the static baseline', () => {
  run({ review: 'reviewed' }, { plAuthInstallation: 'reported_installed' }, 'installation_baseline_conflict');
  run({}, { cedarLabelsInstallation: 'not_installed' }, 'installation_baseline_conflict');
  run({ moduleToken: 'cedar_labels', review: 'reviewed' }, { moduleToken: 'cedar_labels', cedarLabelsInstallation: 'reported_installed' }, 'installation_report_untrusted');
  run({ review: 'reviewed' }, { approval: 'reported_approved' }, 'approval_baseline_conflict');
  run({ review: 'reviewed' }, { approval: 'reported_approved', installControl: 'enabled' }, 'install_control_conflict', 'STOP');
});

for (const side of [0, 1]) {
  test(`Apps envelope ${side}: exact key set order primitive fields and no authority injection`, () => {
    const base = fixture();
    const reject = value => { const args = base.map(JSON.stringify); args[side] = JSON.stringify(value); wire(args, 'invalid_input', 'CORRECT_FIXTURE'); };
    for (const key of Object.keys(base[side])) {
      const missing = { ...base[side] }; delete missing[key]; reject(missing);
      for (const bad of [{}, [], true, false, 'fixture-secret', 1.5]) reject({ ...base[side], [key]: bad });
    }
    for (const key of ['unknown', '__proto__', 'constructor', 'url', 'rawHtml', 'credentials', 'repositoryAssociated', 'buildReady', ...flags])
      reject({ ...base[side], [key]: true });
    reject(Object.fromEntries(Object.entries(base[side]).reverse()));
    for (const value of [null, [], true, 1, 'fixture-secret']) reject(value);
  });
  test(`Apps envelope ${side}: canonical encoding rejects ambiguous JSON`, () => {
    const args = fixture().map(JSON.stringify), text = args[side];
    const bad = ['', '{}', 'null', '{', '[1]', '<html>fixture-secret</html>', '\u00a0' + text,
      ' ' + text, text + '\n', text.replace('"version":1', '"version":1.0'), text.replace('"version":1', '"version":1e0'),
      text.replace('"version":1', '"version":1,"version":1'), text.replace('"version":1', '"version":2,"version":1'),
      text.replace('"version"', '"ver\\u0073ion"'), text.replace('fixture-customer', 'fixture\\u002dcustomer'),
      text.replace(':1,', ': 1,'), text.replace(':1,', ':01,'), text.replace(':1,', ':NaN,'),
      text.replace(':1,', ':Infinity,'), text.replace(':1,', ':1,/*comment*/'), text.slice(0, -1) + ',}'];
    for (const value of bad) { const wireArgs = [...args]; wireArgs[side] = value; wire(wireArgs, 'invalid_input', 'CORRECT_FIXTURE'); }
    for (const length of [1024, 1025]) {
      const wireArgs = [...args]; wireArgs[side] = text + ' '.repeat(length - text.length);
      wire(wireArgs, length === 1024 ? 'invalid_input' : 'input_too_large', 'CORRECT_FIXTURE');
    }
  });
  test(`Apps envelope ${side}: numeric bounds and unsupported versions`, () => {
    for (const version of [2, 999]) { const f = fixture(); f[side].version = version; wire(f.map(JSON.stringify), 'unsupported_version', 'REVIEW_VERSION'); }
    for (const key of ['version', 'documentGeneration', 'contextGeneration', 'sequence']) {
      const minimum = key === 'sequence' && side === 0 ? 0 : 1;
      const maximum = key === 'version' ? 999 : key === 'sequence' && side === 0 ? 999999 : 1000000;
      for (const value of [minimum - 1, maximum + 1, 0.5, '1', Number.MAX_SAFE_INTEGER]) {
        const f = fixture(); f[side][key] = value; wire(f.map(JSON.stringify), 'invalid_input', 'CORRECT_FIXTURE');
      }
    }
    const f = fixture(); f[side].sequence = 0;
    const args = f.map(JSON.stringify); args[side] = args[side].replace('"sequence":0', '"sequence":-0');
    wire(args, 'invalid_input', 'CORRECT_FIXTURE');
  });
}
test('Apps valid numeric boundaries are admitted without granting freshness', () => {
  for (const generation of [1, 1000000]) for (const sequence of [0, 999999])
    run({ documentGeneration: generation, contextGeneration: generation, sequence },
      { documentGeneration: generation, contextGeneration: generation, sequence: sequence + 1 });
});
test('Apps both inputs are validated before versions or semantic classifications', () => {
  const args = changed({ version: 2, lifecycle: 'cancelled' }).map(JSON.stringify);
  wire([args[0], '{}'], 'invalid_input', 'CORRECT_FIXTURE');
  wire(['{}'.repeat(513), {}], 'invalid_input', 'CORRECT_FIXTURE');
  wire([args[0], ' '.repeat(1025)], 'input_too_large', 'CORRECT_FIXTURE');
  wire(['{}', args[1].replace('"version":1', '"version":2')], 'invalid_input', 'CORRECT_FIXTURE');
});
test('Apps hostile objects revoked proxies accessors and coercion hooks are never touched', () => {
  let touched = 0;
  const trap = () => { touched++; throw Error('fixture-secret'); };
  const hostile = Object.defineProperties({}, { length: { get: trap }, version: { get: trap },
    toString: { value: trap }, toJSON: { value: trap }, [Symbol.toPrimitive]: { value: trap } });
  const proxy = new Proxy({}, Object.fromEntries(['get', 'ownKeys', 'getPrototypeOf', 'getOwnPropertyDescriptor', 'has', 'set'].map(k => [k, trap])));
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const callable = new Proxy(() => {}, { get: trap, apply: trap });
  for (const value of [hostile, proxy, revoked.proxy, callable, new String('{}'), Symbol('fixture-secret'), 1n, undefined, null, [], 1, true])
    for (const side of [0, 1]) { const args = fixture().map(JSON.stringify); args[side] = value; wire(args, 'invalid_input', 'CORRECT_FIXTURE'); }
  assert.equal(touched, 0);
});
test('Apps fresh frozen sanitized diagnostics have no hidden alternative authority or retained replay state', () => {
  const first = run(); const second = run();
  assert.deepEqual(first, second); assert.notEqual(first, second);
  assert.deepEqual(Reflect.ownKeys(first), keys);
  assert.throws(() => { first.moduleInstalled = true; }, TypeError);
  assert.throws(() => { first.writeAllowed = true; }, TypeError);
  assert.throws(() => { delete first.reason; }, TypeError);
  run({ lifecycle: 'cancelled' }, {}, 'operator_cancelled', 'STOP');
  assert.deepEqual(run(), first);
  wire([JSON.stringify(first), JSON.stringify(fixture()[1])], 'invalid_input', 'CORRECT_FIXTURE');
  const bad = changed({}, { moduleToken: 'fixture-secret@example.invalid' }).map(JSON.stringify);
  wire(bad, 'invalid_input', 'CORRECT_FIXTURE');
});
test('apps fixture isolation: import-free initialization evaluation and replay access no capabilities or consumers', () => {
  assert.deepEqual(Object.keys(adapter), ['assessFixtureCustomerApps']);
  const source = readFileSync(new URL('../src/customer-odoo/apps-fixture-adapter.mjs', import.meta.url), 'utf8');
  const names = 'import require fetch XMLHttpRequest WebSocket chrome browser localStorage sessionStorage indexedDB process eval Function globalThis window document navigator Date performance setTimeout setInterval setImmediate queueMicrotask Worker Promise console'.split(' ');
  assert.doesNotMatch(source, new RegExp('\\b(?:' + names.join('|') + ')\\b'));
  assert.doesNotMatch(source, /Math\.random|node:|child_process|page-recognition|context-guards|dom-primitives|interruption-policy|project-setup-fixture-flow|repository-production-fixture-flow|utilities-modules-fixture-flow|staging-neutralized-copy-fixture-flow|adapters\/contract/);
  for (const f of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true }))
    if (f.isFile() && /\.(mjs|js|html|json)$/.test(f.name) && f.name !== 'apps-fixture-adapter.mjs')
      assert.doesNotMatch(readFileSync(`${f.parentPath}/${f.name}`, 'utf8'), /apps-fixture-adapter|assessFixtureCustomerApps/);
  let touched = 0; const context = {};
  for (const key of [...names, 'location', 'caches', 'clipboard'])
    Object.defineProperty(context, key, { get() { touched++; throw Error('capability'); } });
  const isolated = runInNewContext(source.replace('export function', 'function') + '\nassessFixtureCustomerApps;', context,
    { codeGeneration: { strings: false, wasm: false } });
  // Always execute behavioral paths even when the test-name filter excludes the scenario tests.
  for (const [r, s, reason, step] of [[{}, {}, 'approval_awaiting_review', 'MANUAL_APPS_REVIEW'], ...cases,
    [{ review: 'reviewed', moduleToken: 'cedar_labels' }, { moduleToken: 'cedar_labels' }, 'synthetic_static_installed', 'MANUAL_APPS_REVIEW']]) {
    const args = changed(r, s).map(JSON.stringify); const out = isolated(...args);
    assert.equal(out?.reason, reason); assert.equal(out?.nextStep, step); boundary(out);
  }
  for (const [args, expected] of exercised) assert.equal(JSON.stringify(isolated(...args)), expected);
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  assert.equal(isolated(revoked.proxy, '{}')?.reason, 'invalid_input');
  assert.equal(isolated('{}', revoked.proxy)?.reason, 'invalid_input');
  assert.equal(touched, 0);
});
