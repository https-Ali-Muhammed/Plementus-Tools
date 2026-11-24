import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

test("popup opens a fresh full-page workspace with the same local wizard", async () => {
  const extension = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sh-project-setup-f02-"));
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
    assert.equal(manifest.action.default_popup, "src/popup/popup.html");
    assert.deepEqual(manifest.permissions, ["activeTab", "scripting"]);
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
    assert.match(await popup.title(), /Set Up New Customer/);
    assert.equal(await popup.locator("form > section:visible").count(), 1);
    assert.ok((await popup.locator("body").boundingBox()).width <= 448);
    assert.equal(await popup.locator("#open-workspace").isVisible(), true);
    assert.match(await popup.locator("#workspace-launch").textContent(), /fresh local form/i);
    await popup.locator("#customer-name").fill("Popup-only customer");
    await popup.locator("#subscription-reference").fill("private-popup-reference-123");

    const tabPromise = context.waitForEvent("page");
    await popup.locator("#open-workspace").click();
    const workspace = await tabPromise;
    await workspace.waitForLoadState();
    const expectedUrl = `chrome-extension://${id}/src/popup/popup.html?workspace=1`;
    assert.equal(workspace.url(), expectedUrl);
    assert.equal(workspace.url().includes("private-popup-reference-123"), false);
    await workspace.setViewportSize({ width: 1280, height: 900 });
    assert.ok((await workspace.locator("main").boundingBox()).width >= 700);
    await workspace.setViewportSize({ width: 390, height: 800 });
    assert.equal(await workspace.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await workspace.setViewportSize({ width: 1280, height: 900 });
    assert.equal(await workspace.locator("#open-workspace").isHidden(), true);
    assert.equal(await workspace.locator("#customer-name").inputValue(), "");
    assert.equal(await workspace.locator("#subscription-reference").inputValue(), "");
    assert.match(await workspace.locator(".progress [aria-current='step']").textContent(), /Customer/);

    const next = workspace.locator("#continue");
    await next.click();
    assert.equal(await workspace.locator("#customer-name-error").isVisible(), true);
    assert.equal(await workspace.locator("#customer-name").evaluate(node => node === document.activeElement), true);
    await workspace.locator("#customer-heading").focus();
    await workspace.keyboard.press("Tab");
    assert.equal(await workspace.locator("#customer-name").evaluate(node => node === document.activeElement), true);
    await workspace.locator("#customer-name").fill("Workspace customer");
    await workspace.locator("#subscription").selectOption("customer");
    await workspace.locator("#subscription-reference").fill("private-workspace-reference-456");
    await next.click();
    assert.match(await workspace.locator(".progress [aria-current='step']").textContent(), /Repository/);
    await workspace.locator("#github-organization").fill("demo-org");
    await workspace.locator("#repository-mode").selectOption("new");
    await workspace.locator("#repository").fill("demo-repo");
    await next.click();
    assert.match(await workspace.locator(".progress [aria-current='step']").textContent(), /Environments/);
    await workspace.locator("#production").fill("main");
    await workspace.locator("#staging").fill("develop");
    await next.click();
    assert.match(await workspace.locator(".progress [aria-current='step']").textContent(), /Review/);
    const review = await workspace.locator("#review-summary").textContent();
    assert.match(review, /Workspace customer/);
    assert.match(review, /Provided \(hidden\)/);
    assert.equal(review.includes("private-workspace-reference-456"), false);
    await workspace.locator("#prepare").click();
    assert.match(await workspace.locator("#plan-status").textContent(), /prepared locally/);
    assert.equal(await workspace.locator("#prepare").isDisabled(), true);
    assert.equal(workspace.url(), expectedUrl);
    await workspace.reload();
    assert.equal(await workspace.locator("#customer-name").inputValue(), "");
    assert.equal(await workspace.locator("#subscription-reference").inputValue(), "");
    assert.match(await workspace.locator(".progress [aria-current='step']").textContent(), /Customer/);
    assert.equal(await popup.locator("#customer-name").inputValue(), "Popup-only customer");

    await popup.evaluate(() => {
      chrome.tabs.create = async () => { throw new Error("tab creation denied"); };
    });
    const pageCount = context.pages().length;
    await popup.locator("#open-workspace").click();
    assert.match(await popup.locator("#workspace-error").textContent(), /could not open/i);
    assert.equal(await popup.locator("#workspace-error").isVisible(), true);
    assert.equal(await popup.locator("#open-workspace").isEnabled(), true);
    assert.equal(context.pages().length, pageCount);
    assert.deepEqual(requests, []);
    assert.deepEqual(output, []);
    assert.equal(output.some(message => message.includes("private-")), false);
  } finally {
    if (context) await context.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
});
