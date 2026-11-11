import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { evaluateFixtureApiFailure } from '../src/github/api-error-fixtures.mjs';

const hints = ['none', 'permission-denied', 'rate-limited', 'not-found', 'hidden-resource'];
const transports = ['none', 'timeout', 'connection-failure', 'interrupted'];
const statuses = [400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504];
const fixture = (status = 403, hint = 'none', transport = 'none') => ({ status, hint, transport });
const encode = value => JSON.stringify(value);
const expected = new Map([
  ['400/none', ['REQUEST_ERROR', 'fixture_bad_request']],
  ['401/none', ['AUTHENTICATION_FAILURE', 'fixture_authentication_failure']],
  ['403/none', ['UNKNOWN', 'fixture_ambiguous_403']],
  ['403/permission-denied', ['PERMISSION_DENIED', 'fixture_permission_denied']],
  ['403/rate-limited', ['RATE_LIMITED', 'fixture_rate_limited']],
  ['404/none', ['UNKNOWN', 'fixture_absent_or_hidden']],
  ['404/not-found', ['UNKNOWN', 'fixture_not_found_unverified']],
  ['404/hidden-resource', ['UNKNOWN', 'fixture_hidden_resource']],
  ['409/none', ['CONFLICT', 'fixture_conflict']],
  ['422/none', ['REQUEST_ERROR', 'fixture_validation_error']],
  ['429/none', ['RATE_LIMITED', 'fixture_rate_limited']],
  ['429/rate-limited', ['RATE_LIMITED', 'fixture_rate_limited']],
  ['500/none', ['PROVIDER_FAILURE', 'fixture_provider_failure']],
  ['502/none', ['PROVIDER_FAILURE', 'fixture_provider_failure']],
  ['503/none', ['PROVIDER_FAILURE', 'fixture_provider_failure']],
  ['504/none', ['PROVIDER_FAILURE', 'fixture_provider_failure']],
]);
const reasons = new Set([...expected.values()].map(([, reason]) => reason).concat([
  'invalid_fixture', 'contradictory_fixture', 'missing_failure', 'unsupported_status',
  'fixture_timeout', 'fixture_connection_failure', 'fixture_interrupted',
]));
const categories = new Set([...expected.values()].map(([category]) => category));
function safe(result) {
  assert.deepEqual(Object.keys(result), ['evidenceTier', 'fixtureOnly', 'accountVerified', 'executionAuthorized',
    'approvalGranted', 'trustedContinuingContext', 'nextStep', 'readOutcome', 'category', 'reason']);
  assert.equal(result.evidenceTier, 'SIMULATED');
  assert.equal(result.fixtureOnly, true);
  assert.equal(result.nextStep, 'manual');
  assert.equal(result.readOutcome, 'UNKNOWN');
  for (const flag of ['accountVerified', 'executionAuthorized', 'approvalGranted', 'trustedContinuingContext']) {
    assert.equal(result[flag], false);
  }
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.values(result).every(value => typeof value === 'string' || typeof value === 'boolean'));
  assert.ok(categories.has(result.category)); assert.ok(reasons.has(result.reason));
  const text = encode(result);
  assert.match(text, /^[\x20-\x7e]+$/); assert.ok(Buffer.byteLength(text) <= 512);
  assert.doesNotMatch(text, /SECRET|Error|stack|https?:|token|password|retry|reset|quota|requestId/);
  return result;
}
function check(text, category = 'UNKNOWN', reason = 'invalid_fixture') {
  const result = safe(evaluateFixtureApiFailure(text));
  assert.equal(result.category, category); assert.equal(result.reason, reason);
  return result;
}

