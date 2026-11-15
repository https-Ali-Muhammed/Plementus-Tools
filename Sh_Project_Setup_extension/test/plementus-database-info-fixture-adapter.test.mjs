import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as adapter from '../src/plementus/database-info-fixture-adapter.mjs';

const { assessFixturePlementusDatabaseInfo } = adapter;
const flags = 'browserObserved permissionVerified accountVerified rightsVerified subscriptionVerified approvalGranted executionAuthorized mutationAuthorized installationAuthorized trustedContinuingContext associationVerified productionDatabaseVerified stagingCopyVerified moduleInstalled effectsApplied readAuthorized writeAuthorized'.split(' ');
const fields = ['databaseName', 'liveUrl', 'testUrl', 'databaseUser'];
const fieldMarkers = ['database-name', 'live-url', 'test-url', 'database-user'];
const mapped = ['SYNTHETIC_DATABASE_NAME_EXAMPLE', 'SYNTHETIC_LIVE_URL_EXAMPLE', 'SYNTHETIC_TEST_URL_EXAMPLE', 'SYNTHETIC_DATABASE_USER_EXAMPLE'];
const outputFields = ['syntheticDatabaseName', 'syntheticLiveUrl', 'syntheticTestUrl', 'syntheticDatabaseUser'];
const markers = ['plementus-database-info', 'database-info-candidates', ...fieldMarkers,
  'review-submit-checkpoint', 'submit-control', 'connect-live-checkpoint', 'connect-live-control',
  'connect-test-checkpoint', 'connect-test-control'];
const keys = ['version', 'evidenceTier', 'provenance', 'fixtureOnly', 'classification', 'reason', 'nextStep',
  'syntheticProject', ...outputFields, 'syntheticPreview', 'syntheticReview', 'syntheticControls', ...flags];
const steps = ['CORRECT_FIXTURE', 'REVIEW_VERSION', 'STOP', 'FRESH_FIXTURE_CONTEXT', 'MANUAL_AUTH', 'MANUAL_DATABASE_INFO_REVIEW'];
const manual = 'MANUAL_DATABASE_INFO_REVIEW';
function fixture() {
  return [
    { version: 1, page: 'plementus-database-info', projectToken: 'fixture-plementus-project-001',
      documentGeneration: 4, contextGeneration: 5, sequence: 7, review: 'pending', lifecycle: 'active' },
    { version: 1, projectToken: 'fixture-plementus-project-001', projectOccurrences: 1, projectLabel: 'Cedar Workshop Demo',
      documentGeneration: 4, contextGeneration: 5, sequence: 8, markers: [...markers],
      databaseName: 'fixture_cedar_db', liveUrl: 'https://cedar-live.invalid', testUrl: 'https://cedar-test.invalid', databaseUser: 'fixture_cedar_user',
      databaseNameReadonly: true, liveUrlReadonly: true, testUrlReadonly: true, databaseUserReadonly: true,
      reviewState: 'awaiting-review', submitControl: 'disabled', connectLiveState: 'not-connected', connectLiveControl: 'disabled',
      connectTestState: 'not-connected', connectTestControl: 'disabled', authentication: 'none', lifecycle: 'active' },
  ];
}
function changed(patch = {}) {
  const f = fixture(); for (const [side, values] of Object.entries(patch)) Object.assign(f[side], values); return f;
}
const exercised = [];
function boundary(out) {
  assert.ok(out && typeof out === 'object');
  assert.deepEqual(Object.keys(out), keys);
  assert.ok(Object.isFrozen(out));
  assert.equal(out.version, 1); assert.equal(out.evidenceTier, 'SIMULATED');
  assert.equal(out.provenance, 'SYNTHETIC_UNTRUSTED'); assert.equal(out.fixtureOnly, true);
  assert.ok(steps.includes(out.nextStep));
  assert.equal(out.classification, out.nextStep === manual ? 'MANUAL_REVIEW' : 'STOP');
  assert.ok(['UNRESOLVED', 'SYNTHETIC_PROJECT_MATCH'].includes(out.syntheticProject));
  for (const [i, key] of outputFields.entries())
    assert.ok(['UNRESOLVED', 'SYNTHETIC_MISSING', 'SYNTHETIC_UNKNOWN', 'SYNTHETIC_CONFLICTING', mapped[i]].includes(out[key]), key);
  assert.ok(['UNRESOLVED', 'SYNTHETIC_INCOMPLETE', 'SYNTHETIC_COMPLETE', 'SYNTHETIC_READY_FOR_MANUAL_REVIEW'].includes(out.syntheticPreview));
  assert.ok(['UNRESOLVED', 'SYNTHETIC_AWAITING_REVIEW'].includes(out.syntheticReview));
  assert.ok(['UNRESOLVED', 'SYNTHETIC_DISABLED'].includes(out.syntheticControls));
  for (const key of flags) assert.equal(out[key], false, key);
  assert.ok(Object.values(out).every(v => ['string', 'boolean', 'number'].includes(typeof v)));
  const text = JSON.stringify(out);
  assert.ok(text.length <= 2048); assert.match(text, /^[\x20-\x7e]+$/);
  assert.doesNotMatch(text, /fixture_cedar|fixture-plementus|Cedar Workshop|https?:|@|<|secret|password|submitted|saved|connected|approved/i);
}
function wire(args, reason = 'synthetic_mapping_ready', step = manual) {
  const out = assessFixturePlementusDatabaseInfo(...args);
  assert.equal(out?.reason, reason); assert.equal(out?.nextStep, step); boundary(out);
  exercised.push([[...args], JSON.stringify(out)]); return out;
}
function run(patch, reason, step) { return wire(changed(patch).map(JSON.stringify), reason, step); }

