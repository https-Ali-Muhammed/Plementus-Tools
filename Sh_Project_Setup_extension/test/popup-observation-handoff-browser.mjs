import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const extension = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sh-project-setup-f03-03-'));
const selected = { id: 7, windowId: 2, active: true, incognito: false, status: 'complete',
  url: 'https://github.com/acme/tools?token=secret#fragment' };
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    headless: false,
    args: ['--headless=new', '--disable-background-networking', '--no-first-run',
      `--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 10000 });
  const base = worker.url().match(/^chrome-extension:\/\/[^/]+/)?.[0];
  assert.ok(base);
  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting', 'storage']);
  assert.equal('host_permissions' in manifest, false);
  assert.equal('content_scripts' in manifest, false);
  const requests = [];
  const errors = [];
  context.on('request', request => {
    if (!request.url().startsWith('chrome-extension://')) requests.push(request.url());
  });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const popup = await context.newPage();
  await popup.goto(`${base}/src/popup/popup.html`);
  const action = popup.locator('#open-observed-workspace');
  assert.equal(await action.isHidden(), true);
  await popup.evaluate(value => {
    window.queries = [[value]];
    chrome.tabs.query = async () => window.queries.shift(); // MOCKED tab metadata
    chrome.scripting.executeScript = async () => [{ frameId: 0, result: {
      origin: 'https://github.com', repositoryCandidate: 'acme/tools',
      title: 'acme/tools: Code', heading: 'acme / tools',
    } }]; // MOCKED GitHub DOM observation
    const create = chrome.tabs.create;
    chrome.tabs.create = async options => {
      window.lastCreatedUrl = options.url;
      window.storedAtLaunch = await chrome.storage.session.get(null); // REAL session storage
      return create(options); // REAL packaged tab creation
    };
  }, selected);
  await popup.locator('#inspect-current-tab').click();
  assert.equal(await action.isHidden(), true);
  await popup.evaluate(value => { window.queries = [[value], [value]]; }, selected);
  await popup.locator('#read-github-page').click();
  assert.equal(await popup.locator('#github-page-state').textContent(), 'Page observed');
  assert.equal(await action.isVisible(), true);
  await popup.locator('#subscription-reference').fill('subscription-secret');

  async function openObserved() {
    await popup.evaluate(value => { window.queries = [[value]]; }, selected);
    const opened = context.waitForEvent('page');
    await action.click();
    const page = await opened;
    await page.locator('#observed-repository-card').waitFor({ state: 'visible' });
    const launch = await popup.evaluate(() => ({ url: window.lastCreatedUrl, stored: window.storedAtLaunch }));
    assert.match(launch.url, /\?workspace=1&handoff=[0-9a-f-]+$/);
    assert.equal(launch.url.includes('acme'), false);
    assert.equal(launch.url.includes('secret'), false);
    assert.equal(page.url(), `${base}/src/popup/popup.html?workspace=1`);
    const records = Object.values(launch.stored);
    assert.equal(records.length, 1);
    assert.deepEqual(Object.keys(records[0]).sort(), ['candidate', 'createdAt', 'id', 'provenance']);
    assert.equal(records[0].candidate, 'acme/tools');
    assert.equal(records[0].provenance, 'previous-read-only-github-page-observation');
    assert.equal(JSON.stringify(launch.stored).includes('secret'), false);
    assert.equal(JSON.stringify(launch.stored).includes('https://github.com'), false);
    assert.deepEqual(await worker.evaluate(() => chrome.storage.session.get(null)), {});
    assert.equal(await page.locator('#github-organization').inputValue(), '');
    assert.equal(await page.locator('#repository').inputValue(), '');
    assert.equal(await page.locator('#repository-mode').inputValue(), '');
    assert.match(await page.locator('#observed-repository-card').textContent(), /snapshot, not a current verification/);
    assert.equal(await page.locator('#plan-status').textContent(), '');
    assert.match(await page.locator('.progress [aria-current="step"]').textContent(), /Customer/);
    return { page, launch };
  }

  const first = await openObserved();
  await first.page.locator('#customer-name').fill('Review customer');
  await first.page.locator('#subscription').selectOption('customer');
  await first.page.locator('#subscription-reference').fill('local-review-reference');
  await first.page.locator('#continue').click();
  await first.page.locator('#github-organization').fill('manual-org');
  await first.page.locator('#repository').fill('manual-repo');
  await first.page.locator('#repository-mode').selectOption('new');
  await first.page.locator('#continue').click();
  await first.page.locator('#production').fill('main');
  await first.page.locator('#staging').fill('develop');
  await first.page.locator('#continue').click();
  assert.match(await first.page.locator('.progress [aria-current="step"]').textContent(), /Review/);
  assert.match(await first.page.locator('#review-summary').textContent(), /manual-repo/);
  await first.page.locator('#use-observed-repository').click();
  assert.deepEqual(await Promise.all(['#github-organization', '#repository', '#repository-mode'].map(selector =>
    first.page.locator(selector).inputValue())), ['acme', 'tools', 'existing']);
  assert.match(await first.page.locator('.progress [aria-current="step"]').textContent(), /Review/);
  assert.match(await first.page.locator('#review-summary').textContent(), /GitHub organizationacme.*Repository selectionExisting Repository.*Repositorytools/s);
  assert.equal((await first.page.locator('#review-summary').textContent()).includes('manual-repo'), false);
  assert.match(await first.page.locator('#observation-import-status').textContent(), /unverified browser observation/);
  assert.equal(await first.page.locator('#github-organization').isEnabled(), true);
  await first.page.reload();
  assert.equal(await first.page.locator('#observed-repository-card').isHidden(), true);
  assert.equal(await first.page.locator('#github-organization').inputValue(), '');
  await first.page.goto(first.launch.url);
  assert.equal(await first.page.locator('#observed-repository-card').isHidden(), true);
  assert.equal(await first.page.locator('#github-organization').inputValue(), '');

  const second = await openObserved();
  await second.page.locator('#dismiss-observed-repository').click();
  assert.equal(await second.page.locator('#github-organization').inputValue(), '');
  assert.equal(await second.page.locator('#repository').inputValue(), '');
  assert.equal(await second.page.locator('#repository-mode').inputValue(), '');

  const third = await openObserved();
  await third.page.locator('#customer-name').fill('Prepared customer');
  await third.page.locator('#subscription').selectOption('customer');
  await third.page.locator('#subscription-reference').fill('local-prepared-reference');
  await third.page.locator('#continue').click();
  await third.page.locator('#github-organization').fill('manual-org');
  await third.page.locator('#repository').fill('manual-repo');
  await third.page.locator('#repository-mode').selectOption('new');
  await third.page.locator('#continue').click();
  await third.page.locator('#production').fill('main');
  await third.page.locator('#staging').fill('develop');
  await third.page.locator('#continue').click();
  await third.page.locator('#prepare').click();
  assert.equal(await third.page.locator('#observed-repository-card').isHidden(), true);
  assert.equal(await third.page.locator('#github-organization').inputValue(), 'manual-org');

  const lateId = randomUUID();
  const lateKey = `github-observation-handoff:${lateId}`;
  await worker.evaluate(([key, id]) => chrome.storage.session.set({ [key]: {
    id, candidate: 'acme/tools', provenance: 'previous-read-only-github-page-observation', createdAt: Date.now(),
  } }), [lateKey, lateId]); // REAL session storage
  const late = await context.newPage();
  await late.addInitScript(() => {
    const get = chrome.storage.session.get.bind(chrome.storage.session);
    chrome.storage.session.get = async (...args) => {
      await new Promise(resolve => { window.releaseHandoffGet = resolve; }); // CONTROLLED storage delay
      return get(...args);
    };
  });
  await late.goto(`${base}/src/popup/popup.html?workspace=1&handoff=${lateId}`);
  await late.waitForFunction(() => typeof window.releaseHandoffGet === 'function');
  await late.locator('#customer-name').fill('Delayed customer');
  await late.locator('#subscription').selectOption('customer');
  await late.locator('#subscription-reference').fill('local-delayed-reference');
  await late.locator('#continue').click();
  await late.locator('#github-organization').fill('manual-org');
  await late.locator('#repository').fill('manual-repo');
  await late.locator('#repository-mode').selectOption('new');
  await late.locator('#continue').click();
  await late.locator('#production').fill('main');
  await late.locator('#staging').fill('develop');
  await late.locator('#continue').click();
  await late.locator('#prepare').click();
  await late.evaluate(() => window.releaseHandoffGet());
  await late.waitForURL(`${base}/src/popup/popup.html?workspace=1`);
  assert.equal(await late.locator('#observed-repository-card').isHidden(), true);
  assert.equal(await late.locator('#github-organization').inputValue(), 'manual-org');
  assert.deepEqual(await worker.evaluate(key => chrome.storage.session.get(key), lateKey), {});

  const freshOpened = context.waitForEvent('page');
  await popup.locator('#open-workspace').click();
  const fresh = await freshOpened;
  await fresh.waitForLoadState();
  assert.equal(fresh.url(), `${base}/src/popup/popup.html?workspace=1`);
  assert.equal(await fresh.locator('#observed-repository-card').isHidden(), true);

  for (const kind of ['expired', 'malformed']) {
    const id = randomUUID();
    const key = `github-observation-handoff:${id}`;
    const record = { id, candidate: 'acme/tools', provenance: 'previous-read-only-github-page-observation',
      createdAt: kind === 'expired' ? Date.now() - 60_001 : Date.now() };
    if (kind === 'malformed') record.authorized = true;
    await worker.evaluate(([name, value]) => chrome.storage.session.set({ [name]: value }), [key, record]);
    const page = await context.newPage();
    await page.goto(`${base}/src/popup/popup.html?workspace=1&handoff=${id}`);
    await page.waitForURL(`${base}/src/popup/popup.html?workspace=1`);
    assert.equal(await page.locator('#observed-repository-card').isHidden(), true);
    assert.equal(await page.locator('#github-organization').inputValue(), '');
    assert.deepEqual(await worker.evaluate(name => chrome.storage.session.get(name), key), {});
    await page.close();
  }

  await popup.evaluate(() => {
    chrome.tabs.create = async () => { throw Error('tab denied'); };
    window.pendingTransferQueries = 0;
    chrome.tabs.query = () => {
      window.pendingTransferQueries++;
      return new Promise(resolve => { window.releaseTransferQuery = resolve; }); // CONTROLLED tab-metadata delay
    };
  });
  await action.click();
  assert.equal(await popup.locator('#inspect-current-tab').isDisabled(), true);
  assert.equal(await popup.locator('#read-github-page').isDisabled(), true);
  await popup.evaluate(() => {
    document.querySelector('#inspect-current-tab').dispatchEvent(new Event('click'));
    document.querySelector('#read-github-page').dispatchEvent(new Event('click'));
  });
  assert.equal(await popup.evaluate(() => window.pendingTransferQueries), 1);
  assert.equal(await popup.locator('#github-page-state').textContent(), 'Page observed');
  await popup.evaluate(value => window.releaseTransferQuery([value]), selected);
  assert.equal(await popup.locator('#workspace-error').isVisible(), true);
  assert.match(await popup.locator('#workspace-error').textContent(), /Could not open the observed workspace/);
  assert.deepEqual(await worker.evaluate(() => chrome.storage.session.get(null)), {});
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  assert.equal(await popup.locator('#inspect-current-tab').isEnabled(), true);
  assert.equal(await popup.locator('#read-github-page').isEnabled(), true);
  await popup.evaluate(value => { chrome.tabs.query = async () => [{ ...value, id: 8 }]; }, selected);
  await action.click();
  assert.equal(await action.isHidden(), true);
  assert.equal(await popup.locator('#github-page-state').textContent(), 'Page changed / reinspection required');
  assert.equal(await popup.locator('#github-page-details').isHidden(), true);
  assert.equal(await popup.locator('#github-page-repository').textContent(), '');
  assert.deepEqual(await worker.evaluate(() => chrome.storage.session.get(null)), {});
  console.log('PASS: REAL chrome.storage.session and packaged tabs; MOCKED GitHub DOM observation and tab metadata');
} finally {
  if (context) await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
