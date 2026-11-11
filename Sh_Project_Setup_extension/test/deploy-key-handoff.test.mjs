import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import * as handoff from '../src/github/deploy-key-handoff.mjs';
import { planFixtureUtilities } from '../src/github/utilities-plan.mjs';
import { validateFixtureSubmoduleStructure } from '../src/github/submodule-structure.mjs';

const base = { version: 1, attempt: 1, planGeneration: 1, contextGeneration: 1,
  selectionIndex: 0, selection: 'valid', structure: 'matched', context: 'current',
  publicKeyAvailability: 'operator_reports_available', permission: 'read_only',
  event: 'start', possibleWrite: false };
const events = ['start', 'key_available', 'confirm', 'defer', 'reject', 'cancel',
  'returned', 'attest', 'observe_match', 'observe_conflict', 'unknown_result', 'invalidate'];
const flags = ['accountVerified', 'permissionVerified', 'approvalGranted',
  'executionAuthorized', 'mutationAuthorized', 'trustedContinuingContext',
  'associationVerified', 'checkoutVerified', 'moduleInstalled', 'effectsApplied'];
const fields = ['version', 'attempt', 'planGeneration', 'contextGeneration', 'selectionIndex',
  'state', 'reason', 'permission', 'evidenceTier', 'fixtureOnly', 'scenarioOutcome',
  'reviewRecorded', 'reconciliationRequired', 'nextStep', ...flags].sort();
function create() {
  assert.equal(typeof handoff.createFixtureDeployKeyHandoff, 'function');
  return handoff.createFixtureDeployKeyHandoff();
}
const send = (c, event = 'start', changes = {}) => c.send(JSON.stringify({ ...base, event, ...changes }));
function safe(r) {
  assert.deepEqual(Object.keys(r).sort(), fields);
  assert.ok(Object.isFrozen(r));
  assert.ok(Object.values(r).every(v => v === null || typeof v !== 'object'));
  assert.equal(r.version, 1);
  assert.equal(r.permission, 'read_only');
  assert.equal(r.evidenceTier, 'SIMULATED');
  assert.equal(r.fixtureOnly, true);
  assert.equal(r.nextStep, 'manual');
  assert.equal(r.scenarioOutcome, r.state);
  for (const flag of flags) assert.equal(r[flag], false, flag);
  const text = JSON.stringify(r);
  assert.ok(text.length <= 4096);
  assert.match(text, /^[\x20-\x7e]+$/);
  assert.doesNotMatch(text, /SECRET|github\.com|ssh-|PRIVATE KEY|fingerprint/);
  return r;
}
function expect(r, state, reason, reconciliation = false) {
  safe(r);
  assert.equal(r.state, state);
  if (reason !== undefined) assert.equal(r.reason, reason);
  assert.equal(r.reconciliationRequired, reconciliation);
  return r;
}
function at(state) {
  const c = create();
  const changes = state === 'NO_ACTION' ? { selection: 'empty', selectionIndex: null, structure: 'empty' } :
    state === 'AWAITING_OPERATOR' ? { publicKeyAvailability: 'unavailable' } :
    state === 'MANUAL_REVIEW' ? { context: 'unknown' } : {};
  send(c, 'start', changes);
  if (['MANUAL_CONFIGURATION', 'AWAITING_VERIFICATION', 'OPERATOR_ATTESTED',
    'ASSOCIATION_OBSERVED', 'RECONCILE_REQUIRED'].includes(state)) send(c, 'confirm');
  if (['AWAITING_VERIFICATION', 'OPERATOR_ATTESTED', 'ASSOCIATION_OBSERVED'].includes(state)) send(c, 'returned');
  if (state === 'OPERATOR_ATTESTED') send(c, 'attest');
  if (state === 'ASSOCIATION_OBSERVED') send(c, 'observe_match');
  if (state === 'RECONCILE_REQUIRED') send(c, 'unknown_result');
  if (state === 'STALE_CONTEXT') send(c, 'invalidate');
  if (state === 'BLOCKED') send(c, 'reject');
  if (state === 'CANCELLED') send(c, 'cancel');
  assert.equal(c.snapshot().state, state);
  return { c, changes };
}

