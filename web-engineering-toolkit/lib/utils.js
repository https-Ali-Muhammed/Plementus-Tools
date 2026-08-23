import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';

export function slugify(value, fallback = 'project') {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

export function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function normalizeUrl(url) {
  const parsed = new URL(url);
  const pathname = decodeURIComponent(parsed.pathname || '/').replace(/\/$/, '') || '/';
  return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${pathname}`;
}

export function urlsMatch(a, b) {
  try {
    return normalizeUrl(a) === normalizeUrl(b);
  } catch {
    return false;
  }
}

export function median(values) {
  const clean = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!clean.length) return '';
  const mid = Math.floor(clean.length / 2);
  const value = clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
  return Math.round(value * 100) / 100;
}

export function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function findFreePort(preferred = 9222) {
  const available = (port) => new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ host: '127.0.0.1', port }, () => server.close(() => resolve(true)));
  });

  if (await available(preferred)) return preferred;
  for (let port = preferred + 1; port < preferred + 100; port += 1) {
    if (await available(port)) return port;
  }
  throw new Error('No free remote debugging port found.');
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
