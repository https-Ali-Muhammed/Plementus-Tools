import assert from 'node:assert/strict';
import test from 'node:test';
import { planFixtureUtilities } from '../src/github/utilities-plan.mjs';
import { validateFixtureSubmoduleStructure } from '../src/github/submodule-structure.mjs';

const url = 'https://github.com/fixture-vault/private-utility.git';
const path = 'private-addons/utility';
const oid = 'cafe'.repeat(10);
const selection = (remote = url, checkout = path) => ({ url: remote, path: checkout });
const treeEntry = (checkout = path, mode = '160000') => ({ path: checkout, mode, oid });
const modulesEntry = () => treeEntry('.gitmodules', '100644');
const section = (row = selection(), name = 'private-name') =>
  `[submodule "${name}"]\npath = ${row.path}\nurl = ${row.url}\n`;
const metadata = (gitmodulesText = section(), tree = [modulesEntry(), treeEntry()]) =>
  ({ gitmodulesText, tree });
const validSelection = ['valid', 'MANUAL_REVIEW'];
const conflictSelection = ['conflicts', 'MANUAL_REVIEW'];
const invalidSelection = ['invalid_entries', 'BLOCKED'];
const matchedStructure = ['matched', 'MANUAL_REVIEW'];
const reviewStructure = ['review_required', 'MANUAL_REVIEW'];
const blockedStructure = ['invalid', 'BLOCKED'];

// Call both public APIs on fixture data; never derive a combined authority decision.
function check(rows, structure, expectedSelection, expectedStructure, reasons) {
  const selectionText = JSON.stringify(rows);
  const structureText = JSON.stringify(structure);
  const plan = planFixtureUtilities(selectionText);
  const validation = validateFixtureSubmoduleStructure(structureText);
  assert.deepEqual([plan.selectionState, plan.outcome], expectedSelection);
  assert.deepEqual([validation.structureState, validation.outcome], expectedStructure);
  assert.deepEqual(validation.reasons, reasons);
  assert.deepEqual(planFixtureUtilities(selectionText), plan);
  assert.deepEqual(validateFixtureSubmoduleStructure(structureText), validation);
  for (const result of [plan, validation]) {
    assert.equal(result.fixtureOnly, true);
    assert.equal(result.evidenceTier, 'SIMULATED');
    assert.equal(result.nextStep, 'manual');
    for (const flag of ['accountVerified', 'permissionsVerified', 'approvalGranted',
      'executionAuthorized', 'repositoryMutationAuthorized', 'effectsEnabled',
      'moduleInstalled', 'trustedContinuingContext']) assert.equal(result[flag], false, flag);
    assert.ok(Object.isFrozen(result));
    assert.doesNotMatch(JSON.stringify(result),
      /github\.com|fixture-vault|private-utility|private-addons|private-name|cafe|SECRET|outside-private/);
  }
  assert.equal(validation.realTreeVerified, false);
  assert.equal(validation.commitReachabilityVerified, false);
  assert.deepEqual(plan.repositoryFacts, {
    existence: 'unknown', visibility: 'unknown', ownership: 'unknown', access: 'unknown',
    revision: 'unknown', branchAvailability: 'unknown',
  });
  assert.deepEqual(plan.reviewRequired, ['repository_identity', 'permissions', 'revision', 'paths']);
  for (const key of ['commitSha', 'gitlinks', 'gitmodules']) assert.equal(plan[key], null);
  return { plan, validation };
}

test('valid selection and matching Gitlink remain independent unverified manual results', () => {
  const { plan, validation } = check([selection()], metadata(), validSelection,
    matchedStructure, ['synthetic_match_unverified']);
  assert.deepEqual(plan.entries, [{ index: 0, state: 'valid', reasons: [] }]);
  assert.deepEqual(plan.conflicts, []);
  assert.deepEqual(validation.counts, { sections: 1, treeEntries: 2, gitlinks: 1, matched: 1 });
});

for (const remote of ['git@github.com:FIXTURE-VAULT/PRIVATE-UTILITY',
  'ssh://git@github.com/fixture-vault/private-utility.git']) {
  test(`duplicate HTTPS/SSH identity requires manual selection review despite matching structure: ${remote.split(':')[0]}`, () => {
    const rows = [selection(), selection(remote, 'private-addons/second')];
    const { plan, validation } = check(rows,
      metadata(section(rows[0]) + section(rows[1], 'second'),
        [modulesEntry(), treeEntry(), treeEntry(rows[1].path)]),
      conflictSelection, matchedStructure, ['synthetic_match_unverified']);
    assert.deepEqual(plan.conflicts, [{ indexes: [0, 1], reasons: ['duplicate_repository'] }]);
    assert.equal(validation.counts.matched, 2);
  });
}