test('initial snapshot has no attempt, no review and no authority; only start creates a binding', () => {
  const c = create();
  const r = safe(c.snapshot());
  assert.equal(r.state, 'AWAITING_OPERATOR');
  assert.equal(r.reason, 'none');
  for (const key of ['attempt', 'planGeneration', 'contextGeneration', 'selectionIndex']) assert.equal(r[key], null);
  assert.equal(r.reviewRecorded, false);
  assert.equal(r.reconciliationRequired, false);
  assert.ok(Object.isFrozen(c));
  expect(send(c, 'confirm'), 'BLOCKED', 'invalid_transition');
  assert.equal(c.snapshot().attempt, null);
});

for (const [changes, state, reason] of [
  [{}, 'REVIEW_REQUIRED', 'review_required'],
  [{ selection: 'empty', selectionIndex: null, structure: 'empty' }, 'NO_ACTION', 'no_selection'],
  [{ selection: 'invalid', publicKeyAvailability: 'unavailable' }, 'BLOCKED', 'selection_invalid'],
  [{ selection: 'conflict' }, 'MANUAL_REVIEW', 'selection_conflict'],
  [{ structure: 'invalid' }, 'BLOCKED', 'structure_invalid'],
  [{ structure: 'unknown' }, 'MANUAL_REVIEW', 'structure_unknown'],
  [{ structure: 'unsupported' }, 'MANUAL_REVIEW', 'structure_unknown'],
  [{ structure: 'conflict' }, 'MANUAL_REVIEW', 'target_conflict'],
  [{ structure: 'empty' }, 'MANUAL_REVIEW', 'target_conflict'],
  [{ context: 'denied', publicKeyAvailability: 'unavailable' }, 'BLOCKED', 'permission_denied'],
  [{ context: 'unknown' }, 'MANUAL_REVIEW', 'context_unknown'],
  [{ context: 'conflict' }, 'MANUAL_REVIEW', 'target_conflict'],
  [{ context: 'stale' }, 'STALE_CONTEXT', 'context_stale'],
  [{ permission: 'unknown' }, 'MANUAL_REVIEW', 'context_unknown'],
  [{ permission: 'write_requested' }, 'BLOCKED', 'write_unsupported'],
  [{ publicKeyAvailability: 'unavailable' }, 'AWAITING_OPERATOR', 'key_unavailable'],
  [{ publicKeyAvailability: 'unknown' }, 'AWAITING_OPERATOR', 'key_unavailable'],
]) test(`start admission ${JSON.stringify(changes)}`, () => expect(send(create(), 'start', changes), state, reason));

for (const [structure, state, reason] of [
  ['invalid', 'BLOCKED', 'structure_invalid'], ['unknown', 'MANUAL_REVIEW', 'structure_unknown'],
  ['unsupported', 'MANUAL_REVIEW', 'structure_unknown'], ['conflict', 'MANUAL_REVIEW', 'target_conflict'],
  ['matched', 'MANUAL_REVIEW', 'target_conflict'],
]) test(`empty selection preserves independent ${structure} structure`, () => {
  expect(send(create(), 'start', { selection: 'empty', selectionIndex: null, structure }), state, reason);
});

