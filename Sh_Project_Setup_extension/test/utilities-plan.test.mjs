import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { planFixtureUtilities as plan } from '../src/github/utilities-plan.mjs';
import { validateUtilities } from '../src/popup/validation.mjs';

const entry = (url = 'https://github.com/fixture-org/fixture-repo', path = 'addons/utility') => ({ url, path });
const run = entries => plan(JSON.stringify(entries));
const forms = ['https://github.com/', 'git@github.com:', 'ssh://git@github.com/'];

for (const prefix of forms) for (const suffix of ['', '.git', '.GIT']) {
  test(`accepts supported form ${prefix} with suffix ${suffix || 'none'}`, () => {
    const row = entry(`${prefix}Fixture-Org/Fixture.Repo_1${suffix}`);
    const result = run([row]);
    assert.equal(result.selectionState, 'valid');
    assert.equal(result.outcome, 'MANUAL_REVIEW');
    assert.deepEqual(result.entries, [{ index: 0, state: 'valid', reasons: [] }]);
    assert.deepEqual(validateUtilities([row]), [{ url: '', path: '' }]);
  });
}

test('multiple independent optional utilities retain input indexes without raw fields', () => {
  const result = run([entry(), entry('git@github.com:fixture-org/other', 'addons/other')]);
  assert.equal(result.selectionState, 'valid');
  assert.deepEqual(result.entries.map(row => row.index), [0, 1]);
  assert.deepEqual(result.conflicts, []);
});

test('zero selections is optional no action', () => {
  const result = run([]);
  assert.equal(result.selectionState, 'empty_optional');
  assert.equal(result.outcome, 'NO_ACTION');
  assert.deepEqual(result.entries, []);
  assert.deepEqual(result.conflicts, []);
});

for (const left of forms) for (const right of forms) {
  test(`duplicates normalize identity across ${left} and ${right}`, () => {
    const rows = [entry(`${left}Fixture-Org/Fixture-Repo.git`, 'one'),
      entry(`${right.toUpperCase()}FIXTURE-ORG/FIXTURE-REPO`, 'two')];
    const result = run(rows);
    assert.equal(result.selectionState, 'conflicts');
    assert.equal(result.outcome, 'MANUAL_REVIEW');
    assert.deepEqual(result.conflicts, [{ indexes: [0, 1], reasons: ['duplicate_repository'] }]);
    assert.ok(result.entries.every(row => row.state === 'conflict'));
    assert.ok(validateUtilities(rows).every(row => row.url));
  });
}

for (const [left, right, reason] of [
  ['addons/util', 'addons/util', 'path_collision'],
  ['addons/Util', 'ADDONS/util', 'path_collision'],
  ['addons', 'addons/util', 'path_overlap'],
  ['addons/util/deep', 'ADDONS', 'path_overlap'],
]) {
  test(`detects ${reason}: ${left} and ${right}`, () => {
    const result = run([entry(undefined, left), entry('git@github.com:fixture-org/other', right)]);
    assert.equal(result.selectionState, 'conflicts');
    assert.equal(result.outcome, 'MANUAL_REVIEW');
    assert.deepEqual(result.conflicts, [{ indexes: [0, 1], reasons: [reason] }]);
  });
}

test('prefix comparison respects component boundaries', () => {
  assert.equal(run([entry(undefined, 'addons/util'),
    entry('git@github.com:fixture-org/other', 'addons/utility')]).selectionState, 'valid');
});

test('reports both duplicate identity and path collision for each pair', () => {
  const result = run([entry(), entry(), entry()]);
  assert.deepEqual(result.conflicts, [
    { indexes: [0, 1], reasons: ['duplicate_repository', 'path_collision'] },
    { indexes: [0, 2], reasons: ['duplicate_repository', 'path_collision'] },
    { indexes: [1, 2], reasons: ['duplicate_repository', 'path_collision'] },
  ]);
});

test('suffix normalization matches popup for dot-git repository names', () => {
  const rows = [entry('https://github.com/fixture-org/.git', 'one'),
    entry('git@github.com:fixture-org/.git.git', 'two')];
  assert.ok(validateUtilities(rows).every(row => row.url === 'Duplicate Utilities repository.'));
  assert.deepEqual(run(rows).conflicts, [{ indexes: [0, 1], reasons: ['duplicate_repository'] }]);
});

