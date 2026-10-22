import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('.artifacts', { recursive: true });
const commands = [
  ['build', ['npm', 'run', 'build']],
  ['typecheck', ['npm', 'run', 'typecheck']],
  ['lint', ['npm', 'run', 'lint']],
  ['unit', ['npm', 'test', '--', '--reporter=default', '--reporter=json', '--outputFile=.artifacts/unit.json']],
  ['manifests', [process.execPath, 'scripts/audit-manifests.mjs']],
  ['e2e', ['npx', '--no-install', 'playwright', 'test']],
  ['diff', ['git', 'diff', '--check']],
];
const results = [];
for (const [name, [command, ...args]] of commands) {
  let log = '';
  const code = await new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { log += data; process.stdout.write(data); });
    child.on('error', reject); child.on('exit', code => resolve(code));
  });
  await writeFile(`.artifacts/${name}.log`, log);
  const skipped = name === 'e2e' && code === 0 ? JSON.parse(await readFile('.artifacts/e2e.json', 'utf8')).stats.skipped : 0;
  results.push({ name, command: [command, ...args], exitCode: code, result: code !== 0 ? 'FAIL' : skipped ? 'BLOCKED' : 'PASS' });
}
await writeFile('.artifacts/verification.json', JSON.stringify({ node: process.version, date: new Date().toISOString(), results }, null, 2));
if (results.some(result => result.result !== 'PASS')) process.exitCode = 1;