const transitions = {
  AWAITING_OPERATOR: { key_available: ['REVIEW_REQUIRED', 'review_required'], cancel: ['CANCELLED', 'operator_cancelled'], invalidate: ['STALE_CONTEXT', 'context_stale'] },
  REVIEW_REQUIRED: { confirm: ['MANUAL_CONFIGURATION', 'none'], defer: ['AWAITING_OPERATOR', 'deferred'], reject: ['BLOCKED', 'operator_rejected'], cancel: ['CANCELLED', 'operator_cancelled'], invalidate: ['STALE_CONTEXT', 'context_stale'] },
  MANUAL_CONFIGURATION: { returned: ['AWAITING_VERIFICATION', 'verification_pending'], cancel: ['CANCELLED', 'operator_cancelled'], invalidate: ['RECONCILE_REQUIRED', 'context_stale'], unknown_result: ['RECONCILE_REQUIRED', 'outcome_unknown'], observe_conflict: ['RECONCILE_REQUIRED', 'association_conflict'] },
  AWAITING_VERIFICATION: { attest: ['OPERATOR_ATTESTED', 'operator_report_only'], observe_match: ['ASSOCIATION_OBSERVED', 'association_match'], observe_conflict: ['RECONCILE_REQUIRED', 'association_conflict'], unknown_result: ['RECONCILE_REQUIRED', 'outcome_unknown'], cancel: ['CANCELLED', 'operator_cancelled'], invalidate: ['RECONCILE_REQUIRED', 'context_stale'] },
  OPERATOR_ATTESTED: { observe_match: ['ASSOCIATION_OBSERVED', 'association_match'], observe_conflict: ['RECONCILE_REQUIRED', 'association_conflict'], unknown_result: ['RECONCILE_REQUIRED', 'outcome_unknown'], cancel: ['CANCELLED', 'operator_cancelled'], invalidate: ['RECONCILE_REQUIRED', 'context_stale'] },
  ASSOCIATION_OBSERVED: { observe_conflict: ['RECONCILE_REQUIRED', 'association_conflict'], unknown_result: ['RECONCILE_REQUIRED', 'outcome_unknown'], cancel: ['CANCELLED', 'operator_cancelled'], invalidate: ['RECONCILE_REQUIRED', 'context_stale'] },
};
for (const [state, supported] of Object.entries(transitions)) for (const event of events) {
  test(`${state} + ${event} respects transition precedence`, () => {
    const { c, changes } = at(state);
    const next = supported[event] ?? [event === 'start' && state !== 'AWAITING_OPERATOR' && state !== 'REVIEW_REQUIRED' ? 'RECONCILE_REQUIRED' : 'BLOCKED', 'invalid_transition'];
    const possible = !['AWAITING_OPERATOR', 'REVIEW_REQUIRED'].includes(state);
    const r = send(c, event, event === 'key_available' ? {} : changes);
    expect(r, ...next, possible && ['RECONCILE_REQUIRED', 'BLOCKED', 'CANCELLED'].includes(next[0]));
    assert.equal(r.reviewRecorded, possible || event === 'confirm' && state === 'REVIEW_REQUIRED');
  });
}
for (const state of ['NO_ACTION', 'BLOCKED', 'CANCELLED']) for (const event of events) {
  test(`${state} cannot be revived by ${event}`, () => {
    const { c, changes } = at(state); const before = c.snapshot();
    assert.deepEqual(send(c, event, changes), before);
  });
}
for (const state of ['MANUAL_REVIEW', 'STALE_CONTEXT', 'RECONCILE_REQUIRED']) {
  test(`${state} never accepts delayed success`, () => {
    const { c, changes } = at(state);
    const r = send(c, 'observe_match', changes);
    expect(r, 'BLOCKED', 'invalid_transition', state === 'RECONCILE_REQUIRED');
  });
}

test('defer requires renewed explicit confirmation even when availability remains reported', () => {
  const c = create(); send(c); send(c, 'defer');
  expect(send(c, 'key_available'), 'REVIEW_REQUIRED', 'review_required');
  assert.equal(c.snapshot().reviewRecorded, false);
  expect(send(c, 'confirm'), 'MANUAL_CONFIGURATION', 'none');
});
test('key_available may update only availability and cannot invent availability', () => {
  const { c } = at('AWAITING_OPERATOR');
  expect(send(c, 'key_available', { publicKeyAvailability: 'unknown' }), 'AWAITING_OPERATOR', 'key_unavailable');
  expect(send(c, 'key_available'), 'REVIEW_REQUIRED', 'review_required');
});
for (const changes of [{ attempt: 2 }, { planGeneration: 2 }, { contextGeneration: 2 },
  { selectionIndex: 1 }, { selection: 'conflict' }, { structure: 'unknown' },
  { context: 'unknown' }, { publicKeyAvailability: 'unknown' }, { permission: 'unknown' }]) {
  for (const state of ['REVIEW_REQUIRED', 'MANUAL_CONFIGURATION']) test(`binding drift ${JSON.stringify(changes)} from ${state}`, () => {
    const { c } = at(state); const before = c.snapshot();
    const r = send(c, 'attest', changes);
    assert.equal(r.state, state === 'REVIEW_REQUIRED' ? 'STALE_CONTEXT' : 'RECONCILE_REQUIRED');
    assert.equal(r.reconciliationRequired, state === 'MANUAL_CONFIGURATION');
    assert.equal(r.attempt, before.attempt); assert.equal(r.selectionIndex, before.selectionIndex);
    assert.equal(r.planGeneration, before.planGeneration); assert.equal(r.contextGeneration, before.contextGeneration);
    safe(r);
    assert.notEqual(send(c, 'observe_match').state, 'ASSOCIATION_OBSERVED');
  });
}
for (const [changes, reason] of [[{ context: 'denied' }, 'permission_denied'],
  [{ permission: 'write_requested' }, 'write_unsupported'], [{ selection: 'invalid' }, 'selection_invalid'],
  [{ structure: 'invalid' }, 'structure_invalid']]) test(`blocking facts outrank drift and key availability: ${reason}`, () => {
  const { c } = at('MANUAL_CONFIGURATION');
  expect(send(c, 'returned', { ...changes, contextGeneration: 2, publicKeyAvailability: 'unavailable' }), 'BLOCKED', reason, true);
});