const invalidUrls = ['', 'http://github.com/org/repo', 'https://token@github.com/org/repo',
  'https://user:secret@github.com/org/repo', 'ssh://user@github.com/org/repo',
  'ssh://git:secret@github.com/org/repo', 'https://github.com.evil/org/repo',
  'https://gitlab.com/org/repo', 'https://github.com:443/org/repo',
  'ssh://git@github.com:22/org/repo', 'git://github.com/org/repo',
  'https://github.com/org/repo/', 'git@github.com:org/repo/extra',
  'https://github.com/org/repo?token=secret', 'https://github.com/org/repo#main',
  'https://github.com/org/re%70o', 'https://github.com/org/%2e%2e',
  'https://github.com/org/repo%252fsecret', 'https://github.com/org\\repo',
  'https://github.com/org//repo', 'https://github.com/-org/repo',
  'https://github.com/org--name/repo', 'https://github.com/org/..',
  'https://github.com/' + 'o'.repeat(40) + '/repo',
  'https://github.com/org/' + 'r'.repeat(101), 'https://github.com/org/r\nsecret',
  'https://github.com/org/r\u0000secret', 'https://github.com/org/répo'];
invalidUrls.forEach((url, index) => test(`rejects unsafe URL ${index} consistently with popup`, () => {
  const result = run([entry(url)]);
  assert.ok(['invalid_input', 'invalid_entries'].includes(result.selectionState));
  assert.equal(result.outcome, 'BLOCKED');
  assert.ok(validateUtilities([entry(url)])[0].url);
}));

const invalidPaths = ['', '/absolute', '../outside', 'foo/../bar', './foo', 'foo/./bar',
  'foo//bar', 'foo/', '.git', '.git/config', 'foo/.GIT', '.gitmodules', 'foo/.gitmodules',
  '.github/workflows', 'foo/.hidden', 'foo\\bar', 'C:/foo', '//server/share', 'foo/CON',
  'foo/aux.txt', 'foo/LPT9', 'foo/com1.log', 'foo/bar.lock', 'foo/BAR.LOCK', 'foo/bar.',
  'foo/space here', 'foo/%2e%2e', 'foo/%252f', 'foo/colon:here', 'foo/a\nsecret',
  'foo/a\u0000secret', 'foo/a@{b', 'foo/*', 'foo/é', 'a'.repeat(201)];
invalidPaths.forEach((path, index) => test(`rejects unsafe path ${index} consistently with popup`, () => {
  const result = run([entry(undefined, path)]);
  assert.ok(['invalid_input', 'invalid_entries'].includes(result.selectionState));
  assert.equal(result.outcome, 'BLOCKED');
  assert.ok(validateUtilities([entry(undefined, path)])[0].path);
}));

test('intentional strict differences: no trimming, plus parent/child overlap', () => {
  for (const row of [entry(' https://github.com/fixture-org/fixture-repo '), entry(undefined, ' addons/util ')]) {
    assert.deepEqual(validateUtilities([row]), [{ url: '', path: '' }]);
    assert.equal(run([row]).selectionState, 'invalid_entries');
  }
  const rows = [entry(undefined, 'addons'), entry('git@github.com:fixture-org/other', 'addons/child')];
  assert.deepEqual(validateUtilities(rows), [{ url: '', path: '' }, { url: '', path: '' }]);
  assert.equal(run(rows).selectionState, 'conflicts');
});

test('safe path punctuation and case preserve popup acceptance', () => {
  for (const path of ['a', '_addons/util-v2.1', 'Addons/utility_2', 'foo/a..b', 'foo/com10', 'a'.repeat(200)]) {
    const row = entry(undefined, path);
    assert.deepEqual(validateUtilities([row]), [{ url: '', path: '' }]);
    assert.equal(run([row]).selectionState, 'valid');
  }
});