test('Plementus mapping is grounded in all published markers values readonly and disabled controls', () => {
  const html = readFileSync(new URL('../fixtures/plementus/database-info.html', import.meta.url), 'utf8');
  const s = fixture()[1];
  assert.match(html, /SIMULATED TEST FIXTURE — NOT REAL CUSTOMER SYSTEM/);
  assert.deepEqual([...html.matchAll(/data-fixture="([^"]+)"/g)].map(m => m[1]), markers);
  assert.match(html, /data-project-id="fixture-plementus-project-001"/);
  assert.match(html, /Cedar Workshop Demo \(fixture-plementus-project-001\)/);
  for (const [i, field] of fields.entries()) {
    const tag = [...html.matchAll(/<input\b[^>]+>/g)].map(m => m[0]).find(t => t.includes(`data-fixture="${fieldMarkers[i]}"`));
    assert.ok(tag?.includes(`value="${s[field]}" readonly`));
  }
  for (const marker of ['submit-control', 'connect-live-control', 'connect-test-control'])
    assert.ok(html.includes(`data-fixture="${marker}" disabled`));
  assert.match(html, /review-submit-checkpoint" data-state="awaiting-review"/);
  for (const which of ['live', 'test']) assert.ok(html.includes(`connect-${which}-checkpoint" data-state="not-connected"`));
  assert.doesNotMatch(html, /<script\b|<form\b/);
  const out = run();
  assert.deepEqual(outputFields.map(k => out[k]), mapped);
  assert.equal(out.syntheticProject, 'SYNTHETIC_PROJECT_MATCH');
  assert.equal(out.syntheticPreview, 'SYNTHETIC_READY_FOR_MANUAL_REVIEW');
  assert.equal(out.syntheticReview, 'SYNTHETIC_AWAITING_REVIEW');
  assert.equal(out.syntheticControls, 'SYNTHETIC_DISABLED');
});

for (const [i, field] of fields.entries()) {
  test(`Plementus ${field}: missing marker cannot borrow a value`, () => {
    const out = run({ 1: { markers: markers.filter(m => m !== fieldMarkers[i]) } }, 'field_missing');
    assert.equal(out[outputFields[i]], 'SYNTHETIC_MISSING');
    assert.equal(out.syntheticPreview, 'SYNTHETIC_INCOMPLETE');
    for (const j of [0, 1, 2, 3].filter(j => j !== i)) assert.equal(out[outputFields[j]], mapped[j]);
  });
  test(`Plementus ${field}: missing unknown swapped and editable values never become mapped`, () => {
    for (const [value, reason, state] of [[null, 'field_missing', 'SYNTHETIC_MISSING'], ['unknown', 'unknown_mapping', 'SYNTHETIC_UNKNOWN'],
      [fixture()[1][fields[(i + 1) % 4]], 'field_conflicting', 'SYNTHETIC_CONFLICTING']]) {
      const out = run({ 1: { [field]: value } }, reason); assert.equal(out[outputFields[i]], state);
    }
    const out = run({ 1: { [field + 'Readonly']: false } }, 'field_conflicting');
    assert.equal(out[outputFields[i]], 'SYNTHETIC_CONFLICTING');
  });
}
for (const marker of markers) test(`Plementus duplicate ${marker} fails closed`, () => {
  const out = run({ 1: { markers: [...markers, marker] } }, 'duplicate_marker');
  assert.equal(out.syntheticPreview, 'UNRESOLVED');
});
test('Plementus marker ordering is immaterial and unknown mapping remains a manual checkpoint', () => {
  run({ 1: { markers: [...markers].reverse() } });
  run({ 1: { markers: [...markers, 'unknown-marker'] } }, 'unknown_mapping');
  run({ 1: { markers: ['unknown-marker'] } }, 'unrecognized_layout');
});
test('Plementus Live and Test cannot be swapped copied substituted or omitted', () => {
  const s = fixture()[1];
  const out = run({ 1: { liveUrl: s.testUrl, testUrl: s.liveUrl } }, 'field_conflicting');
  assert.equal(out.syntheticLiveUrl, 'SYNTHETIC_CONFLICTING'); assert.equal(out.syntheticTestUrl, 'SYNTHETIC_CONFLICTING');
  for (const [key, value] of [['liveUrl', s.testUrl], ['testUrl', s.liveUrl], ['liveUrl', null], ['testUrl', null]])
    run({ 1: { [key]: value } }, value === null ? 'field_missing' : 'field_conflicting');
});
test('Plementus conflict outranks missing and unknown across all four fields', () => {
  run({ 1: { databaseName: null, liveUrl: 'unknown', databaseUser: 'fixture_cedar_db' } }, 'field_conflicting');
  run({ 1: { databaseName: 'unknown', testUrl: null } }, 'field_missing');
});
for (const key of ['submitControl', 'connectLiveControl', 'connectTestControl'])
  test(`Plementus ${key} must remain disabled`, () => {
    for (const state of ['enabled', 'missing', 'unknown']) {
      const out = run({ 1: { [key]: state } }, state === 'enabled' ? 'control_conflict' : 'control_missing_or_unknown', state === 'enabled' ? 'STOP' : manual);
      assert.equal(out.syntheticControls, 'UNRESOLVED'); assert.equal(out.syntheticPreview, 'UNRESOLVED');
    }
  });
for (const marker of markers.filter(m => !fieldMarkers.includes(m)))
  test(`Plementus missing ${marker} cannot reach ready preview`, () => {
    const reason = ['plementus-database-info', 'database-info-candidates'].includes(marker) ? 'unrecognized_layout'
      : marker === 'review-submit-checkpoint' ? 'review_checkpoint_missing'
        : marker.endsWith('-control') ? 'control_missing_or_unknown' : 'connect_checkpoint_unverified';
    run({ 1: { markers: markers.filter(m => m !== marker) } }, reason);
  });
test('Plementus review remains independent with complete mapping and no positive authority', () => {
  for (const review of ['pending', 'reviewed']) {
    const out = run({ 0: { review } }); assert.equal(out.syntheticReview, 'SYNTHETIC_AWAITING_REVIEW');
  }
  for (const [patch, reason, step] of [
    [{ 0: { review: 'missing' } }, 'review_checkpoint_missing', manual],
    [{ 0: { review: 'declined' } }, 'review_declined', 'STOP'],
    ...['missing', 'unknown', 'reported-submitted', 'reported-saved'].map(reviewState =>
      [{ 1: { reviewState } }, reviewState === 'missing' ? 'review_checkpoint_missing' : 'review_checkpoint_unverified', manual]),
  ]) {
    const out = run(patch, reason, step);
    assert.equal(out.syntheticPreview, 'SYNTHETIC_COMPLETE'); assert.equal(out.syntheticReview, 'UNRESOLVED');
    assert.deepEqual(outputFields.map(k => out[k]), mapped);
  }
});
test('Plementus native connection reports never prove connection', () => {
  for (const key of ['connectLiveState', 'connectTestState'])
    for (const state of ['missing', 'unknown', 'reported-connected']) run({ 1: { [key]: state } }, 'connect_checkpoint_unverified');
});

const cases = [
  [{ 0: { version: 2 } }, 'unsupported_version', 'REVIEW_VERSION'],
  [{ 0: { lifecycle: 'cancelled' } }, 'operator_cancelled', 'STOP'],
  [{ 1: { lifecycle: 'session_lost' } }, 'context_lost', 'FRESH_FIXTURE_CONTEXT'],
  [{ 0: { lifecycle: 'interrupted' } }, 'interrupted', 'FRESH_FIXTURE_CONTEXT'],
  [{ 1: { authentication: 'mfa' } }, 'authentication_required', 'MANUAL_AUTH'],
  [{ 0: { documentGeneration: null } }, 'document_generation_missing', 'FRESH_FIXTURE_CONTEXT'],
  [{ 1: { documentGeneration: 3 } }, 'document_generation_mismatch', 'FRESH_FIXTURE_CONTEXT'],
  [{ 0: { contextGeneration: null } }, 'context_generation_missing', 'FRESH_FIXTURE_CONTEXT'],
  [{ 1: { contextGeneration: 6 } }, 'context_generation_mismatch', 'FRESH_FIXTURE_CONTEXT'],
  [{ 1: { sequence: 7 } }, 'duplicate_observation', 'FRESH_FIXTURE_CONTEXT'],
  [{ 1: { sequence: 6 } }, 'delayed_observation', 'FRESH_FIXTURE_CONTEXT'],
  [{ 1: { sequence: 9 } }, 'observation_gap', 'FRESH_FIXTURE_CONTEXT'],
  [{ 0: { page: 'customer-odoo-apps' } }, 'unrecognized_layout', manual],
  [{ 0: { projectToken: null } }, 'project_missing', manual],
  [{ 1: { projectToken: 'fixture-plementus-project-002' } }, 'project_conflict', manual],
  [{ 1: { markers: [...markers, 'unknown-marker'] } }, 'unknown_mapping', manual],
  [{ 1: { markers: [...markers, 'database-name'] } }, 'duplicate_marker', manual],
  [{ 1: { submitControl: 'enabled' } }, 'control_conflict', 'STOP'],
  [{ 1: { connectTestControl: 'unknown' } }, 'control_missing_or_unknown', manual],
  [{ 1: { connectLiveState: 'reported-connected' } }, 'connect_checkpoint_unverified', manual],
  [{ 1: { databaseUser: 'fixture_cedar_db' } }, 'field_conflicting', manual],
  [{ 1: { liveUrl: null } }, 'field_missing', manual],
  [{ 1: { testUrl: 'unknown' } }, 'unknown_mapping', manual],
  [{ 0: { review: 'declined' } }, 'review_declined', 'STOP'],
  [{ 0: { review: 'missing' } }, 'review_checkpoint_missing', manual],
  [{ 1: { reviewState: 'reported-saved' } }, 'review_checkpoint_unverified', manual],
];
for (const [i, [patch, reason, step]] of cases.entries()) test(`Plementus failure ${i + 1}: ${reason}`, () => run(patch, reason, step));
test('Plementus compatible failure pairs obey documented first-applicable precedence', () => {
  let pairs = 0;
  for (let i = 0; i < cases.length; i++) for (let j = i + 1; j < cases.length; j++) {
    const [a, reason, step] = cases[i], [b] = cases[j];
    if ([0, 1].some(side => Object.keys(a[side] ?? {}).some(key => key in (b[side] ?? {})))) continue;
    run({ 0: { ...a[0], ...b[0] }, 1: { ...a[1], ...b[1] } }, reason, step); pairs++;
  }
  assert.ok(pairs > 250);
});
for (const side of [0, 1]) test(`Plementus envelope ${side}: lifecycle and missing or stale context cannot inherit readiness`, () => {
  for (const [lifecycle, reason, step] of [['cancelled', 'operator_cancelled', 'STOP'], ['interrupted', 'interrupted', 'FRESH_FIXTURE_CONTEXT'],
    ['worker_lost', 'context_lost', 'FRESH_FIXTURE_CONTEXT'], ['session_lost', 'context_lost', 'FRESH_FIXTURE_CONTEXT']]) run({ [side]: { lifecycle } }, reason, step);
  for (const [key, prefix] of [['documentGeneration', 'document_generation'], ['contextGeneration', 'context_generation']])
    for (const value of [null, 2, 1000000]) run({ [side]: { [key]: value } }, prefix + (value === null ? '_missing' : '_mismatch'), 'FRESH_FIXTURE_CONTEXT');
  for (const value of [null, 'fixture-plementus-project-002']) run({ [side]: { projectToken: value } }, value === null ? 'project_missing' : 'project_conflict');
});
test('Plementus fictional identity occurrences label and page are required', () => {
  for (const patch of [{ projectOccurrences: 0 }, { projectLabel: null }]) run({ 1: patch }, 'project_missing');
  for (const patch of [{ projectOccurrences: 2 }, { projectLabel: 'unknown' }]) run({ 1: patch }, 'project_conflict');
  run({ 0: { page: null } }, 'unrecognized_layout');
  run({ 0: { projectToken: 'fixture-plementus-project-002' }, 1: { projectToken: 'fixture-plementus-project-002' } }, 'project_conflict');
  for (const authentication of ['login', 'mfa', 'captcha', 'session_expired']) run({ 1: { authentication } }, 'authentication_required', 'MANUAL_AUTH');
});
for (const side of [0, 1]) {
  test(`Plementus envelope ${side}: strict ordered schema rejects missing extra nested and hostile values`, () => {
    for (const key of Object.keys(fixture()[side])) {
      const f = fixture(); delete f[side][key]; wire(f.map(JSON.stringify), 'invalid_input', 'CORRECT_FIXTURE');
      for (const value of [{}, key === 'markers' ? [[]] : [], 'fixture-secret<unsafe>']) {
        const g = fixture(); g[side][key] = value; wire(g.map(JSON.stringify), 'invalid_input', 'CORRECT_FIXTURE');
      }
    }
    for (const key of [...flags, '__proto__', 'password', 'html', 'submitted', 'saved', 'connected']) {
      const f = fixture(); Object.defineProperty(f[side], key, { value: true, enumerable: true }); wire(f.map(JSON.stringify), 'invalid_input', 'CORRECT_FIXTURE');
    }
    const f = fixture(); f[side] = Object.fromEntries(Object.entries(f[side]).reverse()); wire(f.map(JSON.stringify), 'invalid_input', 'CORRECT_FIXTURE');
  });
  test(`Plementus envelope ${side}: canonical malformed oversized and unsafe text fails without echo`, () => {
    const args = fixture().map(JSON.stringify), valid = args[side];
    for (const text of ['', '{}', '[]', 'null', '{', valid + ' ', ' ' + valid, valid + '\n', valid.replace('"version":1', '"version":1,"version":1'),
      valid.replace('"version":1', '"version":1.0'), valid.replace('"version":1', '"version":1e0'), valid.replace('version', '\\u0076ersion'),
      valid.replace('fixture-plementus-project-001', 'é'), valid.replace('fixture-plementus-project-001', '\\u0000')]) {
      const a = [...args]; a[side] = text; wire(a, 'invalid_input', 'CORRECT_FIXTURE');
    }
    const limit = side === 0 ? 1024 : 4096;
    for (const [length, reason] of [[limit, 'invalid_input'], [limit + 1, 'input_too_large']]) {
      const a = [...args]; a[side] = 'x'.repeat(length); wire(a, reason, 'CORRECT_FIXTURE');
    }
    for (const version of [2, 999]) run({ [side]: { version } }, 'unsupported_version', 'REVIEW_VERSION');
    for (const key of ['version', 'documentGeneration', 'contextGeneration', 'sequence'])
      for (const value of [-1, 1.5, 1000001, '1', true]) run({ [side]: { [key]: value } }, 'invalid_input', 'CORRECT_FIXTURE');
  });
}
test('Plementus marker array bound rejects arbitrary markers nested values and excessive entries', () => {
  for (const value of [null, {}, 'database-name', [null], [{}], ['actual-field'], Array(25).fill('database-name')])
    run({ 1: { markers: value } }, 'invalid_input', 'CORRECT_FIXTURE');
  run({ 1: { markers: [] } }, 'unrecognized_layout');
  run({ 1: { markers: [...markers, ...markers] } }, 'duplicate_marker');
  for (const key of fields) for (const value of ['https://evil.example', 'https://user:password@cedar-live.invalid', 'javascript:alert(1)', '<script>', 'fixture_cedar_user\n', '\u0000', 'fixture_cedar_db '])
    run({ 1: { [key]: value } }, 'invalid_input', 'CORRECT_FIXTURE');
});
test('Plementus primitive validation rejects proxies without invoking any hooks', () => {
  let touches = 0;
  const hostile = new Proxy({}, { get() { touches++; throw Error('secret'); }, ownKeys() { touches++; throw Error('secret'); } });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const callable = Proxy.revocable(() => {}, {}); callable.revoke();
  for (const value of [undefined, null, true, 1, Symbol('secret'), 1n, {}, [], new String('{}'), hostile, revoked.proxy, callable.proxy])
    for (const side of [0, 1]) {
      const args = fixture().map(JSON.stringify); args[side] = value; wire(args, 'invalid_input', 'CORRECT_FIXTURE');
    }
  assert.equal(touches, 0);
  wire(['x'.repeat(1025), hostile], 'invalid_input', 'CORRECT_FIXTURE');
  wire([JSON.stringify({ ...fixture()[0], version: 2 }), '{}'], 'invalid_input', 'CORRECT_FIXTURE');
});
test('Plementus numeric endpoints preserve matching generations and consecutive observations', () => {
  for (const generation of [1, 1000000]) for (const sequence of [0, 999999]) run({
    0: { documentGeneration: generation, contextGeneration: generation, sequence },
    1: { documentGeneration: generation, contextGeneration: generation, sequence: sequence + 1 },
  });
  run({ 0: { sequence: 1000000 } }, 'invalid_input', 'CORRECT_FIXTURE');
  run({ 1: { sequence: 0 } }, 'invalid_input', 'CORRECT_FIXTURE');
  run({ 1: { projectOccurrences: 3 } }, 'invalid_input', 'CORRECT_FIXTURE');
});
test('Plementus frozen output and replay never acquire authority or retained cancellation', () => {
  const a = run(), b = run(); assert.notEqual(a, b); assert.deepEqual(a, b);
  assert.throws(() => { a.writeAuthorized = true; }, TypeError);
  assert.throws(() => { a.syntheticLiveUrl = 'secret'; }, TypeError);
  run({ 0: { lifecycle: 'cancelled' } }, 'operator_cancelled', 'STOP');
  assert.deepEqual(run(), a);
});
test('plementus mapping isolation: initialization and all decisions require no capabilities or consumers', () => {
  assert.deepEqual(Object.keys(adapter), ['assessFixturePlementusDatabaseInfo']);
  const source = readFileSync(new URL('../src/plementus/database-info-fixture-adapter.mjs', import.meta.url), 'utf8');
  const names = 'import require fetch XMLHttpRequest WebSocket chrome browser localStorage sessionStorage indexedDB process eval Function globalThis window document navigator Date performance setTimeout setInterval setImmediate queueMicrotask Worker Promise console'.split(' ');
  assert.doesNotMatch(source, new RegExp('\\b(?:' + names.join('|') + ')\\b'));
  assert.doesNotMatch(source, /Math\.random|node:|child_process|apps-fixture-adapter|apps-mock-install-fixture-flow|adapters\/|\.click\s*\(|pl_auth/);
  for (const f of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true }))
    if (f.isFile() && /\.(mjs|js|html|json)$/.test(f.name) && f.name !== 'database-info-fixture-adapter.mjs')
      assert.doesNotMatch(readFileSync(`${f.parentPath}/${f.name}`, 'utf8'), /database-info-fixture-adapter|assessFixturePlementusDatabaseInfo/);
  let touched = 0; const context = {};
  for (const key of [...names, 'location', 'caches', 'clipboard']) Object.defineProperty(context, key, { get() { touched++; throw Error('capability'); } });
  const isolated = runInNewContext(source.replace('export function', 'function') + '\nassessFixturePlementusDatabaseInfo;', context,
    { codeGeneration: { strings: false, wasm: false } });
  // The filtered isolation command must run its own scenarios.
  for (const [patch, reason, step] of [[{}, 'synthetic_mapping_ready', manual], ...cases]) {
    const out = isolated(...changed(patch).map(JSON.stringify)); assert.equal(out?.reason, reason); assert.equal(out?.nextStep, step); boundary(out);
  }
  for (const [args, expected] of exercised) assert.equal(JSON.stringify(isolated(...args)), expected);
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const side of [0, 1]) {
    const args = fixture().map(JSON.stringify); args[side] = revoked.proxy; const out = isolated(...args);
    assert.equal(out?.reason, 'invalid_input'); boundary(out);
  }
  assert.equal(touched, 0);
});