test('possible write stays latched through return, attestation, cancellation and hostile late input', () => {
  const { c } = at('MANUAL_CONFIGURATION');
  expect(send(c, 'returned', { possibleWrite: false }), 'AWAITING_VERIFICATION', 'verification_pending');
  expect(send(c, 'attest', { possibleWrite: false }), 'OPERATOR_ATTESTED', 'operator_report_only');
  expect(send(c, 'cancel', { possibleWrite: false }), 'CANCELLED', 'operator_cancelled', true);
  const stopped = c.snapshot();
  assert.deepEqual(c.send('SECRET'), stopped);
  assert.deepEqual(send(c, 'observe_match'), stopped);
  assert.deepEqual(send(c, 'start', { attempt: 2, planGeneration: 2 }), stopped);
});
for (const event of ['start', 'confirm', 'cancel', 'unknown_result', 'invalidate']) test(`caller possibleWrite true retained on ${event}`, () => {
  const c = create(); send(c);
  const r = send(c, event, { possibleWrite: true });
  if (event !== 'confirm') assert.equal(r.reconciliationRequired, true);
  const stopped = send(c, 'cancel');
  assert.equal(stopped.reconciliationRequired, true);
});
test('start with possible write requires reconciliation without offering review', () => {
  expect(send(create(), 'start', { possibleWrite: true }), 'RECONCILE_REQUIRED', 'outcome_unknown', true);
});
for (const state of ['MANUAL_REVIEW', 'STALE_CONTEXT', 'NO_ACTION', 'BLOCKED', 'CANCELLED']) test(`fresh generations and higher attempt can start after ${state} without a write`, () => {
  const { c } = at(state);
  const r = send(c, 'start', { attempt: 2, planGeneration: 2, contextGeneration: 2 });
  expect(r, 'REVIEW_REQUIRED', 'review_required'); assert.equal(r.attempt, 2);
  const late = send(c, 'confirm');
  expect(late, 'STALE_CONTEXT', 'context_stale'); assert.equal(late.attempt, 2);
});
for (const changes of [{ attempt: 1, planGeneration: 2 }, { attempt: 2 },
  { attempt: 2, planGeneration: 2, contextGeneration: 1 }]) test(`restart cannot reuse or regress binding ${JSON.stringify(changes)}`, () => {
  const c = create(); send(c, 'start', { contextGeneration: 2 }); send(c, 'invalidate', { contextGeneration: 2 });
  assert.notEqual(send(c, 'start', changes).state, 'REVIEW_REQUIRED');
});
test('fresh start never discards a reconciliation obligation, including after synthetic observation', () => {
  for (const state of ['RECONCILE_REQUIRED', 'ASSOCIATION_OBSERVED']) {
    const { c } = at(state);
    expect(send(c, 'start', { attempt: 2, planGeneration: 2, contextGeneration: 2 }),
      state === 'RECONCILE_REQUIRED' ? 'BLOCKED' : 'RECONCILE_REQUIRED', 'invalid_transition', true);
    assert.equal(c.snapshot().attempt, 1);
  }
});