for (const value of [null, true, 42, '', {}, [], { url: 'x', path: 'y', approvalGranted: true },
  { url: 42, path: 'safe' }, { url: 'x', path: null }]) {
  test(`malformed row ${JSON.stringify(value)} is sanitized and never drops valid neighbors`, () => {
    const result = run([entry(), value]);
    assert.equal(result.selectionState, 'invalid_entries');
    assert.equal(result.outcome, 'BLOCKED');
    assert.equal(result.entries[0].state, 'valid');
    assert.equal(result.entries[1].state, 'invalid');
    assert.ok(result.entries[1].reasons.length);
  });
}

test('invalid rows do not hide conflicts between individually valid fields', () => {
  const result = run([entry(undefined, '../bad'), entry(undefined, 'safe'),
    entry('bad-url', 'safe')]);
  assert.equal(result.selectionState, 'invalid_entries');
  assert.deepEqual(result.conflicts, [
    { indexes: [0, 1], reasons: ['duplicate_repository'] },
    { indexes: [1, 2], reasons: ['path_collision'] },
  ]);
  assert.equal(result.entries[0].state, 'invalid');
  assert.equal(result.entries[1].state, 'conflict');
});

for (const text of ['', 'null', '{}', 'true', '[', '[1,]', '[ ]', ' []', '[]\n',
  '[{"url":"bad","url":"https://github.com/org/repo","path":"safe"}]',
  '[{"url":"https://github.com/org/repo","path":"\\u0073afe"}]']) {
  test(`rejects malformed or noncanonical fixture ${text.slice(0, 45)}`, () => {
    const result = plan(text);
    assert.equal(result.selectionState, 'invalid_input');
    assert.equal(result.outcome, 'BLOCKED');
    assert.deepEqual(result.entries, []);
  });
}

test('deeply nested canonical JSON is an invalid entry without recursive row traversal', () => {
  const result = plan('['.repeat(4096) + ']'.repeat(4096));
  assert.equal(result.selectionState, 'invalid_entries');
  assert.equal(result.outcome, 'BLOCKED');
  assert.deepEqual(result.entries, [{ index: 0, state: 'invalid', reasons: ['invalid_entry'] }]);
});

test('primitive text boundary does not invoke hostile hooks, getters or revoked proxies', () => {
  let calls = 0;
  const hostile = new Proxy({}, { get() { calls++; throw Error('SECRET'); },
    ownKeys() { calls++; throw Error('SECRET'); }, getPrototypeOf() { calls++; throw Error('SECRET'); } });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const value of [undefined, null, 0, 1n, Symbol('SECRET'), () => {}, [], hostile, revoked.proxy,
    new String('[]'), { toString() { calls++; throw Error('SECRET'); } }]) {
    assert.equal(plan(value).selectionState, 'invalid_input');
  }
  assert.equal(calls, 0);
});

test('bounded collection and field lengths reject over-limit input without truncation', () => {
  const rows = Array.from({ length: 16 }, (_, index) => entry(`https://github.com/fixture-org/repo-${index}`, `addons/util-${index}`));
  assert.equal(run(rows).entries.length, 16);
  assert.equal(run(rows).selectionState, 'valid');
  assert.equal(run([...rows, entry()]).selectionState, 'invalid_input');
  assert.equal(run([entry('x'.repeat(201))]).selectionState, 'invalid_entries');
  assert.equal(run([entry(undefined, 'a'.repeat(200))]).selectionState, 'valid');
  assert.equal(run([entry(undefined, 'a'.repeat(201))]).selectionState, 'invalid_entries');
  // At the envelope limit, invalid row data is reported; above it parsing is refused.
  for (const length of [8191, 8192, 8193]) {
    const text = '["' + 'x'.repeat(length - 4) + '"]';
    assert.equal(text.length, length);
    assert.equal(plan(text).selectionState, length > 8192 ? 'invalid_input' : 'invalid_entries');
  }
});

function frozenTree(value) {
  if (value === null || typeof value !== 'object') return;
  assert.ok(Object.isFrozen(value));
  Object.values(value).forEach(frozenTree);
}

