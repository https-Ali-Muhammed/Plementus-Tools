import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();
const archive = path.join(root, 'dist', 'web-engineering-toolkit-source.zip');

function packageSource() {
  const result = spawnSync(process.execPath, ['scripts/package-source.js'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const buffer = fs.readFileSync(archive);
  return { hash: crypto.createHash('sha256').update(buffer).digest('hex'), bytes: buffer.length };
}

test('source package is deterministic, complete, and excludes runtime state', () => {
  const first = packageSource();
  const second = packageSource();
  assert.deepEqual(second, first);
  const listing = spawnSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
  assert.equal(listing.status, 0, listing.stderr);
  const entries = listing.stdout.trim().split(/\r?\n/);
  for (const required of ['README.md', 'package.json', 'package-lock.json', 'lib/security-scanner.js', 'lib/security-collection-model.js', 'docs/PHASE3_EVIDENCE_COLLECTION_AUDIT.md', 'docs/PHASE3_IMPLEMENTATION.md', 'test/phase1-core.test.js', 'test/phase3-evidence-collection.test.js', 'test/phase3-browser-collection.test.js', 'scripts/package-source.js', 'scripts/smoke-all-tools.js', 'scripts/validate-phase3.js']) {
    assert.ok(entries.includes(`web-engineering-toolkit/${required}`), `missing ${required}`);
  }
  const forbidden = /(?:^|\/)(?:node_modules|reports|data|profiles\/security-scanner|dist|revisions|audit|screenshots?|tmp)(?:\/|$)|\.pdf$/i;
  assert.equal(entries.some((entry) => forbidden.test(entry)), false, entries.filter((entry) => forbidden.test(entry)).join('\n'));
});