for (const [checkout, conflict, reasons] of [
  [path, 'path_collision', ['duplicate_path', 'duplicate_tree_entry']],
  [`${path}/child`, 'path_overlap', ['path_overlap', 'path_type_conflict', 'tree_path_conflict']],
  ['private-addons', 'path_overlap', ['path_overlap', 'path_type_conflict', 'tree_path_conflict']],
]) {
  test(`selection ${conflict} stays manual while declared tree conflict blocks: ${checkout}`, () => {
    const rows = [selection(), selection('https://github.com/fixture-vault/other', checkout)];
    const { plan } = check(rows,
      metadata(section(rows[0]) + section(rows[1], 'second'),
        [modulesEntry(), treeEntry(), treeEntry(checkout)]),
      conflictSelection, blockedStructure, reasons);
    assert.deepEqual(plan.conflicts, [{ indexes: [0, 1], reasons: [conflict] }]);
  });
}

test('component prefix without a slash is neither a selection overlap nor a tree conflict', () => {
  const rows = [selection(), selection('https://github.com/fixture-vault/other', `${path}-extra`)];
  const { plan, validation } = check(rows,
    metadata(section(rows[0]) + section(rows[1], 'second'),
      [modulesEntry(), treeEntry(), treeEntry(rows[1].path)]),
    validSelection, matchedStructure, ['synthetic_match_unverified']);
  assert.deepEqual(plan.conflicts, []);
  assert.equal(validation.counts.matched, 2);
});

for (const [checkout, reason] of [
  [path.toUpperCase(), 'path_collision'], ['PRIVATE-ADDONS', 'path_overlap'],
]) {
  test(`case-insensitive selection ${reason} and case-ambiguous tree both require manual review`, () => {
    const rows = [selection(), selection('https://github.com/fixture-vault/other', checkout)];
    const { plan, validation } = check(rows,
      metadata(section(rows[0]) + section(rows[1], 'second'),
        [modulesEntry(), treeEntry(), treeEntry(checkout)]),
      conflictSelection, reviewStructure, ['case_ambiguity']);
    assert.deepEqual(plan.conflicts, [{ indexes: [0, 1], reasons: [reason] }]);
    assert.equal(validation.counts.matched, 2);
  });
}

test('case alias cannot substitute for the literal declared Gitlink', () => {
  check([selection()], metadata(section(), [modulesEntry(), treeEntry(path.toUpperCase())]),
    validSelection, blockedStructure, ['case_ambiguity', 'missing_gitlink', 'orphan_gitlink']);
});

test('valid selection does not excuse a declaration without a Gitlink', () => {
  const { validation } = check([selection()], metadata(section(), [modulesEntry()]),
    validSelection, blockedStructure, ['missing_gitlink']);
  assert.equal(validation.counts.matched, 0);
});

test('empty selection does not excuse an orphan Gitlink', () => {
  check([], metadata(null, [treeEntry()]), ['empty_optional', 'NO_ACTION'],
    blockedStructure, ['orphan_gitlink']);
});

for (const mode of ['100644', '100755', '120000', '040000']) {
  test(`selected checkout represented as ${mode} blocks structure without changing selection validity`, () => {
    check([selection()], metadata(section(), [modulesEntry(), treeEntry(path, mode)]),
      validSelection, blockedStructure, ['path_type_conflict']);
  });
}

test('conflicting modes for one tree path retain both duplicate and type diagnostics', () => {
  check([selection()], metadata(section(), [modulesEntry(), treeEntry(), treeEntry(path, '100644')]),
    validSelection, blockedStructure, ['duplicate_tree_entry', 'path_type_conflict']);
});

test('missing gitmodules content is unknown, not an absent declaration', () => {
  const { validation } = check([selection()], { tree: [modulesEntry(), treeEntry()] },
    validSelection, reviewStructure, ['missing_gitmodules_text']);
  assert.equal(validation.counts.matched, 0);
});

for (const [text, reasons] of [
  [`[submodule "private-name"]\nurl = ${url}\n`, ['missing_path', 'orphan_gitlink']],
  [`[submodule "private-name"]\npath = ${path}\n`, ['missing_url']],
]) {
  test(`incomplete declaration blocks independently of a valid selection: ${reasons[0]}`, () => {
    check([selection()], metadata(text), validSelection, blockedStructure, reasons);
  });
}

test('absent gitmodules file with a supplied file entry remains a presence conflict', () => {
  check([selection()], metadata(null), validSelection, blockedStructure,
    ['gitmodules_presence_conflict', 'orphan_gitlink']);
});

for (const tree of [undefined, null]) {
  test(`missing tree metadata (${tree}) cannot establish missing Gitlinks`, () => {
    const { validation } = check([selection()], { gitmodulesText: section(), tree },
      validSelection, reviewStructure, ['missing_tree_metadata']);
    assert.equal(validation.counts.matched, 0);
  });
}

