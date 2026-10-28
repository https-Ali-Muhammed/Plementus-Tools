import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const extension = path.resolve("Sh_Project_Setup_extension");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sh-project-setup-03-04-"));
let context;

try {
  context = await chromium.launchPersistentContext(profile, {
    headless: false,
    args: ["--headless=new", `--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker", { timeout: 10000 });
  const id = /^chrome-extension:\/\/([^/]+)\//.exec(worker.url())?.[1];
  assert.ok(id);
  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
  assert.equal("permissions" in manifest, false);
  assert.equal("host_permissions" in manifest, false);
  const page = await context.newPage();
  const messages = [];
  const external = [];
  page.on("console", () => messages.push("console"));
  page.on("pageerror", () => messages.push("page error"));
  page.on("request", request => { if (!request.url().startsWith("chrome-extension://")) external.push("external request"); });
  await page.goto(`chrome-extension://${id}/src/popup/popup.html`, { waitUntil: "load" });
  for (const selector of ["#github-organization", "#repository", "#repository-mode"]) {
    await page.locator(selector).focus();
    await page.locator(selector).blur();
    assert.equal(await page.locator(selector).getAttribute("aria-invalid"), "true");
    const errorId = await page.locator(selector).getAttribute("aria-describedby");
    assert.equal(await page.locator(`#${errorId}`).getAttribute("role"), "alert");
    assert.equal(await page.locator(`#${errorId}`).isVisible(), true);
  }
  await page.locator("#github-organization").fill("demo-org");
  await page.locator("#repository").fill("demo-repo");
  await page.locator("#repository-mode").selectOption("existing");
  await page.locator("#add-utility").click();
  await page.locator(".utility-url").first().fill("https://github.com/demo-org/example.git");
  await page.locator(".utility-url").first().blur();
  await page.locator(".utility-path").first().fill("addons/example");
  await page.locator(".utility-path").first().blur();
  await page.locator("#add-utility").click();
  await page.locator(".utility-url").last().fill("git@github.com:demo-org/example");
  await page.locator(".utility-url").last().blur();
  await page.locator(".utility-path").last().fill("addons/example");
  await page.locator(".utility-path").last().blur();
  assert.equal(await page.locator(".utility-url-error:visible").count(), 2);
  assert.equal(await page.locator(".utility-path-error:visible").count(), 2);
  for (const field of await page.locator(".utility-url, .utility-path").all()) {
    const id = await field.getAttribute("aria-describedby");
    assert.equal(await page.locator(`#${id}`).getAttribute("role"), "alert");
    assert.equal(await field.getAttribute("aria-invalid"), "true");
  }
  await page.locator(".remove-utility").last().click();
  assert.equal(await page.locator("fieldset").count(), 1);
  assert.equal(await page.locator(".utility-url-error:visible, .utility-path-error:visible").count(), 0);
  assert.equal(await page.locator("#add-utility").evaluate(node => node === document.activeElement), true);
  await page.locator("#subscription-reference").fill("synthetic-reference");
  await page.locator("#repository").press("Enter");
  assert.equal(new URL(page.url()).search, "");
  assert.equal(await page.locator("#production").isEnabled(), true);
  await page.locator("#production").fill("main");
  await page.locator("#staging").fill("develop");
  await page.locator("#domain-mode").selectOption("custom");
  await page.locator("#production-domain").fill("live.example.com");
  await page.locator("#staging-domain").fill("test.example.com");
  await page.locator("#customer-name").fill("<img src=x onerror=alert(1)>");
  assert.equal(await page.locator("#review-summary img").count(), 0);
  assert.equal((await page.locator("#review-summary").textContent()).includes("<img src=x onerror=alert(1)>"), true);
  assert.equal((await page.locator("#review-summary").textContent()).includes("synthetic-reference"), false);
  assert.equal((await page.locator("#review-summary").textContent()).includes("Provided (hidden)"), true);
  assert.equal((await page.locator("#review-summary").textContent()).includes("live.example.com"), true);
  await page.locator("#domain-mode").selectOption("default");
  assert.equal(await page.locator("#custom-domains").isHidden(), true);
  assert.equal((await page.locator("#review-summary").textContent()).includes("live.example.com"), false);
  assert.equal(await page.locator(".actions button:disabled").count(), 2);
  assert.deepEqual(messages, []);
  assert.deepEqual(external, []);
  const browser = await (await context.newCDPSession(page)).send("Browser.getVersion");
  process.stdout.write(`PASS ${browser.product}: regressions, branches, domains, safe redacted summary, permissions, no external requests or console output\n`);
} finally {
  if (context) await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
