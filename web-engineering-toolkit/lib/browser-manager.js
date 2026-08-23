import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { detectBrowsers } from './environment-checker.js';
import { ensureDir, findFreePort, slugify, sleep } from './utils.js';

export class BrowserManager {
  constructor({ profilesDir }) {
    this.profilesDir = profilesDir;
    this.process = null;
    this.state = null;
  }

  async status() {
    if (!this.state) return { running: false };
    try {
      const response = await fetch(`http://127.0.0.1:${this.state.port}/json/version`, { signal: AbortSignal.timeout(1200) });
      if (!response.ok) throw new Error('CDP not ready');
      return { ...this.state, running: true };
    } catch {
      this.state = null;
      this.process = null;
      return { running: false };
    }
  }

  async start({ mode, projectName, baseUrl, preferredBrowserPath, preferredPort = 9222 }) {
    projectName = String(projectName || '').trim();
    baseUrl = String(baseUrl || '').trim();
    if (!projectName) throw new Error('Project name is required before launching the browser.');
    if (!baseUrl) throw new Error('Base URL is required before launching the browser.');
    let parsedBaseUrl;
    try { parsedBaseUrl = new URL(baseUrl); } catch { throw new Error('Base URL must be a valid URL.'); }
    if (!['http:', 'https:'].includes(parsedBaseUrl.protocol)) throw new Error('Base URL must use http:// or https://.');

    const existing = await this.status();
    if (existing.running) throw new Error(`A managed browser is already running on port ${existing.port}.`);

    const browsers = await detectBrowsers();
    const browser = preferredBrowserPath
      ? browsers.find((item) => item.path === preferredBrowserPath) || { name: 'Custom browser', path: preferredBrowserPath }
      : browsers[0];

    if (!browser?.path || !fs.existsSync(browser.path)) {
      throw new Error('No compatible Chrome/Chromium/Brave executable is available.');
    }

    const port = await findFreePort(Number(preferredPort) || 9222);
    const projectSlug = slugify(projectName);
    let profileDir;
    let temporary = false;

    if (mode === 'session') {
      profileDir = ensureDir(path.join(this.profilesDir, projectSlug, 'session'));
    } else {
      profileDir = fs.mkdtempSync(path.join(os.tmpdir(), `lighthouse-${projectSlug}-public-`));
      temporary = true;
    }

    const startUrl = mode === 'session' ? new URL('/events', baseUrl).href : new URL('/', baseUrl).href;
    const args = [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-extensions',
      '--new-window',
      startUrl
    ];

    const child = spawn(browser.path, args, { stdio: 'ignore', detached: false });
    this.process = child;
    this.state = { running: false, mode, port, profileDir, temporary, browserName: browser.name, browserPath: browser.path, startUrl };

    child.once('exit', () => {
      if (this.state?.temporary && this.state.profileDir) {
        try { fs.rmSync(this.state.profileDir, { recursive: true, force: true }); } catch {}
      }
      this.state = null;
      this.process = null;
    });

    for (let i = 0; i < 30; i += 1) {
      await sleep(250);
      const status = await this.status();
      if (status.running) {
        this.state = { ...status, running: true };
        return this.state;
      }
      // status() clears state when CDP is not ready, so restore while process is alive.
      if (!child.killed && child.exitCode === null) {
        this.process = child;
        this.state = { running: false, mode, port, profileDir, temporary, browserName: browser.name, browserPath: browser.path, startUrl };
      }
    }

    this.stop();
    throw new Error('Browser launched but the remote debugging endpoint did not become ready.');
  }

  stop() {
    if (this.process && this.process.exitCode === null) {
      this.process.kill('SIGTERM');
    }
    const oldState = this.state;
    this.process = null;
    this.state = null;
    if (oldState?.temporary && oldState.profileDir) {
      try { fs.rmSync(oldState.profileDir, { recursive: true, force: true }); } catch {}
    }
    return { running: false };
  }
}