for (const key of Object.keys(base)) test(`missing field ${key} fails closed`, () => {
  const input = { ...base }; delete input[key];
  expect(create().send(JSON.stringify(input)), 'BLOCKED', 'invalid_input');
});
for (const key of ['version', 'attempt', 'planGeneration', 'contextGeneration', 'selectionIndex']) {
  const invalid = key === 'version' ? [0, 2, null, '1'] : key === 'selectionIndex' ? [-1, 16, null, '0', 0.5] : [0, -1, 1000001, 0.5, null, '1'];
  for (const value of invalid) test(`reject ${key}=${JSON.stringify(value)}`, () => {
    expect(send(create(), 'start', { [key]: value }), 'BLOCKED', 'invalid_input');
  });
}
for (const changes of [{ attempt: 1000000, planGeneration: 1000000, contextGeneration: 1000000, selectionIndex: 15 },
  { attempt: 1, planGeneration: 1, contextGeneration: 1, selectionIndex: 0 }]) test(`accept numeric bounds ${JSON.stringify(changes)}`, () => {
  expect(send(create(), 'start', changes), 'REVIEW_REQUIRED', 'review_required');
});
for (const key of ['selection', 'structure', 'context', 'publicKeyAvailability', 'permission', 'event', 'possibleWrite']) {
  for (const value of ['SECRET', null, {}, [], 1]) test(`closed domain ${key} rejects ${JSON.stringify(value)}`, () => {
    expect(send(create(), 'start', { [key]: value }), 'BLOCKED', 'invalid_input');
  });
}
test('empty selection requires null index', () => {
  expect(send(create(), 'start', { selection: 'empty', structure: 'empty' }), 'BLOCKED', 'invalid_input');
});
test('malformed, duplicate, noncanonical, oversized and hostile JSON never echoes input', () => {
  const canonical = JSON.stringify(base);
  const inputs = ['', 'null', '[]', 'true', '1', '"SECRET"', '{', canonical + '\n',
    canonical.replace('"version":1', '"version":1,"version":1'),
    canonical.replace('"version":1', '"version":1e0'), canonical.replace('"selectionIndex":0', '"selectionIndex":-0'),
    canonical.replace('current', '\\u0063urrent'), canonical.replace('current', 'é'),
    canonical.replace('current', 'ssh-SECRET'), canonical.replace('current', '-----BEGIN PRIVATE KEY-----'),
    '['.repeat(4000) + ']'.repeat(4000), ' '.repeat(8192), ' '.repeat(8193),
    JSON.stringify({ ...base, raw: 'SECRET'.repeat(2000) }),
    ...['__proto__', 'constructor', 'priorState', 'possibleWriteLatch', 'approvalGranted', 'key', 'fingerprint', 'url'].map(key =>
      canonical.slice(0, -1) + `,"${key}":"SECRET"}`)];
  for (const input of inputs) expect(create().send(input), 'BLOCKED', 'invalid_input');
});
test('caller objects, proxies and coercion hooks are rejected without executing hooks', () => {
  let touched = 0;
  const hostile = new Proxy({}, { get() { touched++; throw Error('SECRET'); }, ownKeys() { touched++; throw Error('SECRET'); } });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const input of [undefined, null, 1, true, 1n, Symbol('SECRET'), () => {}, new String(JSON.stringify(base)),
    hostile, revoked.proxy, { toString() { touched++; return JSON.stringify(base); }, toJSON() { touched++; return base; } }]) {
    expect(create().send(input), 'BLOCKED', 'invalid_input');
  }
  assert.equal(touched, 0);
});
test('invalid input after possible write blocks while retaining reconciliation and original sanitized binding', () => {
  const { c } = at('MANUAL_CONFIGURATION');
  expect(c.send('{"SECRET":true}'), 'BLOCKED', 'invalid_input', true);
  assert.equal(c.snapshot().attempt, 1);
});
test('snapshots are deeply immutable, deterministic and independent across controllers', () => {
  const a = create(); const b = create(); const before = a.snapshot();
  assert.deepEqual(send(a), send(b));
  const reviewed = a.snapshot();
  assert.throws(() => { reviewed.state = 'ASSOCIATION_OBSERVED'; }, TypeError);
  assert.throws(() => { a.send = () => {}; }, TypeError);
  send(a, 'confirm'); assert.equal(b.snapshot().state, 'REVIEW_REQUIRED');
  assert.equal(before.attempt, null); assert.equal(reviewed.reviewRecorded, false);
  const c = create(); send(c);
  assert.deepEqual(send(c, 'confirm'), a.snapshot());
});
test('accepted Phase 11 categories are exercised independently without granting provider authority', () => {
  const plan = planFixtureUtilities('[]');
  const structure = validateFixtureSubmoduleStructure('{"gitmodulesText":null,"tree":[]}');
  assert.equal(plan.selectionState, 'empty_optional'); assert.equal(structure.structureState, 'empty');
  expect(send(create(), 'start', { selection: 'empty', selectionIndex: null, structure: structure.structureState }), 'NO_ACTION', 'no_selection');
  const unknown = validateFixtureSubmoduleStructure('{}');
  assert.equal(unknown.structureState, 'review_required');
  expect(send(create(), 'start', { selection: 'empty', selectionIndex: null, structure: 'unknown' }), 'MANUAL_REVIEW', 'structure_unknown');
});
test('controller has no imports or production callers and does not touch external capability globals', async () => {
  const source = readFileSync(new URL('../src/github/deploy-key-handoff.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bimport\b|\brequire\s*\(|\bexport\s+.*\bfrom\b|node:|child_process/);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|chrome|browser|navigator|localStorage|sessionStorage|indexedDB|process|eval|Function)\s*[.(]/);
  for (const file of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true })) {
    if (file.isFile() && /\.(mjs|js|html)$/.test(file.name) && file.name !== 'deploy-key-handoff.mjs') {
      assert.doesNotMatch(readFileSync(`${file.parentPath}/${file.name}`, 'utf8'), /deploy-key-handoff|createFixtureDeployKeyHandoff/);
    }
  }
  const keys = ['fetch', 'XMLHttpRequest', 'WebSocket', 'chrome', 'browser', 'navigator', 'localStorage', 'sessionStorage', 'indexedDB'];
  const descriptors = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  let accesses = 0;
  try {
    for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, get() { accesses++; throw Error('SECRET'); } });
    const isolated = await import('../src/github/deploy-key-handoff.mjs?isolated');
    assert.equal(typeof isolated.createFixtureDeployKeyHandoff, 'function');
    const c = isolated.createFixtureDeployKeyHandoff();
    for (const event of ['start', 'confirm', 'returned', 'attest', 'observe_match', 'invalidate', 'cancel']) safe(send(c, event));
    safe(c.send('SECRET'));
    assert.equal(accesses, 0);
  } finally {
    keys.forEach((key, i) => descriptors[i] ? Object.defineProperty(globalThis, key, descriptors[i]) : delete globalThis[key]);
  }
});

