import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { validateFixtureSubmoduleStructure as validate } from '../src/github/submodule-structure.mjs';

const oid = 'a'.repeat(40);
const url = 'https://github.com/fixture-org/private-repo.git';
const section = (name = 'custom-name', path = 'addons/private-path', remote = url) =>
  `[submodule "${name}"]\n path = ${path}\n url = ${remote}\n`;
const entry = (path = 'addons/private-path', mode = '160000', id = oid) => ({ path, mode, oid: id });
const fixture = (gitmodulesText = section(), tree = [entry('.gitmodules', '100644'), entry()]) => ({ gitmodulesText, tree });
const run = value => validate(JSON.stringify(value));
function expectReason(value, outcome, reason) {
  const result = run(value);
  assert.equal(result.outcome, outcome);
  assert.ok(result.reasons.includes(reason), JSON.stringify(result));
  return result;
}

test('custom subsection name matches checkout path and remains manual, unverified evidence', () => {
  const r = expectReason(fixture(), 'MANUAL_REVIEW', 'synthetic_match_unverified');
  assert.equal(r.structureState, 'matched');
  assert.deepEqual(r.counts, { sections: 1, treeEntries: 2, gitlinks: 1, matched: 1 });
});
for (const text of [null, '', '# comment\n; another comment\n\t\n']) {
  test(`empty optional state ${JSON.stringify(text)}`, () => {
    const tree = text === null ? [] : [entry('.gitmodules', '100644')];
    assert.equal(run(fixture(text, tree)).outcome, 'NO_ACTION');
  });
}
test('ordinary files, directories, symlinks and executable files are not Gitlinks', () => {
  const tree = [entry('README.md', '100644'), entry('script', '100755'), entry('link', '120000'),
    entry('folder', '040000'), entry('folder/file', '100644')];
  assert.equal(run(fixture(null, tree)).outcome, 'NO_ACTION');
});
test('case-insensitive section/key syntax, spaces, CRLF and complete-line comments', () => {
  const text = '\t[SUBMODULE "Different_Name"] \r\n\tPATH\t= addons/private-path\r\n; comment\r\n URL = ' + url + '\r\n';
  assert.equal(run(fixture(text)).structureState, 'matched');
});
for (const [text, reason] of [
  ['[submodule "x"]\nurl = ' + url, 'missing_path'],
  ['[submodule "x"]\npath = safe', 'missing_url'],
  [section() + 'path = another\n', 'duplicate_key'],
  [section() + 'URL = ' + url, 'duplicate_key'],
  [section() + section('custom-name', 'another'), 'duplicate_section'],
  ['[submodule "x"\npath = safe', 'malformed_section'],
  ['[submodule]\npath = safe', 'malformed_section'],
  ['path = safe', 'key_outside_section'],
  ['[submodule "x"]\npath =\nurl = ' + url, 'invalid_path'],
  ['[submodule "x"]\npath = safe\nurl =', 'invalid_url'],
]) test(`blocks ${reason}: ${text.slice(0, 28)}`, () => expectReason(fixture(text), 'BLOCKED', reason));

