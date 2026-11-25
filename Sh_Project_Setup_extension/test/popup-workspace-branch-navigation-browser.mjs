import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const extension = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sh-workspace-branch-"));
const destination = "https://github.com/fixture-owner/disposable-repo/branches";
let context;
try {
  context = await chromium.launchPersistentContext(profile, { headless: false,
    args: ["--headless=new", "--disable-background-networking", "--no-first-run",
      `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker", { timeout: 10000 });
  const id = /^chrome-extension:\/\/([^/]+)\//.exec(worker.url())?.[1];
  assert.ok(id);
  const requests = [];
  const errors = [];
  await context.route("https://github.com/**", route => route.fulfill({ status: 200,
    contentType: "text/html", body: "Controlled fixture: no live GitHub content." }));
  context.on("request", request => {
    if (!request.url().startsWith("chrome-extension://")) requests.push(request.url());
  });
  context.on("page", page => page.on("pageerror", error => errors.push(error.message)));
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/src/popup/popup.html`);
  assert.equal(await popup.locator("#workspace-branch-navigation").isHidden(), true);
  async function preparedWorkspace({ organization = "fixture-owner", repository = "disposable-repo",
    mode = "existing", production = "main", staging = "plementus-mvp-check-1" } = {}) {
    const workspace = await context.newPage();
    await workspace.goto(`chrome-extension://${id}/src/popup/popup.html?workspace=1`);
    await workspace.evaluate(() => {
      // New optional GitHub permission is granted only by the reviewed Start action.
      window.githubGrant = false;
      chrome.permissions.contains = async () => window.githubGrant;
      chrome.permissions.request = async () => { window.githubGrant = true; return true; };
    });
    assert.equal(await workspace.locator("#workspace-branch-navigation").isHidden(), true);
    await workspace.locator("#customer-name").fill("Private customer");
    await workspace.locator("#subscription").selectOption("customer");
    await workspace.locator("#subscription-reference").fill("private-subscription-secret");
    await workspace.locator("#continue").click();
    await workspace.locator("#github-organization").fill(organization);
    await workspace.locator("#repository-mode").selectOption(mode);
    await workspace.locator("#repository").fill(repository);
    await workspace.locator("#continue").click();
    await workspace.locator("#production").fill(production);
    await workspace.locator("#staging").fill(staging);
    await workspace.locator("#continue").click();
    await workspace.locator("#prepare").click();
    return workspace;
  }
  const page = await preparedWorkspace();
  assert.equal(await page.locator("#workspace-branch-navigation").isVisible(), true);
  assert.equal(await page.locator("#workspace-branch-navigation input[type=text]").count(), 0);
  assert.equal(await page.locator("#workspace-branch-start").isDisabled(), true);
  assert.deepEqual(requests, []);
  await page.locator("#workspace-branch-review").click();
  assert.equal(await page.locator("#workspace-branch-acknowledgment-error").isVisible(), true);
  await page.locator("#workspace-branch-acknowledgment").check();
  await page.locator("#workspace-branch-review").click();
  const preview = await page.locator("#workspace-branch-preview").textContent();
  assert.match(preview, /fixture-owner\/disposable-repo.*main.*plementus-mvp-check-1.*github.com\/fixture-owner\/disposable-repo\/branches/s);
  assert.equal(preview.includes("private-subscription-secret"), false);
  assert.equal(preview.includes("Private customer"), false);
  assert.equal(await page.locator("#workspace-branch-start").isEnabled(), true);
  assert.deepEqual(requests, []);
  await worker.evaluate(() => {
    self.navigationCalls = [];
    chrome.permissions.contains = async () => true;
    chrome.tabs.create = async options => { self.navigationCalls.push(options); return { id: 42, url: options.url }; };
    chrome.tabs.get = async id => ({ id, windowId: 1, incognito: false, status: "complete", url: "https://github.com/fixture-owner/disposable-repo/branches" });
    chrome.scripting.executeScript = async () => [{ frameId: 0, result: false }];
  });
  await page.locator("#workspace-branch-start").click();
  await page.locator("#workspace-branch-start").dispatchEvent("click");
  assert.deepEqual(await worker.evaluate(() => self.navigationCalls), [{ url: destination }]);
  await page.waitForFunction(() => document.querySelector("#current-sandbox-state").textContent.includes("UNSUPPORTED_PAGE"));
  assert.match(await page.locator("#current-sandbox-state").textContent(), /UNSUPPORTED_PAGE/);
  assert.doesNotMatch(await page.locator("#current-sandbox-state").textContent(), /FORM_PREPARED/);
  assert.equal(await page.locator("#workspace-branch-start").isDisabled(), true);
  assert.equal(page.url(), `chrome-extension://${id}/src/popup/popup.html?workspace=1`);

  for (const [values, error] of [
    [{ mode: "new" }, /Existing Repository/],
    [{ organization: "https-Ali-Muhammed", repository: "Plementus-Tools" }, /protected repositories/],
    [{ staging: "develop" }, /plementus-mvp-/],
    [{ staging: "main" }, /differ from Production/],
    [{ production: "plementus-mvp-check-1" }, /differ from Production/],
  ]) {
    const blocked = await preparedWorkspace(values);
    await blocked.locator("#workspace-branch-acknowledgment").check();
    await blocked.locator("#workspace-branch-review").click();
    assert.match(await blocked.locator("#workspace-branch-errors").textContent(), error);
    assert.equal(await blocked.locator("#workspace-branch-start").isDisabled(), true);
    await blocked.close();
  }

  const changedBeforeReview = await preparedWorkspace();
  await changedBeforeReview.evaluate(() => { document.querySelector("#repository").value = "changed-repo"; });
  await changedBeforeReview.locator("#workspace-branch-acknowledgment").check();
  await changedBeforeReview.locator("#workspace-branch-review").click();
  assert.match(await changedBeforeReview.locator("#workspace-branch-preview").textContent(),
    /fixture-owner\/disposable-repo/);
  await changedBeforeReview.locator("#workspace-branch-start").click();
  assert.match(await changedBeforeReview.locator("#workspace-branch-state").textContent(), /STALE_PLAN/);
  await changedBeforeReview.close();

  const stale = await preparedWorkspace();
  await stale.locator("#workspace-branch-acknowledgment").check();
  await stale.locator("#workspace-branch-review").click();
  await stale.evaluate(() => { document.querySelector("#staging").value = "plementus-mvp-other"; });
  await stale.locator("#workspace-branch-start").click();
  assert.match(await stale.locator("#workspace-branch-state").textContent(), /STALE_PLAN/);
  assert.equal(await stale.locator("#workspace-branch-start").isDisabled(), true);
  await stale.close();

  const pending = await preparedWorkspace();
  await pending.locator("#workspace-branch-acknowledgment").check();
  await pending.locator("#workspace-branch-review").click();
  await worker.evaluate(() => {
    self.navigationCalls = [];
    chrome.tabs.create = options => {
      self.navigationCalls.push(options);
      return new Promise(resolve => { self.finishNavigation = resolve; });
    };
  });
  await pending.locator("#workspace-branch-start").click();
  await pending.locator("#workspace-branch-start").dispatchEvent("click");
  assert.deepEqual(await worker.evaluate(() => self.navigationCalls), [{ url: destination }]);
  await pending.waitForFunction(() => document.querySelector("#current-sandbox-state").textContent.includes("NAVIGATION_PENDING"));
  await pending.evaluate(() => {
    document.querySelector("#repository").value = "changed-repo";
  });
  await worker.evaluate(() => self.finishNavigation({ id: 44, url: "https://github.com/fixture-owner/disposable-repo/branches" }));
  await pending.waitForFunction(() => document.querySelector("#current-sandbox-state").textContent.includes("UNSUPPORTED_PAGE"));
  assert.equal(await worker.evaluate(() => self.navigationCalls.length), 1, "workspace edits cannot replay an admitted worker operation");
  assert.equal(await pending.locator("#workspace-branch-start").isDisabled(), true);
  await pending.close();

  const failed = await preparedWorkspace();
  await failed.locator("#workspace-branch-acknowledgment").check();
  await failed.locator("#workspace-branch-review").click();
  await worker.evaluate(() => {
    self.navigationCalls = [];
    chrome.tabs.create = async options => { self.navigationCalls.push(options); throw Error("controlled denial"); };
  });
  const previousId = await worker.evaluate(async () =>
    (await chrome.storage.session.get("sandboxPreparation.current.v1"))["sandboxPreparation.current.v1"]?.operationId);
  await failed.locator("#workspace-branch-start").click();
  await failed.waitForFunction(async old => {
    const result = await chrome.runtime.sendMessage({ type: "SANDBOX_PREPARATION_STATUS" });
    return result.record?.operationId !== old && result.record?.state === "NAVIGATION_UNCONFIRMED";
  }, previousId);
  const currentId = await worker.evaluate(async () =>
    (await chrome.storage.session.get("sandboxPreparation.current.v1"))["sandboxPreparation.current.v1"].operationId);
  await failed.waitForFunction(id => document.querySelector("#current-sandbox-state").textContent.includes(id), currentId);
  assert.match(await failed.locator("#current-sandbox-state").textContent(), /NAVIGATION_UNCONFIRMED/);
  assert.equal(await failed.locator("#workspace-branch-start").isDisabled(), true);
  await failed.locator("#workspace-branch-start").dispatchEvent("click");
  assert.deepEqual(await worker.evaluate(() => self.navigationCalls), [{ url: destination }]);
  await failed.close();

  const conflict = await preparedWorkspace();
  await conflict.locator("#workspace-branch-acknowledgment").check();
  await conflict.locator("#workspace-branch-review").click();
  await conflict.locator("#workspace-branch-start").click();
  await conflict.waitForFunction(() => document.querySelector("#workspace-branch-state").textContent.includes("OPERATION_CONFLICT"));
  assert.equal(await worker.evaluate(() => self.navigationCalls.length), 1);
  await conflict.close();

  const denied = await context.newPage();
  await denied.goto(`chrome-extension://${id}/src/popup/popup.html?workspace=1`);
  assert.equal(await denied.locator("#workspace-branch-navigation").isHidden(), true);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  console.log("PASS: worker-owned workspace navigation, blocked plans, duplicate/stale requests, API failures and isolation");
} finally {
  if (context) await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
