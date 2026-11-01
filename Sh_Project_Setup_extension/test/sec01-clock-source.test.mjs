import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyBracket, classifyPair, elapsedLowerBound } from './sec01-clock-source-browser.mjs';

test('bracket boundaries, missing values and invalid ordering', () => {
  assert.equal(classifyBracket({ before: 1, wall: 2, after: 2 }).status, 'valid');
  assert.equal(classifyBracket({ before: 1, wall: 2, after: 2.001 }).status, 'wide');
  for (const sample of [{ wall: 2, after: 2 }, { before: 1, after: 2 },
    { before: 2, wall: 2, after: 1 }, { before: NaN, wall: 2, after: 2 },
    { before: 1, wall: 2.5, after: 2 }, { before: -1, wall: 2, after: 0 }]) {
    assert.equal(classifyBracket(sample).status, 'invalid');
  }
});

test('forward allowance equality, excess, rollback and monotonic regression', () => {
  const first = { before: 0, wall: 1000, after: 0 };
  assert.equal(classifyPair(first, { before: 0.9, wall: 1002, after: 0.9 }).status, 'valid');
  assert.equal(classifyPair(first, { before: 0.899, wall: 1002, after: 0.899 }).status, 'forward_excess');
  assert.equal(classifyPair(first, { before: 0, wall: 1001, after: 0 }).status, 'valid');
  assert.equal(classifyPair(first, { before: 0, wall: 1002, after: 0 }).status, 'forward_excess');
  assert.equal(classifyPair(first, { before: 1, wall: 1000, after: 1 }).status, 'valid');
  assert.equal(classifyPair({ before: 2, wall: 1001, after: 2 }, { before: 2, wall: 1000, after: 2 }).status, 'wall_rollback');
  assert.equal(classifyPair({ before: 2, wall: 1000, after: 2 }, { before: 1, wall: 1000, after: 1 }).status, 'monotonic_regression');
  assert.equal(classifyPair(first, { before: 0, wall: 1000 }).status, 'invalid');
});

test('conservative expiry lower bound never borrows forward tolerance', () => {
  const creation = { before: 0, wall: 1000, after: 0.1 };
  const current = before => ({ before, wall: 1000 + 604800000, after: before });
  assert.ok(elapsedLowerBound(creation, current(604800000.19)) < 604800000);
  assert.equal(elapsedLowerBound(creation, current(604800000.2)), 604800000);
  assert.equal(elapsedLowerBound(creation, current(604800000.21)) > 604800000, true);
  assert.equal(elapsedLowerBound(creation, { wall: 1000 }), null);
});