for (const path of ['/absolute', '../outside', './foo', 'a/../b', 'a//b', 'a/', '.git', '.git/config',
  '.gitmodules', 'foo/.git', 'C:/foo', 'foo/CON', 'foo/a.lock', 'foo/a.', 'foo/%2e', 'a'.repeat(201)]) {
  test(`invalid checkout path ${path.slice(0, 25)}`, () => expectReason(fixture(section('x', path)), 'BLOCKED', 'invalid_path'));
}
for (const [a, b, reason] of [['a', 'a', 'duplicate_path'], ['a', 'a/b', 'path_overlap'],
  ['a/b', 'a', 'path_overlap']]) {
  test(`declared ${reason}: ${a}, ${b}`, () => expectReason(fixture(section('x', a) + section('y', b),
    [entry('.gitmodules', '100644'), entry(a), entry(b)]), 'BLOCKED', reason));
}
test('component boundaries do not overlap; case aliases require manual review', () => {
  const f = fixture(section('x', 'a/b') + section('y', 'a/bc'),
    [entry('.gitmodules', '100644'), entry('a/b'), entry('a/bc')]);
  assert.equal(run(f).structureState, 'matched');
  f.gitmodulesText = section('x', 'A') + section('y', 'a/b');
  f.tree = [entry('.gitmodules', '100644'), entry('A'), entry('a/b')];
  expectReason(f, 'MANUAL_REVIEW', 'case_ambiguity');
});
test('missing and orphan Gitlinks are both detected', () => {
  const r = expectReason(fixture(section(), [entry('.gitmodules', '100644'), entry('unlisted')]), 'BLOCKED', 'missing_gitlink');
  assert.ok(r.reasons.includes('orphan_gitlink'));
});
test('absent gitmodules with Gitlink is an orphan', () => expectReason(fixture(null, [entry()]), 'BLOCKED', 'orphan_gitlink'));
for (const mode of ['100644', '100755', '040000', '120000']) {
  test(`declared path conflicts with ${mode}`, () => expectReason(fixture(section(), [entry('.gitmodules', '100644'), entry(undefined, mode)]), 'BLOCKED', 'path_type_conflict'));
}
for (const mode of ['160001', '40000', '0100644', '100664', 160000, null, '']) {
  test(`invalid tree mode ${mode}`, () => expectReason(fixture(section(), [entry('.gitmodules', '100644'), entry(undefined, mode)]), 'BLOCKED', 'invalid_tree_mode'));
}
test('duplicate tree entries are blocked even when identical', () => expectReason(fixture(section(), [entry('.gitmodules', '100644'), entry(), entry()]), 'BLOCKED', 'duplicate_tree_entry'));
for (const mode of ['120000', '040000', '160000']) {
  test(`unsafe gitmodules representation ${mode}`, () => expectReason(fixture(section(), [entry('.gitmodules', mode), entry()]), 'BLOCKED', mode === '120000' ? 'gitmodules_symlink' : 'gitmodules_type_conflict'));
}
test('executable regular gitmodules is recognized', () => assert.equal(run(fixture(section(), [entry('.gitmodules', '100755'), entry()])).structureState, 'matched'));
for (const [a, b] of [[entry('a'), entry('a/file', '100644')], [entry('a', '120000'), entry('a/file')], [entry('a', '100644'), entry('a/file')]]) {
  test(`non-directory ancestor ${a.mode}`, () => expectReason(fixture(null, [a, b]), 'BLOCKED', 'tree_path_conflict'));
}
test('directory ancestors are permitted for a Gitlink', () => assert.equal(run(fixture(section(), [entry('.gitmodules', '100644'), entry('addons', '040000'), entry()])).structureState, 'matched'));
for (const id of ['a'.repeat(40), 'F'.repeat(64), '0'.repeat(40), '0'.repeat(64)]) {
  test(`recognizes syntactic object ID ${id.length}/${id[0]}`, () => assert.equal(run(fixture(section(), [entry('.gitmodules', '100644', id), entry(undefined, '160000', id)])).structureState, 'matched'));
}
for (const id of ['', 'a'.repeat(39), 'a'.repeat(41), 'a'.repeat(63), 'a'.repeat(65), 'g'.repeat(40), ' a'.repeat(20), null, 42]) {
  test(`invalid object ID ${String(id).slice(0, 12)}/${String(id).length}`, () => expectReason(fixture(section(), [entry('.gitmodules', '100644'), entry(undefined, '160000', id)]), 'BLOCKED', 'invalid_object_id'));
}
test('mixed SHA formats require manual review', () => expectReason(fixture(section(), [entry('.gitmodules', '100644'), entry(undefined, '160000', 'b'.repeat(64))]), 'MANUAL_REVIEW', 'mixed_object_formats'));

