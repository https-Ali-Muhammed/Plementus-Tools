import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ensureDir, timestamp } from './utils.js';

export async function runSetupFlow({ script, port, flowsDir, timeoutMs = 120000, onLog = () => {} }) {
  if (!script?.trim()) return { skipped: true };
  ensureDir(flowsDir);
  const runId = `flow_${timestamp()}_${Math.random().toString(36).slice(2, 7)}`;
  const scriptPath = path.join(flowsDir, `${runId}.txt`);
  fs.writeFileSync(scriptPath, script, 'utf8');
  const worker = path.join(process.cwd(), 'lib', 'flow-worker.js');

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [worker, String(port), scriptPath], {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Setup flow timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      onLog(text.trimEnd());
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      onLog(text.trimEnd());
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      try { fs.unlinkSync(scriptPath); } catch {}
      if (code === 0) resolve({ skipped: false, stdout });
      else reject(new Error(stderr.trim() || `Setup flow exited with code ${code}.`));
    });
  });
}