test('explicitly empty tree differs from unknown tree metadata', () => {
  check([selection()], metadata(section(), []), validSelection, blockedStructure,
    ['gitmodules_presence_conflict', 'missing_gitlink']);
});

for (const key of ['mode', 'oid']) {
  test(`missing Gitlink ${key} remains manual and cannot count as a match`, () => {
    const row = treeEntry(); delete row[key];
    const { validation } = check([selection()], metadata(section(), [modulesEntry(), row]),
      validSelection, reviewStructure, ['missing_tree_metadata']);
    assert.equal(validation.counts.matched, 0);
  });
}

for (const text of [section() + 'branch = main\n',
  section().replace(`path = ${path}`, `path = "${path}"`)]) {
  test(`unsupported configuration stops correlation and retains manual fallback: ${text.includes('branch') ? 'optional key' : 'quoted path'}`, () => {
    const { validation } = check([selection()], metadata(text),
      validSelection, reviewStructure, ['unsupported_syntax']);
    assert.equal(validation.counts.matched, 0);
  });
}

test('relative URL blocks selection but requires manual structure review without URL resolution', () => {
  const row = selection('../outside-private.git');
  const { plan, validation } = check([row], metadata(section(row)),
    invalidSelection, reviewStructure, ['relative_url']);
  assert.deepEqual(plan.entries, [{ index: 0, state: 'invalid', reasons: ['invalid_url'] }]);
  assert.equal(validation.counts.matched, 1);
});

test('independently invalid tree metadata takes precedence over unsupported syntax', () => {
  check([selection()], metadata(section() + 'branch = main\n',
    [treeEntry('.gitmodules', '120000'), treeEntry()]),
  validSelection, blockedStructure, ['gitmodules_symlink', 'unsupported_syntax']);
});

test('invalid selection retains a valid neighbor and cannot inherit authority from matching metadata', () => {
  const { plan } = check([selection(), selection('https://SECRET@github.com/fixture-vault/other',
    'private-addons/other')], metadata(), invalidSelection, matchedStructure, ['synthetic_match_unverified']);
  assert.deepEqual(plan.entries, [
    { index: 0, state: 'valid', reasons: [] },
    { index: 1, state: 'invalid', reasons: ['invalid_url'] },
  ]);
});

test('invalid selection takes precedence without losing duplicate and path conflict diagnostics', () => {
  const { plan } = check([selection(url, '../outside-private'), selection(), selection('bad-SECRET', path)],
    metadata(), invalidSelection, matchedStructure, ['synthetic_match_unverified']);
  assert.deepEqual(plan.conflicts, [
    { indexes: [0, 1], reasons: ['duplicate_repository'] },
    { indexes: [1, 2], reasons: ['path_collision'] },
  ]);
  assert.deepEqual(plan.entries.map(row => row.state), ['invalid', 'conflict', 'invalid']);
});

for (const fixture of [metadata(null, []), metadata('', [modulesEntry()])]) {
  test(`completely empty optional utilities need no action with ${fixture.gitmodulesText === null ? 'absent' : 'empty'} gitmodules`, () => {
    const { plan, validation } = check([], fixture, ['empty_optional', 'NO_ACTION'],
      ['empty', 'NO_ACTION'], ['empty_structure']);
    assert.deepEqual(plan.entries, []);
    assert.deepEqual(plan.conflicts, []);
    assert.equal(validation.counts.gitlinks, 0);
    assert.equal(validation.counts.matched, 0);
  });
}

test('empty optional selection cannot turn unknown structure into no action', () => {
  check([], {}, ['empty_optional', 'NO_ACTION'], reviewStructure,
    ['missing_gitmodules_text', 'missing_tree_metadata']);
});

test('invalid input envelopes remain independently blocked without an executable result', () => {
  check(null, null, ['invalid_input', 'BLOCKED'], blockedStructure, ['invalid_input']);
});

test('private identifiers and tree order do not influence sanitized matching summaries', () => {
  const first = check([selection()], metadata(), validSelection, matchedStructure, ['synthetic_match_unverified']);
  const row = selection('ssh://git@github.com/other-vault/other-private', 'elsewhere-private/checkout');
  const fixture = metadata(section(row, 'another-private-name'), [
    { path: row.path, mode: '160000', oid: 'dead'.repeat(10) },
    { path: '.gitmodules', mode: '100644', oid: 'beef'.repeat(10) },
  ]);
  const second = check([row], fixture, validSelection, matchedStructure, ['synthetic_match_unverified']);
  assert.deepEqual(second, first);
  assert.deepEqual(check([row], { ...fixture, tree: fixture.tree.toReversed() },
    validSelection, matchedStructure, ['synthetic_match_unverified']), first);
  assert.doesNotMatch(JSON.stringify(second), /other-vault|other-private|elsewhere-private|another-private-name|dead|beef/);
});