for (const text of [
  '[submodule.x]\npath = safe\nurl = ' + url,
  '[include]\npath = other', '[includeIf "gitdir:x"]\npath = other',
  '[submodule "name with spaces"]\npath = safe\nurl = ' + url,
  '[submodule "escaped\\name"]\npath = safe\nurl = ' + url,
  '[submodule "x"] # suffix\npath = safe\nurl = ' + url,
  '[submodule "x"]\npath = "safe"\nurl = ' + url,
  '[submodule "x"]\npath = safe # inline\nurl = ' + url,
  '[submodule "x"]\npath = safe\\\nmore\nurl = ' + url,
  '[submodule "x"]\npath safe\nurl = ' + url,
  '[submodule "x"]\npath = safe name\nurl = ' + url,
  section() + 'branch = main', section() + 'update = !command', section() + 'shallow',
  section() + 'ignore = all', section() + 'fetchRecurseSubmodules = true',
  section('x', 'unicodé'),
]) test(`unsupported configuration ${text.slice(0, 40)}`, () => {
  const r = expectReason(fixture(text), 'MANUAL_REVIEW', 'unsupported_syntax');
  assert.equal(r.counts.matched, 0);
  assert.ok(!r.reasons.includes('orphan_gitlink'));
});
for (const remote of ['../other.git', './other.git', 'git://example.org/repo', '/local/repo',
  'https://example.org/repo', 'https://token@github.com/org/repo', 'https://github.com/org/repo?token=SECRET']) {
  test(`manual URL form ${remote}`, () => expectReason(fixture(section('x', 'addons/private-path', remote)), 'MANUAL_REVIEW', remote.startsWith('.') ? 'relative_url' : 'unsupported_url'));
}
for (const remote of [url, 'git@github.com:fixture-org/private-repo.git', 'ssh://git@github.com/fixture-org/private-repo']) {
  test(`recognized URL syntax ${remote}`, () => assert.equal(run(fixture(section('x', 'addons/private-path', remote))).structureState, 'matched'));
}

