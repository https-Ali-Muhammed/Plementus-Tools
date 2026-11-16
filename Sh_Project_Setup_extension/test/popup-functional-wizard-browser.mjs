import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

test("unpacked popup completes a local four-step plan without provider operations", async () => {
  const extension = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sh-project-setup-f01-"));
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      headless: false,
      args: ["--headless=new", "--disable-background-networking", "--no-first-run",
        `--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker", { timeout: 10000 });
    const id = /^chrome-extension:\/\/([^/]+)\//.exec(worker.url())?.[1];
    assert.ok(id, "unpacked extension loaded");
    const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
    assert.deepEqual(manifest.permissions, ["activeTab"]);
    assert.equal("host_permissions" in manifest, false);

    const requests = [];
    const output = [];
    context.on("request", request => {
      if (!request.url().startsWith("chrome-extension://")) requests.push(request.url());
    });
    const page = await context.newPage();
    page.on("console", message => output.push(message.text()));
    page.on("pageerror", error => output.push(error.message));
    await page.goto(`chrome-extension://${id}/src/popup/popup.html`);
    const current = () => page.locator(".progress [aria-current='step']").textContent();
    const continueButton = page.locator("#continue");
    const backButton = page.locator("#back");
    const prepareButton = page.locator("#prepare");

    assert.match(await current(), /Customer/);
    assert.equal(await page.locator("form > section:visible").count(), 1);
    assert.equal(await backButton.isDisabled(), true);
    assert.equal(await prepareButton.isHidden(), true);
    await continueButton.click();
    assert.match(await current(), /Customer/);
    assert.equal(await page.locator("#customer-name-error").isVisible(), true);
    assert.equal(await page.locator("#customer-name").evaluate(node => node === document.activeElement), true);
    await page.locator("#customer-name").fill("<img src=x onerror=alert(1)>");
    await page.locator("#subscription").selectOption("customer");
    await page.locator("#subscription-reference").fill("private-reference-123");
    await continueButton.click();
    assert.match(await current(), /Repository/);
    assert.equal(await page.locator("#repository-heading").evaluate(node => node === document.activeElement), true);
    assert.equal(await backButton.isEnabled(), true);

    await continueButton.click();
    assert.match(await current(), /Repository/);
    assert.equal(await page.locator("#github-organization").evaluate(node => node === document.activeElement), true);
    await page.locator("#github-organization").fill("demo-org");
    await continueButton.click();
    assert.equal(await page.locator("#repository-mode").evaluate(node => node === document.activeElement), true);
    await page.locator("#repository-mode").selectOption("new");
    await page.locator("#repository").fill("demo-repo");
    await page.locator("#add-utility").click();
    await page.locator(".utility-url").fill("invalid");
    await page.locator(".utility-path").fill("addons/demo");
    await continueButton.click();
    assert.match(await current(), /Repository/);
    assert.equal(await page.locator(".utility-url-error:visible").count(), 1);
    assert.equal(await page.locator(".utility-url").evaluate(node => node === document.activeElement), true);
    await page.locator(".utility-url").fill("https://github.com/demo-org/utilities.git");
    await page.locator("#add-utility").click();
    assert.equal(await page.locator(".utility-url").count(), 2);
    await page.locator(".remove-utility").last().click();
    assert.equal(await page.locator(".utility-url").count(), 1);
    await continueButton.click();
    assert.match(await current(), /Environments/);
    assert.equal(await page.locator("#modules").isDisabled(), true);

    await continueButton.click();
    assert.match(await current(), /Environments/);
    assert.equal(await page.locator("#production").evaluate(node => node === document.activeElement), true);
    await page.locator("#production").fill("main");
    await page.locator("#staging").fill("develop");
    await page.locator("#domain-mode").selectOption("custom");
    assert.equal(await page.locator("#custom-domains").isVisible(), true);
    await page.locator("#production-domain").fill("bad host");
    await page.locator("#staging-domain").fill("staging.example.com");
    await continueButton.click();
    assert.match(await current(), /Environments/);
    assert.equal(await page.locator("#production-domain").evaluate(node => node === document.activeElement), true);
    await page.locator("#production-domain").fill("www.example.com");
    await backButton.click();
    assert.match(await current(), /Repository/);
    assert.equal(await page.locator("#repository").inputValue(), "demo-repo");
    await backButton.click();
    assert.match(await current(), /Customer/);
    assert.equal(await page.locator("#subscription-reference").inputValue(), "private-reference-123");
    assert.equal(await backButton.isDisabled(), true);
    assert.equal(await page.locator("#customer-heading").evaluate(node => node === document.activeElement), true);
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#customer-name").evaluate(node => node === document.activeElement), true);
    await continueButton.focus();
    await page.keyboard.press("Enter");
    assert.match(await current(), /Repository/);
    await continueButton.click();
    assert.equal(await page.locator("#production-domain").inputValue(), "www.example.com");
    await continueButton.click();
    assert.match(await current(), /Review/);
    assert.equal(await page.locator("form > section:visible").count(), 1);
    assert.equal(await continueButton.isHidden(), true);
    const review = await page.locator("#review-summary").textContent();
    assert.match(review, /demo-org/);
    assert.match(review, /www.example.com/);
    assert.match(review, /Provided \(hidden\)/);
    assert.equal(review.includes("private-reference-123"), false);
    assert.equal(await page.locator("#review-summary img").count(), 0);
    assert.equal(await prepareButton.isEnabled(), true);
    await prepareButton.click();
    assert.equal(await page.locator("#plan-status").textContent(), "Setup plan prepared locally. Provisioning has not started.");
    assert.equal(await prepareButton.isDisabled(), true);
    assert.equal(await backButton.isDisabled(), true);
    assert.equal(await page.locator("#customer-name").isDisabled(), true);
    assert.match(await current(), /Review/);
    assert.deepEqual(requests, []);
    assert.deepEqual(output, []);
    assert.equal(new URL(page.url()).search, "");
    assert.equal(page.url().includes("private-reference-123"), false);

    const reopened = await context.newPage();
    await reopened.goto(`chrome-extension://${id}/src/popup/popup.html`);
    assert.equal(await reopened.locator("#customer-name").inputValue(), "");
    assert.equal(await reopened.locator("#subscription-reference").inputValue(), "");
    assert.match(await reopened.locator(".progress [aria-current='step']").textContent(), /Customer/);
  } finally {
    if (context) await context.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
});
