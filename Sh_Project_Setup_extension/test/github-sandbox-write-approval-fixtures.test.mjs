import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as module from '../src/github/sandbox-write-approval-fixtures.mjs';

const evaluate = module.evaluateFixtureSandboxWriteApproval;
const encode = JSON.stringify;
const suffixes = ['alpha', 'beta', 'gamma', 'delta'];
const authorizationStates = ['declared', 'missing', 'denied', 'revoked', 'withdrawn', 'unknown', 'unavailable', 'unsupported'];
const approvalStates = ['declared', 'missing', 'denied', 'cancelled', 'withdrawn', 'unknown', 'unavailable', 'unsupported'];
const target = () => ({ account: 'fixture-account-alpha', organization: 'fixture-org-alpha',
  repository: 'fixture-repo-alpha', name: 'fixture-name-alpha', operation: 'create-new', visibility: 'private' });
const fixture = () => ({
  preview: target(), catalog: [{ ...target(), state: 'new' }],
  authorizations: [{ scope: 'fixture-disposable-sandbox', decision: 'declared', target: target() }],
  approvals: [{ decision: 'declared', claim: 'fresh-fixture', target: target() }],
  context: 'unchanged-fixture', writeState: 'not-attempted-fixture',
});
const locations = f => [f, f.preview, ...f.catalog, ...f.authorizations, ...f.approvals,
  ...f.authorizations.map(a => a.target), ...f.approvals.map(a => a.target)];
function safe(result) {
  assert.ok(result && typeof result === 'object', 'the fixture gate must return a non-authorizing summary');
  assert.deepEqual(Object.keys(result), ['evidenceTier', 'fixtureOnly', 'accountVerified',
    'executionAuthorized', 'approvalGranted', 'trustedContinuingContext', 'nextStep', 'outcome', 'reason']);
  assert.equal(result.evidenceTier, 'SIMULATED');
  assert.equal(result.fixtureOnly, true);
  assert.equal(result.nextStep, 'manual');
  for (const key of ['accountVerified', 'executionAuthorized', 'approvalGranted', 'trustedContinuingContext']) assert.equal(result[key], false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.values(result).every(value => value === null || typeof value !== 'object'));
  const text = encode(result);
  assert.ok(Buffer.byteLength(text) <= 384);
  assert.match(text, /^[\x20-\x7e]+$/);
  assert.doesNotMatch(text, /SECRET|Error|stack|https?:|github\.com|password|token|endpoint|method|body|retry|fixture-account|fixture-org|fixture-repo|fixture-name/);
  return result;
}
function check(value, outcome = 'MANUAL_ONLY', reason = 'invalid_fixture', raw = false) {
  const result = safe(evaluate(raw ? value : encode(value)));
  assert.equal(result.outcome, outcome);
  assert.equal(result.reason, reason);
  return result;
}
const positive = (f = fixture()) => check(f, 'SYNTHETIC_CHECKS_SATISFIED', 'synthetic_declarations_only');

