import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const extension = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sh-project-setup-f02-02-"));
async function preparedWorkspace(context, id) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/src/popup/popup.html?workspace=1`);
  await page.locator("#customer-name").fill("Demo project");
  await page.locator("#subscription").selectOption("customer");
  await page.locator("#subscription-reference").fill("secret-browser-456");
  await page.locator("#continue").click();
  await page.locator("#github-organization").fill("demo-org");
  await page.locator("#repository-mode").selectOption("existing");
  await page.locator("#repository").fill("demo-repo");
  await page.locator("#continue").click();
  await page.locator("#production").fill("main");
  await page.locator("#staging").fill("develop");
  await page.locator("#continue").click();
  await page.locator("#prepare").click();
  return page;
}
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
  assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "storage"]);
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
  assert.equal(await page.locator("#simulation-run-state").textContent(), "IDLE");
  assert.equal(await page.locator("#simulation-status").isVisible(), true);
  assert.equal(await page.locator("#simulation-scenario").isEnabled(), true);
  assert.equal(await page.locator("#simulation-scenario option").count(), 3);
  assert.equal(await page.locator("#simulation-timeline").isHidden(), true);
  await page.locator("#start-simulation").click();
  await page.locator("#pause-simulation").click();
  assert.equal(await page.locator("#simulation-run-state").textContent(), "PAUSED");
  assert.equal(await page.locator("#pause-simulation").isHidden(), true);
  assert.equal(await page.locator("#resume-simulation").isVisible(), true);
  assert.equal(await page.locator("#simulation-scenario").isDisabled(), true);
  await page.locator("#resume-simulation").click();
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
  assert.equal(await page.locator("#simulation-run-state").textContent(), "COMPLETED");
  assert.match(await page.locator("#simulation-report").textContent(), /5 locally simulated steps/);
  assert.match(await page.locator("#simulation-report").textContent(), /No external provisioning was performed/);
  assert.equal(await page.locator("#cancel-simulation").isHidden(), true);
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

  for (const [scenario, expectedState, completed, simulated, pending] of [
    ["production-failure", "FAILED", 2, 2, 3],
    ["staging-unknown", "OUTCOME_UNKNOWN", 4, 3, 1],
  ]) {
    const scenarioPage = await preparedWorkspace(context, id);
    await scenarioPage.locator("#simulation-scenario").selectOption(scenario);
    await scenarioPage.locator("#start-simulation").click();
    await scenarioPage.locator("#simulation-finish").waitFor({ state: "visible" });
    assert.equal(await scenarioPage.locator("#simulation-run-state").textContent(), expectedState);
    assert.equal(await scenarioPage.locator("#simulation-scenario").isDisabled(), true);
    assert.equal(await scenarioPage.locator("#simulation-progress").getAttribute("value"), String(completed));
    const report = await scenarioPage.locator("#simulation-report").textContent();
    assert.match(report, new RegExp(`${simulated} locally simulated steps`));
    assert.match(report, new RegExp(`${pending} pending or unattempted steps`));
    assert.equal(await scenarioPage.locator("#resume-simulation").isHidden(), true);
    assert.equal(await scenarioPage.locator("#cancel-simulation").isHidden(), true);
    await scenarioPage.close();
  }

  for (const paused of [false, true]) {
    const cancelPage = await preparedWorkspace(context, id);
    await cancelPage.locator("#start-simulation").click();
    if (paused) await cancelPage.locator("#pause-simulation").click();
    await cancelPage.locator("#cancel-simulation").click();
    assert.equal(await cancelPage.locator("#simulation-run-state").textContent(), "CANCELLED");
    assert.match(await cancelPage.locator("#simulation-report").textContent(), /5 pending or unattempted steps/);
    assert.equal(await cancelPage.locator("#pause-simulation").isHidden(), true);
    assert.equal(await cancelPage.locator("#resume-simulation").isHidden(), true);
    await cancelPage.close();
  }
  console.log("PASS popup demo simulation browser");
} finally {
  if (context) await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