test('missing tree metadata is distinct from an explicitly empty tree', () => {
  for (const value of [{ gitmodulesText: section() }, fixture(section(), null)]) {
    const r = expectReason(value, 'MANUAL_REVIEW', 'missing_tree_metadata');
    assert.ok(!r.reasons.includes('missing_gitlink'));
  }
  expectReason(fixture(section(), []), 'BLOCKED', 'missing_gitlink');
  expectReason(fixture(section(), {}), 'BLOCKED', 'invalid_tree_metadata');
});
test('missing entry metadata differs from invalid supplied metadata', () => {
  for (const key of ['mode', 'oid']) {
    const e = entry(); delete e[key];
    expectReason(fixture(section(), [entry('.gitmodules', '100644'), e]), 'MANUAL_REVIEW', 'missing_tree_metadata');
    e[key] = null;
    expectReason(fixture(section(), [entry('.gitmodules', '100644'), e]), 'BLOCKED', key === 'mode' ? 'invalid_tree_mode' : 'invalid_object_id');
  }
});
test('actual content and tree representation cannot substitute for each other', () => {
  expectReason({ tree: [entry('.gitmodules', '100644'), entry()] }, 'MANUAL_REVIEW', 'missing_gitmodules_text');
  expectReason(fixture({ path: '.gitmodules', mode: '100644' }), 'BLOCKED', 'invalid_gitmodules_text');
  expectReason(fixture(null, [entry('.gitmodules', '100644')]), 'BLOCKED', 'gitmodules_presence_conflict');
  expectReason(fixture('', []), 'BLOCKED', 'gitmodules_presence_conflict');
});
for (const e of [null, [], 42, {}, { ...entry(), extra: true }, { ...entry(), path: '../escape' }, { ...entry(), path: '.git/config' }]) {
  test(`invalid tree entry ${JSON.stringify(e).slice(0, 40)}`, () => assert.equal(run(fixture(section(), [e])).outcome, 'BLOCKED'));
}
for (const text of ['', 'null', '[]', 'true', '[', '{} ', '{"tree":[],"tree":[]}', '{"gitmodulesText":"\\u0061","tree":[]}', '{"__proto__":{}}']) {
  test(`invalid envelope ${text}`, () => assert.equal(validate(text).outcome, 'BLOCKED'));
}
test('primitive boundary never invokes arbitrary hooks or proxies', () => {
  let calls = 0;
  const hostile = new Proxy({}, { get() { calls++; throw Error('SECRET'); }, ownKeys() { calls++; throw Error('SECRET'); } });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const value of [undefined, null, 1, 1n, Symbol(), [], hostile, revoked.proxy, new String('{}'), { toString() { calls++; } }]) {
    assert.equal(validate(value).outcome, 'BLOCKED');
  }
  assert.equal(calls, 0);
});
test('bounded text, lines, sections and tree reject overlimits without truncation', () => {
  const rows = Array.from({ length: 16 }, (_, i) => section('name' + i, 'path' + i)).join('');
  const tree = [entry('.gitmodules', '100644'), ...Array.from({ length: 16 }, (_, i) => entry('path' + i))];
  assert.equal(run(fixture(rows, tree)).counts.matched, 16);
  expectReason(fixture(rows + section('extra', 'extra'), tree), 'BLOCKED', 'input_limit');
  assert.equal(run(fixture(null, Array.from({ length: 128 }, (_, i) => entry('file' + i, '100644')))).outcome, 'NO_ACTION');
  expectReason(fixture(null, Array.from({ length: 129 }, (_, i) => entry('file' + i, '100644'))), 'BLOCKED', 'input_limit');
  assert.equal(run(fixture('#' + 'a'.repeat(510), [entry('.gitmodules', '100644')])).outcome, 'NO_ACTION');
  expectReason(fixture('#' + 'a'.repeat(512)), 'BLOCKED', 'input_limit');
  assert.equal(run(fixture('\n'.repeat(255), [entry('.gitmodules', '100644')])).outcome, 'NO_ACTION');
  expectReason(fixture('\n'.repeat(256)), 'BLOCKED', 'input_limit');
  const maxText = Array.from({ length: 16 }, () => '#' + 'x'.repeat(510)).join('\n') + '\n';
  assert.equal(maxText.length, 8192);
  assert.equal(run(fixture(maxText, [entry('.gitmodules', '100644')])).outcome, 'NO_ACTION');
  expectReason(fixture(maxText + '\n'), 'BLOCKED', 'input_limit');
  for (const size of [32768, 32769]) {
    const text = JSON.stringify({ gitmodulesText: 'x'.repeat(size - 21) });
    assert.equal(text.length, size);
    assert.equal(validate(text).outcome, 'BLOCKED');
  }
});
test('control bytes are blocked and non-ASCII syntax requires manual fallback', () => {
  for (const c of ['\0', '\x1b', '\x7f', '\r']) expectReason(fixture(section() + c), 'BLOCKED', 'invalid_gitmodules_text');
  expectReason(fixture(section() + '# unicode é'), 'MANUAL_REVIEW', 'unsupported_syntax');
});
function frozen(value) {
  if (value && typeof value === 'object') { assert.ok(Object.isFrozen(value)); Object.values(value).forEach(frozen); }
}
test('every outcome is private, bounded, deterministic, deeply frozen and denies all authority', () => {
  for (const f of [fixture(), fixture(null, []), fixture(section() + 'branch = SECRET'), fixture(section('SECRET', '../SECRET')), {}, null]) {
    const text = JSON.stringify(f); const r = validate(text);
    assert.deepEqual(validate(text), r); frozen(r);
    assert.equal(r.fixtureOnly, true); assert.equal(r.evidenceTier, 'SIMULATED');
    for (const key of ['accountVerified', 'permissionsVerified', 'approvalGranted', 'executionAuthorized',
      'repositoryMutationAuthorized', 'effectsEnabled', 'moduleInstalled', 'trustedContinuingContext',
      'realTreeVerified', 'commitReachabilityVerified']) assert.equal(r[key], false, key);
    assert.throws(() => r.reasons.push('secret'), TypeError);
    assert.throws(() => { r.counts.matched = 99; }, TypeError);
    assert.ok(JSON.stringify(r).length < 4096);
    assert.doesNotMatch(JSON.stringify(r), /SECRET|github\.com|private-path|private-repo|custom-name|a{40}/);
    assert.deepEqual(validate(text, { executionAuthorized: true }), r);
  }
});
test('isolated source has only pure validation import, no runtime callers or capabilities', async () => {
  const source = readFileSync(new URL('../src/github/submodule-structure.mjs', import.meta.url), 'utf8');
  assert.deepEqual([...source.matchAll(/^import .* from ['"](.+)['"];$/gm)].map(m => m[1]), ['../popup/validation.mjs']);
  assert.doesNotMatch(source, /\b(?:require|fetch|XMLHttpRequest|WebSocket|chrome|browser|localStorage|sessionStorage|indexedDB|process|eval|Function)\s*(?:[.(]|\{|'|"|\*)/);
  assert.doesNotMatch(source, /\bimport\s*\(|\bexport\s+.*\bfrom\s|node:|child_process/);
  for (const file of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true })) {
    if (file.isFile() && /\.(mjs|js|html)$/.test(file.name) && file.name !== 'submodule-structure.mjs') {
      assert.doesNotMatch(readFileSync(`${file.parentPath}/${file.name}`, 'utf8'), /submodule-structure|validateFixtureSubmoduleStructure/);
    }
  }
  const keys = ['fetch', 'chrome', 'browser', 'localStorage', 'sessionStorage', 'indexedDB'];
  const descriptors = keys.map(k => Object.getOwnPropertyDescriptor(globalThis, k)); let calls = 0;
  try {
    keys.forEach(k => Object.defineProperty(globalThis, k, { configurable: true, get() { calls++; throw Error('SECRET'); } }));
    const isolated = await import('../src/github/submodule-structure.mjs?isolated');
    for (const f of [fixture(), fixture(null, []), fixture(section('x', '../bad')), {}]) isolated.validateFixtureSubmoduleStructure(JSON.stringify(f));
    assert.equal(calls, 0);
  } finally {
    keys.forEach((k, i) => descriptors[i] ? Object.defineProperty(globalThis, k, descriptors[i]) : delete globalThis[k]);
  }
});

test('implicit gitmodules directory is a conflicting representation even without an explicit parent', () => {
  expectReason(fixture(null, [entry('.gitmodules/child', '100644')]), 'BLOCKED', 'gitmodules_type_conflict');
});
test('case aliases of gitmodules require manual review even without literal root file', () => {
  expectReason(fixture(null, [entry('.GITMODULES', '100644')]), 'MANUAL_REVIEW', 'case_ambiguity');
});
test('missing ordinary metadata cannot be mistaken for an empty complete structure', () => {
  for (const key of ['mode', 'oid']) {
    const e = entry('ordinary', '100644'); delete e[key];
    expectReason(fixture(null, [e]), 'MANUAL_REVIEW', 'missing_tree_metadata');
  }
});
test('subsection names are case sensitive and do not normalize into paths', () => {
  const f = fixture(section('NAME', 'a') + section('name', 'b'), [entry('.gitmodules', '100644'), entry('a'), entry('b')]);
  assert.equal(run(f).structureState, 'matched');
});
test('invalid metadata still blocks unsupported syntax', () => {
  const f = fixture(section() + 'branch = main', [entry('.gitmodules', '120000'), entry()]);
  const r = expectReason(f, 'BLOCKED', 'gitmodules_symlink');
  assert.ok(r.reasons.includes('unsupported_syntax'));
});
test('blocked malformed required fields take precedence over manual URL fallback', () => {
  const r = expectReason(fixture(section('x', '../bad', '../other.git')), 'BLOCKED', 'invalid_path');
  assert.ok(r.reasons.includes('relative_url'));
});
test('maximum path and name lengths are accepted; overlong URL is blocked', () => {
  const path = 'a'.repeat(200);
  assert.equal(run(fixture(section('n'.repeat(200), path), [entry('.gitmodules', '100644'), entry(path)])).structureState, 'matched');
  expectReason(fixture(section('x', path, 'u'.repeat(201))), 'BLOCKED', 'invalid_url');
  expectReason(fixture(section('n'.repeat(201))), 'MANUAL_REVIEW', 'unsupported_syntax');
});
test('exact line bound is accepted and the whole envelope bound is enforced', () => {
  assert.equal(run(fixture('#' + 'x'.repeat(511), [entry('.gitmodules', '100644')])).outcome, 'NO_ACTION');
  assert.ok(validate(' '.repeat(32769)).reasons.includes('invalid_input'));
  assert.equal(validate('['.repeat(16000) + ']'.repeat(16000)).outcome, 'BLOCKED');
});
test('fixed output is insensitive to private identifiers and tree order', () => {
  const a = fixture(); const b = fixture(section('another', 'other', 'https://github.com/other/repo'),
    [entry('other', '160000', 'b'.repeat(40)), entry('.gitmodules', '100644', 'c'.repeat(40))]);
  assert.deepEqual(run(a), run(b));
  assert.deepEqual(run(a), run({ ...a, tree: a.tree.toReversed() }));
});
test('malicious strings and authority fields cannot execute or leak into output', () => {
  for (const remote of ['!SECRET', 'ext::SECRET', '$(SECRET)', '`SECRET`', 'file:///SECRET']) {
    const r = expectReason(fixture(section('x', 'addons/private-path', remote)), 'MANUAL_REVIEW', 'unsupported_url');
    assert.doesNotMatch(JSON.stringify(r), /SECRET/);
  }
  for (const key of ['__proto__', 'constructor', 'approvalGranted', 'executionAuthorized']) {
    const text = `{"gitmodulesText":null,"tree":[],"${key}":true}`;
    assert.equal(validate(text).outcome, 'BLOCKED');
  }
});