for (const authorization of ['absent', ...authorizationStates]) for (const approval of ['absent', ...approvalStates]) {
  test(`independent synthetic declarations: authorization ${authorization}, approval ${approval}`, () => {
    const f = fixture();
    if (authorization === 'absent') f.authorizations = []; else f.authorizations[0].decision = authorization;
    if (approval === 'absent') f.approvals = []; else f.approvals[0].decision = approval;
    if (authorization !== 'declared') {
      check(f, ['denied', 'revoked', 'withdrawn'].includes(authorization) ? 'BLOCKED' : 'MANUAL_ONLY',
        `authorization_${authorization === 'absent' ? 'missing' : authorization}`);
    } else if (approval !== 'declared') {
      check(f, ['denied', 'cancelled', 'withdrawn'].includes(approval) ? 'BLOCKED' : 'MANUAL_ONLY',
        `approval_${approval === 'absent' ? 'missing' : approval}`);
    } else positive(f);
  });
}
test('the sole export produces a descriptive match without any executable target or approval', () => {
  assert.deepEqual(Object.keys(module), ['evaluateFixtureSandboxWriteApproval']);
  assert.deepEqual(positive(), {
    evidenceTier: 'SIMULATED', fixtureOnly: true, accountVerified: false, executionAuthorized: false,
    approvalGranted: false, trustedContinuingContext: false, nextStep: 'manual',
    outcome: 'SYNTHETIC_CHECKS_SATISFIED', reason: 'synthetic_declarations_only',
  });
});
for (const scope of ['unknown', 'unavailable', 'unsupported']) {
  test(`sandbox scope ${scope} fails closed independently of approval`, () => {
    const f = fixture(); f.authorizations[0].scope = scope; check(f, 'MANUAL_ONLY', `sandbox_scope_${scope}`);
  });
}
for (const claim of ['stale-fixture', 'reused-fixture', 'unknown']) {
  test(`approval claim ${claim} cannot satisfy synthetic checks`, () => {
    const f = fixture(); f.approvals[0].claim = claim; check(f, 'MANUAL_ONLY', `approval_claim_${claim}`);
  });
}
for (const context of ['changed-target', 'stale', 'cancelled', 'invalidated', 'interrupted', 'restarted', 'unknown']) {
  test(`context ${context} invalidates the synthetic pair`, () => {
    const f = fixture(); f.context = context; check(f, 'MANUAL_ONLY', `context_${context}`);
  });
}
test('possible-write uncertainty requires reconciliation ahead of semantic denials and interruption, never retry', () => {
  for (const mutate of [() => {}, f => { f.context = 'interrupted'; }, f => { f.context = 'restarted'; },
    f => { f.authorizations = []; }, f => { f.approvals[0].decision = 'denied'; },
    f => { f.catalog.push({ ...f.catalog[0] }); }, f => { f.approvals.push({ ...f.approvals[0] }); }]) {
    const f = fixture(); f.writeState = 'unknown-possible-write'; mutate(f);
    check(f, 'RECONCILE_REQUIRED', 'unknown_possible_write');
  }
  const malformed = fixture(); malformed.writeState = 'unknown-possible-write'; malformed.extra = true; check(malformed);
});
const mismatches = { account: 'fixture-account-beta', organization: 'fixture-org-beta',
  repository: 'fixture-repo-beta', name: 'fixture-name-beta', operation: 'select-existing', visibility: 'public' };
