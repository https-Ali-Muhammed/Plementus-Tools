import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageName = 'web-engineering-toolkit';
const outputDir = path.join(root, 'dist');
const outputFile = path.join(outputDir, `${packageName}-source.zip`);
const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'web-toolkit-package-'));
const stagingPackage = path.join(stagingRoot, packageName);
const fixedTime = new Date('1980-01-01T00:00:00.000Z');
const sourceRoots = ['flows', 'lib', 'public', 'test', 'docs', 'scripts'];
const sourceFiles = ['package.json', 'package-lock.json', 'README.md', 'server.js', '.gitignore'];

function collect(directory, relative = '') {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
    const childRelative = path.join(relative, entry.name);
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collect(child, childRelative));
    else if (entry.isFile()) files.push(childRelative);
  }
  return files;
}

try {
  fs.mkdirSync(stagingPackage, { recursive: true });
  const selected = [
    ...sourceFiles.filter((file) => fs.existsSync(path.join(root, file))),
    ...sourceRoots.flatMap((directory) => collect(path.join(root, directory), directory)),
    ...(fs.existsSync(path.join(root, 'profiles', '.gitkeep')) ? ['profiles/.gitkeep'] : [])
  ].sort();
  for (const relative of selected) {
    const destination = path.join(stagingPackage, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, relative), destination);
    fs.utimesSync(destination, fixedTime, fixedTime);
  }
  for (const directory of [...new Set(selected.map((relative) => path.dirname(relative)))].sort().reverse()) {
    const target = path.join(stagingPackage, directory);
    if (fs.existsSync(target)) fs.utimesSync(target, fixedTime, fixedTime);
  }
  fs.utimesSync(stagingPackage, fixedTime, fixedTime);
  fs.mkdirSync(outputDir, { recursive: true });
  try { fs.unlinkSync(outputFile); } catch {}
  const archiveEntries = collect(stagingPackage).map((relative) => path.join(packageName, relative));
  const result = spawnSync('zip', ['-X', '-q', outputFile, ...archiveEntries], { cwd: stagingRoot, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `zip exited with status ${result.status}`);
  console.log(`${outputFile}\n${archiveEntries.length} source files packaged`);
} finally {
  fs.rmSync(stagingRoot, { recursive: true, force: true });
}
