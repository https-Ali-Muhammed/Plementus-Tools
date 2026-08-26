import { spawnSync } from 'node:child_process';

const taxonomy = process.argv[2];
if (!['core', 'browser'].includes(taxonomy)) {
  console.error('Usage: node scripts/run-security-test-taxonomy.js <core|browser>');
  process.exitCode = 2;
} else {
  const result = spawnSync(process.execPath, ['--test', 'test/security-scanner.test.js'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, WET_TEST_TAXONOMY: taxonomy }
  });
  if (result.error) {
    console.error(result.error.message);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