for (const concept of ['authorizations', 'approvals']) for (const [field, value] of Object.entries(mismatches)) {
  test(`${concept} cannot authorize another ${field}`, () => {
    const f = fixture(); f[concept][0].target[field] = value;
    check(f, 'MANUAL_ONLY', concept === 'authorizations' ? 'authorization_mismatch' : 'approval_mismatch');
  });
}
for (const field of ['account', 'organization', 'repository', 'name']) {
  test(`changing ${field} after the fixture approval cannot reuse it`, () => {
    const f = fixture(); f.preview[field] = mismatches[field]; f.catalog[0][field] = mismatches[field];
    f.authorizations[0].target[field] = mismatches[field]; check(f, 'MANUAL_ONLY', 'approval_mismatch');
  });
}
for (const field of Object.keys(mismatches)) {
  test(`preview ${field} must agree with the selected catalog entry`, () => {
    const f = fixture(); f.preview[field] = mismatches[field];
    check(f, 'MANUAL_ONLY', field === 'repository' ? 'catalog_missing' : 'preview_mismatch');
  });
}
test('existing selection never becomes a creation even with matching synthetic declarations', () => {
  const f = fixture();
  for (const t of [f.preview, f.catalog[0], f.authorizations[0].target, f.approvals[0].target]) t.operation = 'select-existing';
  f.catalog[0].state = 'existing'; check(f, 'MANUAL_ONLY', 'preview_not_creation');
});
for (const operation of ['unknown', 'unsupported']) {
  test(`${operation} operation cannot become a creation`, () => {
    const f = fixture();
    for (const t of [f.preview, f.catalog[0], f.authorizations[0].target, f.approvals[0].target]) t.operation = operation;
    f.catalog[0].state = 'unknown'; check(f, 'MANUAL_ONLY', 'preview_not_creation');
  });
}
for (const state of ['unknown', 'unavailable', 'unsupported']) {
  test(`selected repository state ${state} fails closed`, () => {
    const f = fixture(); f.catalog[0].state = state; check(f, 'MANUAL_ONLY', 'preview_not_creation');
  });
}
for (const visibility of ['public', 'internal', 'unknown', 'unavailable', 'unsupported']) {
  test(`matching ${visibility} declarations still cannot satisfy private creation`, () => {
    const f = fixture();
    for (const t of [f.preview, f.catalog[0], f.authorizations[0].target, f.approvals[0].target]) t.visibility = visibility;
    check(f, visibility === 'public' ? 'BLOCKED' : 'MANUAL_ONLY', visibility === 'public' ? 'public_visibility_blocked' : 'visibility_unsupported');
  });
}
for (const key of ['authorizations', 'approvals']) {
  test(`identical and contradictory duplicate ${key} are rejected`, () => {
    for (const decision of ['declared', 'denied']) {
      const f = fixture(); f[key].push({ ...f[key][0], decision }); check(f, 'MANUAL_ONLY', 'conflicting_declarations');
    }
  });
}
const secondEntry = () => ({ ...target(), repository: 'fixture-repo-beta', name: 'fixture-name-beta', state: 'new' });
test('unselected duplicate repositories, name collisions, ownership conflicts and operation contradictions invalidate catalog', () => {
  for (const change of [e => { e.repository = 'fixture-repo-alpha'; }, e => { e.name = 'fixture-name-alpha'; },
    e => { e.account = 'fixture-account-beta'; }, e => { e.operation = 'select-existing'; },
    e => { e.state = 'existing'; }]) {
    const f = fixture(); const entry = secondEntry(); change(entry); f.catalog.push(entry); check(f, 'MANUAL_ONLY', 'catalog_conflict');
  }
});
test('valid unselected entries and same names in different organizations do not replace the selected target', () => {
  const f = fixture(); f.catalog.unshift({ ...secondEntry(), organization: 'fixture-org-beta', name: 'fixture-name-alpha',
    account: 'fixture-account-beta', state: 'existing', operation: 'select-existing' }); positive(f);
  f.preview.account = 'fixture-account-beta'; check(f, 'MANUAL_ONLY', 'preview_mismatch');
});
for (const suffix of suffixes) {
  test(`complete allowlisted ${suffix} target remains synthetic`, () => {
    positive(JSON.parse(encode(fixture()).replaceAll('alpha', suffix)));
  });
}
for (const count of [0, 1, 2, 3, 4]) {
  test(`catalog count ${count} enforces absence and upper bound`, () => {
    const f = fixture(); f.catalog = suffixes.slice(0, count).map(s => ({ ...target(), repository: `fixture-repo-${s}`, name: `fixture-name-${s}`, state: 'new' }));
    if (count === 0) check(f, 'MANUAL_ONLY', 'catalog_missing'); else if (count === 4) check(f); else positive(f);
  });
}
for (const key of ['authorizations', 'approvals']) for (const count of [0, 1, 2, 3]) {
  test(`${key} count ${count} distinguishes missing, single and conflicting declarations`, () => {
    const f = fixture(); f[key] = Array.from({ length: count }, () => structuredClone(f[key][0]));
    if (count === 0) check(f, 'MANUAL_ONLY', key === 'authorizations' ? 'authorization_missing' : 'approval_missing');
    else if (count === 1) positive(f); else if (count === 2) check(f, 'MANUAL_ONLY', 'conflicting_declarations'); else check(f);
  });
}
const fields = locations(fixture()).map(record => Object.keys(record));
for (const [index, keys] of fields.entries()) for (const key of keys) {
  test(`record ${index} field ${key} requires exact shape and type without duplicate keys`, () => {
    const missing = fixture(); delete locations(missing)[index][key]; check(missing);
    for (const wrong of [null, true, 1, [], {}, 'SECRET']) {
      if (index === 0 && ['catalog', 'authorizations', 'approvals'].includes(key) && Array.isArray(wrong)) continue;
      const f = fixture(); locations(f)[index][key] = wrong; check(f);
    }
    const f = fixture(); const selected = locations(f)[index];
    const token = `${encode(key)}:${encode(selected[key])}`;
    const duplicate = encode(selected).replace(token, `${token},${token}`);
    const shell = JSON.stringify(f, (_key, value) => value === selected ? 'RECORD_PLACEHOLDER' : value);
    const text = shell.replace('"RECORD_PLACEHOLDER"', duplicate);
    check(text, 'MANUAL_ONLY', 'invalid_fixture', true);
  });
}
for (let index = 0; index < fields.length; index++) {
  test(`record ${index} rejects arbitrary fields, real identities, capabilities and caller claims`, () => {
    for (const key of ['extra', '__proto__', 'constructor', 'prototype', 'toJSON', 'toString', 'valueOf',
      'accountVerified', 'executionAuthorized', 'approvalGranted', 'trustedContinuingContext', 'signedIn',
      'createPermission', 'timestamp', 'approvalRef', 'token', 'url']) {
      const f = fixture(); Object.defineProperty(locations(f)[index], key, { value: 'SECRET', enumerable: true }); check(f);
    }
  });
}
test('the entire catalog and every declaration validate even if unselected, duplicated or already denied', () => {
  const base = fixture(); base.catalog.push(secondEntry()); positive(base);
  for (const key of Object.keys(secondEntry())) {
    const missing = structuredClone(base); delete missing.catalog[1][key]; check(missing);
    const malformed = structuredClone(base); malformed.catalog[1][key] = 'SECRET'; check(malformed);
  }
  for (const key of ['authorizations', 'approvals']) {
    const f = fixture(); f[key].push(structuredClone(f[key][0])); f[key][1].target.name = 'SECRET'; check(f);
  }
  const denied = structuredClone(base); denied.authorizations[0].decision = 'denied'; denied.catalog[1].extra = true; check(denied);
});
for (const index of [1, 2, 5, 6]) {
  test(`target record ${index} rejects real and near-match identifiers in every identity field`, () => {
    for (const key of ['account', 'organization', 'repository', 'name']) for (const wrong of ['', 'My-Company', 'https://example.invalid/SECRET',
      'fixture-account-alphaX', 'fixture-name-ALPHA', 'fixture-name-α', 'fixture-name-alpha\n', 'fixture-name-alpha/', 'SECRET'.repeat(900)]) {
      const f = fixture(); locations(f)[index][key] = wrong; check(f);
    }
  });
}
for (const size of [0, 1, 4095, 4096, 4097]) {
  test(`raw byte boundary ${size} rejects arbitrary padding`, () => {
    const raw = size < 2 ? 'x'.repeat(size) : '"' + 'x'.repeat(size - 2) + '"';
    assert.equal(Buffer.byteLength(raw), size); check(raw, 'MANUAL_ONLY', 'invalid_fixture', true);
  });
}
test('maximum collections and long vocabulary fit below input cap without arbitrary padding', () => {
  const f = fixture();
  f.catalog = suffixes.slice(0, 3).map(s => ({ account: `fixture-account-${s}`, organization: `fixture-org-${s}`,
    repository: `fixture-repo-${s}`, name: `fixture-name-${s}`, operation: 'select-existing', visibility: 'unsupported', state: 'unsupported' }));
  f.authorizations.push(structuredClone(f.authorizations[0])); f.approvals.push(structuredClone(f.approvals[0]));
  assert.ok(encode(f).length < 4095); check(f, 'MANUAL_ONLY', 'conflicting_declarations');
});
test('malformed, escaped, Unicode, deeply nested and noncanonical inputs fail closed', () => {
  const text = encode(fixture());
  for (const raw of ['', '{', '{}', 'null', 'true', '1', '-0', '[]', '"SECRET"', text + ' ', '\n' + text, '\ufeff' + text,
    text.replace('alpha', '\\u0061lpha'), text.replace('preview', '\\u0070review'), text.replace('alpha', 'α'),
    text.replace('alpha', '\\ud800'), text.replace('alpha', '\\u0000'), text.replace('alpha', '\x7f'),
    text.replace('"context":"unchanged-fixture"', '"context":"interrupted","context":"unchanged-fixture"'),
    text.replace('"catalog":[', '"catalog":[null,'), '['.repeat(1500) + '0' + ']'.repeat(1500)]) check(raw, 'MANUAL_ONLY', 'invalid_fixture', true);
});
test('non-string hostile inputs cannot execute getters, proxy traps or coercion', () => {
  let calls = 0; const hook = () => { calls++; throw new Error('SECRET'); };
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook, getOwnPropertyDescriptor: hook });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const cycle = {}; cycle.self = cycle;
  for (const input of [fixture(), cycle, proxy, revoked.proxy, Object.create(null), Object.create({ inherited: 'SECRET' }),
    { get preview() { return hook(); } }, { toJSON: hook, toString: hook, valueOf: hook, [Symbol.toPrimitive]: hook },
    new String(encode(fixture())), undefined, null, true, 1, 1n, Symbol('SECRET'), hook, new Proxy(hook, { apply: hook })]) {
    check(input, 'MANUAL_ONLY', 'invalid_fixture', true);
  }
  assert.equal(calls, 0);
});
test('canonical key ordering does not change results', () => {
  const f = fixture();
  function reverse(value) {
    if (Array.isArray(value)) return value.map(reverse);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reverse(v)]));
    return value;
  }
  assert.deepEqual(positive(reverse(f)), positive(f));
});
test('summaries are deeply frozen and deterministic; stateless evaluation cannot consume or authenticate approval', () => {
  const uncertain = fixture(); uncertain.writeState = 'unknown-possible-write';
  const interrupted = fixture(); interrupted.context = 'interrupted';
  const denied = fixture(); denied.approvals[0].decision = 'denied';
  for (const f of [fixture(), {}, uncertain, interrupted, denied]) {
    const text = encode(f); const result = safe(evaluate(text));
    for (let i = 0; i < 12; i++) assert.deepEqual(safe(evaluate(text)), result);
    for (const key of Object.keys(result)) assert.throws(() => { result[key] = 'SECRET'; }, TypeError);
    assert.equal(encode(f), text);
  }
  const saved = positive(); check(uncertain, 'RECONCILE_REQUIRED', 'unknown_possible_write');
  // Identical fixture checks are repeatable descriptions, never replay-resistant grants.
  assert.deepEqual(positive(), saved);
});
test('standalone module has no product callers or external capabilities and runs with capability traps unused', () => {
  const source = readFileSync(new URL('../src/github/sandbox-write-approval-fixtures.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:import|require|fetch|XMLHttpRequest|WebSocket|chrome|browser|localStorage|sessionStorage|indexedDB|process|eval|Function|globalThis|window|document|navigator|Date|performance|setTimeout|setInterval|setImmediate|queueMicrotask|Worker|Promise)\b/);
  assert.doesNotMatch(source, /Math\.random|https?:|github\.com/);
  for (const file of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true })) {
    if (file.isFile() && /\.(mjs|js|html|json)$/.test(file.name) && file.name !== 'sandbox-write-approval-fixtures.mjs') {
      assert.doesNotMatch(readFileSync(`${file.parentPath}/${file.name}`, 'utf8'), /sandbox-write-approval-fixtures|evaluateFixtureSandboxWriteApproval/);
    }
  }
  let accesses = 0; const context = {};
  for (const key of ['fetch', 'chrome', 'browser', 'localStorage', 'sessionStorage', 'indexedDB', 'process',
    'setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'Date', 'performance', 'XMLHttpRequest', 'WebSocket', 'navigator']) {
    Object.defineProperty(context, key, { get() { accesses++; throw new Error('SECRET'); } });
  }
  const isolated = runInNewContext(source.replace('export function', 'function') + '\nevaluateFixtureSandboxWriteApproval;', context);
  const uncertain = fixture(); uncertain.writeState = 'unknown-possible-write';
  for (const decision of approvalStates) {
    const f = fixture(); f.approvals[0].decision = decision;
    assert.equal(encode(isolated(encode(f))), encode(safe(evaluate(encode(f)))));
  }
  for (const f of [{}, uncertain]) assert.equal(encode(isolated(encode(f))), encode(safe(evaluate(encode(f)))));
  assert.equal(accesses, 0);
});