for (const status of statuses) for (const hint of hints) for (const transport of transports) {
  test(`HTTP matrix ${status}/${hint}/${transport}`, () => {
    const outcome = transport === 'none' ? expected.get(`${status}/${hint}`) : undefined;
    check(encode(fixture(status, hint, transport)), ...(outcome ?? ['UNKNOWN', 'contradictory_fixture']));
  });
}
for (const hint of hints) for (const transport of transports) {
  test(`transport/missing matrix null/${hint}/${transport}`, () => {
    const reason = hint !== 'none' ? 'contradictory_fixture' : transport === 'none' ? 'missing_failure' :
      ({ timeout: 'fixture_timeout', 'connection-failure': 'fixture_connection_failure', interrupted: 'fixture_interrupted' })[transport];
    check(encode(fixture(null, hint, transport)), 'UNKNOWN', reason);
  });
}
test('every other in-range status stays unsupported for every hint, never successful', () => {
  for (let status = 100; status <= 599; status++) {
    if (statuses.includes(status)) continue;
    for (const hint of hints) check(encode(fixture(status, hint)), 'UNKNOWN', 'unsupported_status');
    for (const transport of transports.slice(1)) {
      check(encode(fixture(status, 'none', transport)), 'UNKNOWN', 'contradictory_fixture');
    }
  }
});
test('403 needs one compatible indicator; rate hints cannot override denial contradictions', () => {
  check(encode(fixture(403)), 'UNKNOWN', 'fixture_ambiguous_403');
  check(encode(fixture(403, 'permission-denied')), 'PERMISSION_DENIED', 'fixture_permission_denied');
  check(encode(fixture(403, 'rate-limited')), 'RATE_LIMITED', 'fixture_rate_limited');
  check(encode(fixture(429, 'permission-denied')), 'UNKNOWN', 'contradictory_fixture');
  check(encode(fixture(401, 'rate-limited')), 'UNKNOWN', 'contradictory_fixture');
  check('{"status":403,"hint":"permission-denied","hint":"rate-limited","transport":"none"}');
  check(encode({ ...fixture(403, 'permission-denied'), rateLimited: true }));
  check(encode(fixture(403, ['permission-denied', 'rate-limited'])));
});
test('404 claimed absence or hiding never verifies nonexistence', () => {
  for (const hint of ['none', 'not-found', 'hidden-resource']) {
    const result = check(encode(fixture(404, hint)), ...expected.get(`404/${hint}`));
    assert.equal(result.category, 'UNKNOWN'); assert.equal(result.readOutcome, 'UNKNOWN');
  }
});
for (const status of [99, 100, 101, 598, 599, 600, -1, 0, 401.5, true, false, '401', {}, []]) {
  test(`status boundary/type ${encode(status)}`, () => {
    const valid = typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599;
    check(encode(fixture(status)), 'UNKNOWN', valid ? 'unsupported_status' : 'invalid_fixture');
  });
}
for (const field of ['status', 'hint', 'transport']) {
  test(`required field ${field}, malformed values and duplicate keys`, () => {
    const value = fixture(); delete value[field]; check(encode(value));
    for (const wrong of ['SECRET', '', 'NONE', ['none'], { nested: 'SECRET' }, 1.5]) {
      check(encode({ ...fixture(), [field]: wrong }));
    }
    if (field !== 'status') for (const wrong of [null, true, 1]) check(encode({ ...fixture(), [field]: wrong }));
    const text = encode(fixture()); const original = `${encode(field)}:${encode(fixture()[field])}`;
    check(text.replace(original, `${original},${original}`));
  });
}
for (const field of ['extra', '__proto__', 'constructor', 'prototype', 'toJSON', 'toString', 'valueOf',
  'error', 'body', 'headers', 'url', 'resetAt', 'retryAfter', 'token', 'requestId', 'accountVerified']) {
  test(`extra field ${field} cannot enter classification/output`, () => {
    const value = fixture(); Object.defineProperty(value, field, { value: 'SECRET', enumerable: true });
    check(encode(value));
  });
}
test('schema validation precedes semantic contradiction and unsupported classification', () => {
  check(encode({ ...fixture(403, 'rate-limited', 'timeout'), extra: true }));
  check(encode(fixture(700, 'none', 'timeout')));
  check(encode(fixture(418, 'SECRET')));
  check(encode(fixture(418, 'permission-denied')), 'UNKNOWN', 'unsupported_status');
});
test('noncanonical encodings and malformed containers never classify a read', () => {
  const text = encode(fixture(401));
  for (const bad of ['', '{', 'null', 'false', '1', '"SECRET"', '[]', '[{}]', '{}', text + '\n', ' ' + text,
    text.replace('401', '401.0'), text.replace('401', '4.01e2'), text.replace('none', '\\u006eone'),
    text.replace('status', '\\u0073tatus'), text.replace('none', 'nοne'), text.replace('none', '\\ud800'),
    '['.repeat(60) + '0' + ']'.repeat(60), '{"status":1e999,"hint":"none","transport":"none"}']) check(bad);
});
test('canonical key order may vary without changing results', () => {
  const normal = check(encode(fixture(401)), ...expected.get('401/none'));
  assert.deepEqual(check('{"transport":"none","hint":"none","status":401}', ...expected.get('401/none')), normal);
});
for (const size of [0, 1, 127, 128, 129]) {
  test(`raw input byte boundary ${size} fails safely without padding admission`, () => {
    const text = size >= 2 ? '"' + 'x'.repeat(size - 2) + '"' : 'x'.repeat(size);
    assert.equal(Buffer.byteLength(text), size); check(text);
  });
}
test('all closed-schema tuples fit the byte cap; longest enum strings are bounded', () => {
  let max = 0;
  for (const status of [null, ...statuses]) for (const hint of hints) for (const transport of transports) {
    const text = encode(fixture(status, hint, transport)); max = Math.max(max, text.length);
    assert.ok(text.length <= 128); safe(evaluateFixtureApiFailure(text));
  }
  assert.ok(max < 127, 'no valid schema can be padded to the raw-size limit');
});
test('hostile caller inputs are rejected without invoking any hooks', () => {
  let calls = 0; const hook = () => { calls++; throw new Error('SECRET'); };
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook, getOwnPropertyDescriptor: hook });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const cycle = {}; cycle.self = cycle;
  for (const value of [fixture(), [], cycle, Object.create(null), Object.create({ inherited: true }),
    { get status() { return hook(); } }, { toJSON: hook, toString: hook, valueOf: hook, [Symbol.toPrimitive]: hook },
    { [Symbol('SECRET')]: true }, new String(encode(fixture())), proxy, revoked.proxy,
    undefined, null, true, 1, 1n, Symbol('SECRET'), hook, new Proxy(hook, { apply: hook })]) check(value);
  assert.equal(calls, 0);
});
test('repeatable results are immutable and never mutate or freeze caller data', () => {
  const value = fixture(429); const text = encode(value); const expectedResult = check(text, ...expected.get('429/none'));
  for (let i = 0; i < 20; i++) assert.deepEqual(check(text, ...expected.get('429/none')), expectedResult);
  for (const field of Object.keys(expectedResult)) assert.throws(() => { expectedResult[field] = 'SECRET'; }, TypeError);
  assert.equal(encode(value), text); assert.equal(Object.isFrozen(value), false);
  check(value); assert.equal(encode(value), text); assert.equal(Object.isFrozen(value), false);
});
test('all fixed public outcomes stay bounded with no retry or reset data', () => {
  for (const [pair, outcome] of expected) {
    const [status, hint] = pair.split('/'); const result = check(encode(fixture(Number(status), hint)), ...outcome);
    assert.equal(Object.hasOwn(result, 'retryAfter'), false); assert.equal(Object.hasOwn(result, 'resetAt'), false);
  }
  for (const transport of transports.slice(1)) safe(evaluateFixtureApiFailure(encode(fixture(null, 'none', transport))));
});
test('import-free source has no product caller or external/scheduling capability', () => {
  const source = readFileSync(new URL('../src/github/api-error-fixtures.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:import|require|fetch|XMLHttpRequest|WebSocket|chrome|browser|localStorage|sessionStorage|indexedDB|process|eval|Function|setTimeout|setInterval|queueMicrotask|Date)\s*(?:[.(]|\{|'|"|\*)/);
  assert.doesNotMatch(source, /Math\.random|\basync\b|\bawait\b/);
  for (const file of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true })) {
    if (file.isFile() && /\.(mjs|js|html)$/.test(file.name) && file.name !== 'api-error-fixtures.mjs') {
      assert.doesNotMatch(readFileSync(`${file.parentPath}/${file.name}`, 'utf8'), /api-error-fixtures|evaluateFixtureApiFailure/);
    }
  }
  const keys = ['fetch', 'chrome', 'browser', 'localStorage', 'sessionStorage', 'indexedDB', 'setTimeout', 'setInterval', 'queueMicrotask', 'Date'];
  const descriptors = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key)); let accesses = 0;
  try {
    for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, get() { accesses++; throw new Error('SECRET'); } });
    for (const [pair, outcome] of expected) {
      const [status, hint] = pair.split('/'); check(encode(fixture(Number(status), hint)), ...outcome);
    }
    for (const transport of transports.slice(1)) safe(evaluateFixtureApiFailure(encode(fixture(null, 'none', transport))));
    check('{}'); assert.equal(accesses, 0);
  } finally {
    keys.forEach((key, i) => descriptors[i] ? Object.defineProperty(globalThis, key, descriptors[i]) : delete globalThis[key]);
  }
});
