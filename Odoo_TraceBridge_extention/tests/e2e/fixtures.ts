import { test as base, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// shortcut: pinned Playwright needs this for Chromium's `other` popup targets; replace when public popup support exists.
process.env.PW_CHROMIUM_ATTACH_TO_OTHER = '1';

const extensionPath = resolve('.output/chrome-mv3');
// Chromium derives unpacked IDs from the absolute path; production has no worker to discover.
const extensionId = [...createHash('sha256').update(extensionPath).digest().subarray(0, 16)]
  .flatMap(byte => [byte >> 4, byte & 15]).map(n => String.fromCharCode(97 + n)).join('');

async function listen(host: string, title: string): Promise<{ server: Server; origin: string }> {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
    res.end(`<!doctype html><title>${title}</title><h1>Synthetic Odoo development fixture</h1><p>No real data or credentials.</p>`);
  });
  await new Promise<void>((done, reject) => { server.once('error', reject); server.listen(0, host, done); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing fixture port');
  return { server, origin: `http://${host === '::1' ? '[::1]' : host}:${address.port}` };
}

export const test = base.extend<{
  fixture: { origin: string; secondOrigin: string; ipv6Origin?: string; title: string };
  context: BrowserContext;
  popup: Page;
  invoke: (target: Page) => Promise<Page>;
}>({
  fixture: async ({}, use) => {
    const title = `TraceBridge Synthetic ${process.pid}`;
    const first = await listen('127.0.0.1', title);
    const servers = [first.server];
    try {
      const second = await listen('127.0.0.1', title);
      servers.push(second.server);
      let ipv6Origin: string | undefined;
      try { const ipv6 = await listen('::1', title); servers.push(ipv6.server); ipv6Origin = ipv6.origin; }
      catch (error) { if (!['EADDRNOTAVAIL', 'EAFNOSUPPORT'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error; }
      await use({ origin: first.origin, secondOrigin: second.origin, ipv6Origin, title });
    } finally {
      await Promise.all(servers.map(server => new Promise<void>((done, reject) => {
        server.close(error => error ? reject(error) : done()); server.closeAllConnections();
      })));
    }
  },
  context: async ({}, use, info) => {
    const profile = await mkdtemp(join(tmpdir(), 'tracebridge-e2e-'));
    let context: BrowserContext | undefined;
    const logs: string[] = [];
    const requests: string[] = [];
    const errors: string[] = [];
    let version: string | undefined;
    try {
      context = await chromium.launchPersistentContext(profile, {
        channel: 'chromium', headless: process.env.TRACEBRIDGE_HEADED !== '1', chromiumSandbox: true,
        args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
      });
      version = context.browser()?.version();
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      context.on('request', request => requests.push(request.url()));
      context.on('page', page => {
        page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));
        page.on('pageerror', error => errors.push(error.message));
      });
      await use(context);
    } finally {
      try {
        if (context) {
          try {
            const pages = context.pages().filter(page => page.url().startsWith(`chrome-extension://${extensionId}/`));
            for (const [i, page] of pages.entries()) await page.screenshot({ path: info.outputPath(`popup-${i}.png`) });
            await context.tracing.stop({ path: info.outputPath('trace.zip') });
          } finally { await context.close(); }
        }
      } finally {
        await rm(profile, { recursive: true, force: true });
        await writeFile(info.outputPath('browser.json'), JSON.stringify({ version, logs, requests, errors, profileRemoved: true, sandboxEnabled: true }, null, 2));
      }
      expect(errors, 'No unexpected page runtime errors').toEqual([]);
      expect(logs.filter(line => line.startsWith('error:')), 'No console errors').toEqual([]);
      expect(requests.filter(url => !/^(chrome-extension:|chrome:|http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/)/.test(url)), 'No non-loopback browser-context requests').toEqual([]);
    }
  },
  popup: async ({ context }, use) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await use(popup);
  },
  invoke: async ({ context, fixture }, use) => {
    let nativeWindow: string | undefined;
    await use(async target => {
      await target.bringToFront();
      const manager = await context.newPage();
      await manager.goto('chrome://extensions/shortcuts');
      // Configure the built-in action shortcut through browser UI in this profile only.
      const shortcut = manager.getByRole('textbox', { name: 'Shortcut Activate the extension for Odoo TraceBridge', exact: true });
      await manager.getByRole('button', { name: 'Edit shortcut Activate the extension for Odoo TraceBridge', exact: true }).click();
      await shortcut.press('Control+Shift+Y');
      await expect(shortcut).toHaveValue('Ctrl + Shift + Y');
      await manager.close();
      await target.bringToFront();
      const ids = nativeWindow ? [nativeWindow] : execFileSync('xdotool', ['search', '--onlyvisible', '--name', fixture.title], { encoding: 'utf8' }).trim().split('\n');
      expect(ids).toHaveLength(1);
      nativeWindow = ids[0];
      execFileSync('xdotool', ['windowmove', ids[0]!, '20', '20']);
      execFileSync('xdotool', ['windowactivate', '--sync', ids[0]!]);
      execFileSync('xdotool', ['windowfocus', '--sync', ids[0]!]);
      const opened = context.waitForEvent('page');
      expect(execFileSync('xdotool', ['getactivewindow'], { encoding: 'utf8' }).trim()).toBe(ids[0]);
      execFileSync('xdotool', ['key', '--clearmodifiers', 'ctrl+shift+y']);
      const popup = await opened;
      await popup.waitForURL(`chrome-extension://${extensionId}/popup.html`);
      await expect(popup.locator('body')).toHaveCSS('width', '390px');
      return popup;
    });
  },
});
export { expect };