test('all outcomes deny authority, retain unknown facts, are deterministic, private and deeply immutable', () => {
  const inputs = ['bad SECRET', '[]', JSON.stringify([entry()]), JSON.stringify([entry(), entry()]),
    JSON.stringify([entry('https://user:SECRET@github.com/org/repo', 'private-path')]),
    JSON.stringify(Array.from({ length: 16 }, () => entry()))];
  for (const text of inputs) {
    const result = plan(text);
    assert.equal(result.evidenceTier, 'SIMULATED');
    assert.equal(result.fixtureOnly, true);
    for (const key of ['accountVerified', 'permissionsVerified', 'executionAuthorized',
      'approvalGranted', 'trustedContinuingContext', 'effectsEnabled', 'repositoryMutationAuthorized', 'moduleInstalled']) {
      assert.equal(result[key], false, key);
    }
    assert.deepEqual(result.reviewRequired, ['repository_identity', 'permissions', 'revision', 'paths']);
    assert.equal(result.nextStep, 'manual');
    assert.deepEqual(result.repositoryFacts, {
      existence: 'unknown', visibility: 'unknown', ownership: 'unknown', access: 'unknown',
      revision: 'unknown', branchAvailability: 'unknown',
    });
    assert.equal(result.commitSha, null);
    assert.equal(result.gitlinks, null);
    assert.equal(result.gitmodules, null);
    assert.deepEqual(plan(text), result);
    frozenTree(result);
    assert.throws(() => { result.entries.push({}); }, TypeError);
    const serialized = JSON.stringify(result);
    assert.ok(serialized.length <= 16384);
    assert.match(serialized, /^[\x20-\x7e]*$/);
    assert.doesNotMatch(serialized, /SECRET|fixture-org|fixture-repo|github\.com|addons\/utility|private-path|user:/);
    assert.deepEqual(plan(text, { approvalGranted: true, commitSha: 'a'.repeat(40) }), result);
  }
  assert.equal(run(Array.from({ length: 16 }, () => entry())).conflicts.length, 120);
});

test('extra fields and prototype keys cannot smuggle identity, revisions or authority into output', () => {
  for (const key of ['__proto__', 'constructor', 'revision', 'commitSha', 'branch', 'private', 'authorized']) {
    const text = `[{"url":"https://github.com/org/repo","path":"safe","${key}":"SECRET"}]`;
    const result = plan(text);
    assert.equal(result.selectionState, 'invalid_entries');
    assert.doesNotMatch(JSON.stringify(result), /SECRET|github\.com/);
  }
});

test('planner only imports the pure popup validator and has no runtime callers or external capabilities', async () => {
  const source = readFileSync(new URL('../src/github/utilities-plan.mjs', import.meta.url), 'utf8');
  assert.deepEqual([...source.matchAll(/^import .* from ['"](.+)['"];$/gm)].map(match => match[1]), ['../popup/validation.mjs']);
  assert.doesNotMatch(source, /\b(?:require|fetch|XMLHttpRequest|WebSocket|chrome|browser|localStorage|sessionStorage|indexedDB|process|eval|Function)\s*(?:[.(]|\{|'|"|\*)/);
  assert.doesNotMatch(source, /\bimport\s*\(|\bexport\s+.*\bfrom\s|node:|child_process/);
  for (const file of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true })) {
    if (file.isFile() && /\.(mjs|js|html)$/.test(file.name) && file.name !== 'utilities-plan.mjs') {
      assert.doesNotMatch(readFileSync(`${file.parentPath}/${file.name}`, 'utf8'), /utilities-plan|planFixtureUtilities/);
    }
  }
  const keys = ['fetch', 'chrome', 'browser', 'localStorage', 'sessionStorage', 'indexedDB'];
  const descriptors = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  let accesses = 0;
  try {
    for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true,
      get() { accesses++; throw Error('SECRET'); } });
    const isolated = await import('../src/github/utilities-plan.mjs?isolated');
    assert.equal(isolated.planFixtureUtilities(JSON.stringify([entry()])).selectionState, 'valid');
    assert.equal(isolated.planFixtureUtilities('bad').selectionState, 'invalid_input');
    assert.equal(accesses, 0);
  } finally {
    keys.forEach((key, index) => descriptors[index] ? Object.defineProperty(globalThis, key, descriptors[index]) : delete globalThis[key]);
  }
});
