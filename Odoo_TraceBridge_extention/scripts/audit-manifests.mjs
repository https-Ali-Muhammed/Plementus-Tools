import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

const production = JSON.parse(await readFile('.output/chrome-mv3/manifest.json', 'utf8'));
assert.equal(production.manifest_version, 3);
assert.deepEqual(production.permissions, ['activeTab', 'storage', 'scripting']);
assert.equal(production.background.service_worker, 'background.js');
assert.equal(production.incognito, 'not_allowed');
assert.equal(production.action.default_popup, 'popup.html');
assert.match(production.content_security_policy.extension_pages, /connect-src 'none'/);
for (const key of ['host_permissions', 'optional_permissions', 'optional_host_permissions', 'content_scripts', 'web_accessible_resources', 'externally_connectable']) assert.equal(production[key], undefined, key);

await rm('.output/chrome-mv3-dev/manifest.json', { force: true });
const child = spawn(process.execPath, ['node_modules/wxt/bin/wxt.mjs', '-b', 'chrome', '--host', '127.0.0.1', '--port', '0'], { detached: true, stdio: 'inherit' });
let development;
try {
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null) throw new Error(`WXT exited early: ${child.exitCode}`);
    try { development = JSON.parse(await readFile('.output/chrome-mv3-dev/manifest.json', 'utf8')); break; }
    catch (error) { if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; }
    await setTimeout(200);
  }
  assert.ok(development, 'Development manifest generated within 30 seconds');
  assert.deepEqual([...development.permissions].sort(), ['activeTab', 'scripting', 'storage', 'tabs']);
  assert.deepEqual(development.host_permissions, ['http://localhost/*']);
  assert.ok(development.background.service_worker);
  assert.match(development.content_security_policy.extension_pages, /connect-src 'none'/);
  for (const key of ['optional_permissions', 'optional_host_permissions', 'content_scripts']) assert.equal(development[key], undefined, key);
  console.log(JSON.stringify({ production, development }, null, 2));
} finally {
  if (child.exitCode === null) {
    const exited = new Promise(resolve => child.once('exit', resolve));
    process.kill(-child.pid, 'SIGTERM');
    await Promise.race([exited, setTimeout(3000).then(() => { if (child.exitCode === null && child.signalCode === null) process.kill(-child.pid, 'SIGKILL'); })]);
    await exited;
  }
}
