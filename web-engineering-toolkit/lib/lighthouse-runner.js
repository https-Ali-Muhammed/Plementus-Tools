import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { slugify, urlsMatch } from './utils.js';

function languagePrefix(code) {
  return String(code || 'en').split(/[_-]/)[0].toLowerCase();
}

export function buildLanguagePath(logicalPath, targetLanguage, defaultLanguage) {
  const raw = String(logicalPath || '/').trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  const target = languagePrefix(targetLanguage);
  const fallback = languagePrefix(defaultLanguage);
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  if (target === fallback) return normalized;
  if (normalized === '/') return `/${target}`;
  return `/${target}${normalized}`;
}

function lighthouseBin() {
  const ext = process.platform === 'win32' ? '.cmd' : '';
  return path.join(process.cwd(), 'node_modules', '.bin', `lighthouse${ext}`);
}

export async function runSingleLighthouse({ config, port, root, device, logicalPath, iteration, signal, onLog }) {
  const testedPath = buildLanguagePath(logicalPath, config.targetLanguage, config.defaultLanguage);
  const url = new URL(testedPath, config.baseUrl).href;
  const language = languagePrefix(config.targetLanguage);
  const cleanPath = logicalPath === '/' ? 'home' : logicalPath.replace(/^\/+|\/+$/g, '').replace(/\//g, '_');
  const slug = `${language}_${slugify(cleanPath, 'home')}`;
  const outbase = path.join(root, device, `${slug}_run${iteration}`);
  const logFile = path.join(root, 'logs', device, `${slug}_run${iteration}.log`);
  const jsonFile = `${outbase}.report.json`;
  const htmlFile = `${outbase}.report.html`;

  const categories = Array.isArray(config.categories) && config.categories.length
    ? config.categories
    : ['performance', 'accessibility', 'best-practices', 'seo'];
  const args = [
    url,
    `--port=${port}`,
    `--only-categories=${categories.join(',')}`,
    '--output=html',
    '--output=json',
    `--output-path=${outbase}`,
    '--log-level=info'
  ];
  if (device === 'desktop') args.push('--preset=desktop');
  if (config.mode === 'session') args.push('--disable-storage-reset');

  const bin = lighthouseBin();
  if (!fs.existsSync(bin)) throw new Error('Local Lighthouse CLI is missing. Run npm install first.');

  return new Promise((resolve) => {
    const logStream = fs.createWriteStream(logFile);
    const child = spawn(bin, args, { cwd: process.cwd(), shell: process.platform === 'win32' });

    const abort = () => {
      child.kill('SIGTERM');
    };
    signal?.addEventListener('abort', abort, { once: true });

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      logStream.write(text);
      onLog?.(text.trimEnd());
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      logStream.write(text);
      onLog?.(text.trimEnd());
    });

    child.once('exit', (code) => {
      signal?.removeEventListener('abort', abort);
      logStream.end();
      if (signal?.aborted) {
        resolve({ device, language, path: logicalPath, testedPath, iteration, status: 'cancelled', requestedUrl: url, finalUrl: '', jsonFile: '', htmlFile: '' });
        return;
      }
      if (code !== 0 || !fs.existsSync(jsonFile)) {
        resolve({ device, language, path: logicalPath, testedPath, iteration, status: 'failed', requestedUrl: url, finalUrl: '', jsonFile: fs.existsSync(jsonFile) ? jsonFile : '', htmlFile: fs.existsSync(htmlFile) ? htmlFile : '' });
        return;
      }

      try {
        const report = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        const requestedUrl = report.requestedUrl || url;
        const finalUrl = report.finalDisplayedUrl || report.finalUrl || '';
        const status = requestedUrl && finalUrl && urlsMatch(requestedUrl, finalUrl) ? 'valid' : 'redirected';
        resolve({ device, language, path: logicalPath, testedPath, iteration, status, requestedUrl, finalUrl, jsonFile, htmlFile });
      } catch {
        resolve({ device, language, path: logicalPath, testedPath, iteration, status: 'failed', requestedUrl: url, finalUrl: '', jsonFile, htmlFile });
      }
    });
  });
}
