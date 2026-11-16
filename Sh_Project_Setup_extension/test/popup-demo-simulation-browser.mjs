import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const extension = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sh-project-setup-f02-02-"));
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    headless: false,
    args: ["--headless=new", "--disable-background-networking", "--no-first-run",
      `--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker", { timeout: 10000 });
  const id = /^chrome-extension:\/\/([^/]+)\//.exec(worker.url())?.[1];
  assert.ok(id);
  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
  assert.equal("permissions" in manifest, false);
  assert.equal("host_permissions" in manifest, false);

  const requests = [];
  const output = [];
  context.on("request", request => {
    if (!request.url().startsWith("chrome-extension://")) requests.push(request.url());
  });
  context.on("page", page => {
    page.on("console", message => output.push(message.text()));
    page.on("pageerror", error => output.push(error.message));
  });
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/src/popup/popup.html`);
  assert.equal(await popup.locator("#start-simulation").isHidden(), true);
  const opened = context.waitForEvent("page");
  await popup.locator("#open-workspace").click();
  const page = await opened;
  await page.waitForLoadState();
  assert.equal(page.url(), `chrome-extension://${id}/src/popup/popup.html?workspace=1`);
  await page.setViewportSize({ width: 390, height: 800 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.locator("#start-simulation").isHidden(), true);
  await page.locator("#continue").click();
  assert.equal(await page.locator("#customer-name-error").isVisible(), true);
  await page.locator("#customer-name").fill("<img src=x onerror=alert(1)>");
  await page.locator("#subscription").selectOption("customer");
  const secret = "secret-f02-02-784";
  await page.locator("#subscription-reference").fill(secret);
  await page.locator("#continue").click();
  await page.locator("#github-organization").fill("demo-org");
  await page.locator("#repository-mode").selectOption("existing");
  await page.locator("#repository").fill("demo-repo");
  await page.locator("#continue").click();
  await page.locator("#production").fill("main");
  await page.locator("#staging").fill("develop");
  await page.locator("#continue").click();
  assert.match(await page.locator("#review-summary").textContent(), /Provided \(hidden\)/);
  assert.equal(await page.locator("#start-simulation").isHidden(), true);
  await page.locator("#prepare").click();
  assert.equal(await page.locator("#prepare").isDisabled(), true);
  assert.equal(await page.locator("#start-simulation").isVisible(), true);
  assert.equal(await page.locator("#simulation-timeline").isHidden(), true);
  await page.locator("#start-simulation").click();
  assert.equal(await page.locator("#start-simulation").isDisabled(), true);
  assert.equal(await page.locator("#simulation-timeline li").count(), 6);
  assert.match(await page.locator("#simulation-timeline").textContent(), /RUNNING/);
  await page.locator("#simulation-finish").waitFor({ state: "visible", timeout: 10000 });
  assert.equal(await page.locator("#simulation-finish").textContent(),
    "Local simulation finished. No external provisioning was performed.");
  assert.equal(await page.locator("#simulation-progress").getAttribute("value"), "6");
  const timeline = await page.locator("#simulation-timeline").textContent();
  assert.match(timeline, /NOT_CONFIGURED/);
  assert.match(timeline, /Modules unavailable/);
  assert.match(timeline, /MANUAL_NOT_RUN/);
  assert.match(timeline, /association/);
  assert.equal(await page.locator("#simulation-timeline img").count(), 0);
  assert.equal(await page.locator("#start-simulation").isDisabled(), true);
  assert.equal((await page.locator("#simulation-timeline li").count()), 6);
  assert.equal(timeline.includes(secret), false);
  assert.equal(page.url().includes(secret), false);
  assert.equal(output.some(message => message.includes(secret)), false);
  assert.deepEqual(requests, []);
  assert.deepEqual(output, []);
  await page.reload();
  assert.equal(await page.locator("#customer-name").inputValue(), "");
  assert.equal(await page.locator("#start-simulation").isHidden(), true);
  assert.equal(await page.locator("#simulation-timeline").isHidden(), true);
  console.log("PASS popup demo simulation browser");
} finally {
  if (context) await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