for (const state of ['NO_ACTION', 'BLOCKED', 'CANCELLED']) test(`late possible-write report preserves ${state} and prevents fresh start`, () => {
  const { c, changes } = at(state);
  const before = c.snapshot();
  const late = send(c, 'unknown_result', { ...changes, possibleWrite: true });
  expect(late, state, before.reason, true);
  assert.equal(late.attempt, before.attempt);
  expect(send(c, 'start', { attempt: 2, planGeneration: 2, contextGeneration: 2 }), state, before.reason, true);
});

for (const [state, event] of [['AWAITING_OPERATOR', 'key_available'], ['REVIEW_REQUIRED', 'defer'], ['REVIEW_REQUIRED', 'confirm']]) {
  test(`new possible-write uncertainty on ${state}/${event} requires reconciliation before any handoff`, () => {
    const { c } = at(state);
    const r = send(c, event, { possibleWrite: true });
    expect(r, 'RECONCILE_REQUIRED', 'outcome_unknown', true);
    assert.equal(r.reviewRecorded, false);
  });
}
test('fresh start reporting a possible write retains its own new binding and requires reconciliation', () => {
  const { c } = at('CANCELLED');
  const r = send(c, 'start', { attempt: 2, planGeneration: 2, contextGeneration: 2, possibleWrite: true });
  expect(r, 'RECONCILE_REQUIRED', 'outcome_unknown', true);
  assert.equal(r.attempt, 2);
});

for (const event of events) test(`RECONCILE_REQUIRED + ${event} never retries and rejects impossible transitions`, () => {
  const { c } = at('RECONCILE_REQUIRED');
  const next = event === 'cancel' ? ['CANCELLED', 'operator_cancelled'] :
    event === 'invalidate' ? ['RECONCILE_REQUIRED', 'context_stale'] : ['BLOCKED', 'invalid_transition'];
  expect(send(c, event), ...next, true);
});
for (const state of ['MANUAL_REVIEW', 'STALE_CONTEXT']) for (const event of events) {
  test(`${state} + ${event} requires fresh review`, () => {
    const { c, changes } = at(state);
    const next = event === 'cancel' ? ['CANCELLED', 'operator_cancelled'] :
      event === 'invalidate' ? ['STALE_CONTEXT', 'context_stale'] : ['BLOCKED', 'invalid_transition'];
    expect(send(c, event, changes), ...next);
  });
}
