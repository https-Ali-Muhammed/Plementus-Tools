import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import * as branchPreparation from "../src/popup/workspace-branch-preparation.mjs";
import { prepareNativeBranchForm } from "../src/popup/sandbox-branch-assistant.mjs";

const { openNativeBranchDialog, waitForNativeBranchDialog, inspectWorkspaceBranchPage } = branchPreparation;

const extension = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sh-workspace-preparation-"));
let context;
try {
  context = await chromium.launchPersistentContext(profile, { headless: false,
    args: ["--headless=new", "--disable-background-networking", "--no-first-run",
      `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker", { timeout: 10000 });
  const id = /^chrome-extension:\/\/([^/]+)\//.exec(worker.url())?.[1];
  assert.ok(id);
  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
  assert.deepEqual(manifest.optional_host_permissions, ["https://github.com/*"]);
  assert.equal("host_permissions" in manifest, false);
  const requests = [];
  await context.route("https://github.com/**", route => route.fulfill({ status: 200,
    contentType: "text/html", body: "Controlled fixture: no live GitHub content." }));
  context.on("request", request => { if (!request.url().startsWith("chrome-extension://")) requests.push(request.url()); });
  async function preparedPage(permissionInitiallyPresent) {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${id}/src/popup/popup.html?workspace=1`);
    await popup.evaluate(present => {
      window.permissionAvailable = present;
      window.permissionRequests = 0;
      chrome.permissions.contains = async () => window.permissionAvailable;
      chrome.permissions.request = async () => {
        window.permissionRequests++;
        window.permissionAvailable = true;
        return true;
      };
    }, permissionInitiallyPresent);
    await popup.locator("#customer-name").fill("Private customer");
    await popup.locator("#subscription").selectOption("customer");
    await popup.locator("#subscription-reference").fill("private-subscription-secret");
    await popup.locator("#continue").click();
    await popup.locator("#github-organization").fill("fixture-owner");
    await popup.locator("#repository-mode").selectOption("existing");
    await popup.locator("#repository").fill("disposable-repo");
    await popup.locator("#continue").click();
    await popup.locator("#production").fill("main");
    await popup.locator("#staging").fill("plementus-mvp-check-1");
    await popup.locator("#continue").click();
    await popup.locator("#prepare").click();
    await popup.locator("#workspace-branch-acknowledgment").check();
    await popup.locator("#workspace-branch-review").click();
    return popup;
  }
  const page = await preparedPage(false);
  assert.match(await page.locator("#workspace-branch-permission").textContent(), /Start will request.*github.com/);
  assert.match(await page.locator("#workspace-branch-preview").textContent(), /fixture-owner\/disposable-repo.*main.*plementus-mvp-check-1/s);
  await page.evaluate(() => {
    window.calls = [];
    chrome.permissions.request = options => { window.calls.push(["permission", options]); window.permissionAvailable = true; return Promise.resolve(true); };
  });
  await worker.evaluate(() => {
    self.calls = [];
    chrome.permissions.contains = async () => true;
    chrome.tabs.create = async options => { self.calls.push(["create", options]); return { id: 42, url: options.url }; };
    chrome.tabs.get = async id => ({ id, windowId: 1, incognito: false, status: "complete",
      url: "https://github.com/fixture-owner/disposable-repo/branches" });
    chrome.scripting.executeScript = async options => {
      self.calls.push(["script", options.target, options.func.name, options.args]);
      return [{ frameId: 0, documentId: "fixture-document", result:
        options.func.name === "inspectWorkspaceBranchPage" ? true :
          options.func.name === "openNativeBranchDialog" ? "DIALOG_OPENED" :
          options.func.name === "waitForNativeBranchDialog" ||
          options.func.name === "verifyPreparedNativeBranchForm" ? true : "FORM_PREPARED" }];
    };
  });
  await page.locator("#workspace-branch-start").click();
  await page.waitForFunction(() => document.querySelector("#workspace-branch-state").textContent.includes("FORM_PREPARED"));
  const calls = await worker.evaluate(() => self.calls);
  assert.deepEqual(await page.evaluate(() => window.calls), [["permission", { origins: ["https://github.com/*"] }]]);
  assert.equal(calls.filter(([kind]) => kind === "create").length, 1);
  assert.equal(calls.filter(([, , func]) => func === "openNativeBranchDialog").length, 1);
  assert.equal(calls.filter(([, , func]) => func === "prepareNativeBranchForm").length, 1);
  assert.equal(JSON.stringify(calls).includes("private-subscription-secret"), false);
  assert.equal(JSON.stringify(await worker.evaluate(() => chrome.storage.session.get("sandboxPreparation.current.v1"))).includes("private-subscription-secret"), false);
  assert.deepEqual(requests, []);
  assert.equal(await page.locator("#workspace-branch-start").isDisabled(), true);
  const existing = await preparedPage(true);
  assert.match(await existing.locator("#workspace-branch-permission").textContent(), /already available/);
  await existing.evaluate(() => {
    chrome.permissions.request = () => { throw Error("pre-existing grant must not be requested again"); };
  });
  await worker.evaluate(() => { self.navigationCalls = 0;
    chrome.tabs.create = async () => { self.navigationCalls++; throw Error("controlled navigation rejection"); }; });
  await existing.locator("#workspace-branch-start").click();
  await existing.waitForFunction(() => document.querySelector("#workspace-branch-state").textContent.includes("NAVIGATION_UNCONFIRMED"));
  assert.equal(await worker.evaluate(() => self.navigationCalls), 1);
  assert.equal(await existing.evaluate(() => window.permissionRequests), 0);
  await existing.close();
  const denied = await preparedPage(false);
  await denied.evaluate(() => {
    chrome.permissions.request = () => { window.permissionRequests++; return Promise.resolve(false); };
  });
  await worker.evaluate(() => { self.navigationCalls = 0; chrome.tabs.create = () => { self.navigationCalls++; throw Error("must not navigate"); }; });
  await denied.locator("#workspace-branch-start").click();
  await denied.waitForFunction(() => document.querySelector("#workspace-branch-state").textContent.includes("PERMISSION_DENIED"));
  assert.equal(await worker.evaluate(() => self.navigationCalls), 0);
  assert.equal(await denied.evaluate(() => window.permissionRequests), 1);
  await denied.close();
  const missing = await preparedPage(false);
  await missing.evaluate(() => {
    chrome.permissions.request = () => { throw Error("permission API unavailable"); };
  });
  await worker.evaluate(() => { self.navigationCalls = 0; });
  await missing.locator("#workspace-branch-start").click();
  await missing.waitForFunction(() => document.querySelector("#workspace-branch-state").textContent.includes("PERMISSION_MISSING"),
    null, { timeout: 1000 });
  assert.equal(await worker.evaluate(() => self.navigationCalls), 0);
  await missing.close();
  // Real Chromium DOM with a routed fixture URL; no live GitHub page or grant is used.
  await context.route("https://github.com/fixture-owner/disposable-repo/branches", route => route.fulfill({
    contentType: "text/html", body: `<button id="opener" type="button">New branch</button>
      <script>window.clicks = 0; document.querySelector('#opener').onclick = () => {
        window.clicks++; const dialog = document.createElement('dialog'); dialog.open = true;
        dialog.innerHTML = '<h2>New branch</h2><label for="source">Source branch</label><input id="source" value="main"><label for="name">New branch name</label><input id="name" type="text"><button type="submit">Create new branch</button>';
        document.body.append(dialog);
      };</script>`,
  }));
  const fixturePage = await context.newPage();
  await fixturePage.goto("https://github.com/fixture-owner/disposable-repo/branches");
  assert.equal(await fixturePage.evaluate(openNativeBranchDialog, "other/repo"), "UNSUPPORTED_PAGE");
  await fixturePage.evaluate(() => {
    window.submitCount = 0;
    window.inputCount = 0;
    document.addEventListener("submit", () => window.submitCount++);
    document.addEventListener("input", () => window.inputCount++);
  });
  await fixturePage.locator("#opener").evaluate(button => button.setAttribute("aria-hidden", "true"));
  assert.equal(await fixturePage.evaluate(openNativeBranchDialog, "fixture-owner/disposable-repo"), "UNSUPPORTED_UI");
  await fixturePage.locator("#opener").evaluate(button => button.removeAttribute("aria-hidden"));
  await fixturePage.locator("#opener").evaluate(button => { button.type = "submit"; });
  assert.equal(await fixturePage.evaluate(openNativeBranchDialog, "fixture-owner/disposable-repo"), "UNSUPPORTED_UI");
  await fixturePage.locator("#opener").evaluate(button => { button.type = "button"; button.setAttribute("inert", ""); });
  assert.equal(await fixturePage.evaluate(openNativeBranchDialog, "fixture-owner/disposable-repo"), "UNSUPPORTED_UI");
  await fixturePage.locator("#opener").evaluate(button => { button.removeAttribute("inert"); });
  await fixturePage.locator("#opener").evaluate(button => { button.disabled = true; });
  assert.equal(await fixturePage.evaluate(openNativeBranchDialog, "fixture-owner/disposable-repo"), "UNSUPPORTED_UI");
  await fixturePage.locator("#opener").evaluate(button => { button.disabled = false; button.hidden = true; });
  assert.equal(await fixturePage.evaluate(openNativeBranchDialog, "fixture-owner/disposable-repo"), "UNSUPPORTED_UI");
  await fixturePage.locator("#opener").evaluate(button => { button.hidden = false; });
  await fixturePage.evaluate(() => document.body.insertAdjacentHTML("beforeend", '<button id="duplicate" type="button">New branch</button>'));
  assert.equal(await fixturePage.evaluate(openNativeBranchDialog, "fixture-owner/disposable-repo"), "UNSUPPORTED_UI");
  await fixturePage.locator("#duplicate").evaluate(button => button.remove());
  await fixturePage.evaluate(() => document.body.insertAdjacentHTML("beforeend", '<button id="unrelated" type="button">Create a branch</button>'));
  assert.equal(await fixturePage.evaluate(openNativeBranchDialog, "fixture-owner/disposable-repo"), "DIALOG_OPENED");
  const runFixtureFunction = (func, args) => fixturePage.evaluate(({ source, args }) =>
    (0, eval)(`(${source})`)(...args), { source: func.toString(), args });
  assert.equal(await runFixtureFunction(waitForNativeBranchDialog, ["fixture-owner/disposable-repo", 50]), true);
  assert.equal(await runFixtureFunction(prepareNativeBranchForm,
    ["fixture-owner/disposable-repo", "main", "plementus-mvp-check-1"]), "FORM_PREPARED");
  assert.equal(await fixturePage.evaluate(() => window.clicks), 1);
  assert.equal(await fixturePage.evaluate(() => window.submitCount), 0);
  assert.equal(await fixturePage.locator("#name").inputValue(), "plementus-mvp-check-1");
  const finalVerifier = branchPreparation.verifyPreparedNativeBranchForm || inspectWorkspaceBranchPage;
  const finalArgs = ["fixture-owner/disposable-repo", "main", "plementus-mvp-check-1"];
  const inputsBeforeRead = await fixturePage.evaluate(() => window.inputCount);
  assert.equal(await runFixtureFunction(finalVerifier, finalArgs), true);
  assert.equal(await fixturePage.evaluate(() => window.inputCount), inputsBeforeRead);
  await fixturePage.locator("#name").fill("");
  assert.equal(await runFixtureFunction(finalVerifier, finalArgs), false, "cleared prepared name");
  await fixturePage.locator("#name").fill("plementus-mvp-check-1");
  await fixturePage.locator("#source").fill("other-source");
  assert.equal(await runFixtureFunction(finalVerifier, finalArgs), false, "changed source");
  await fixturePage.locator("#source").fill("main");
  await fixturePage.locator("dialog").evaluate(dialog => dialog.remove());
  assert.equal(await runFixtureFunction(finalVerifier, finalArgs), false, "removed dialog");
  await fixturePage.evaluate(() => {
    const dialog = document.createElement("dialog");
    dialog.open = true;
    dialog.innerHTML = '<h2>Create a branch</h2><label>Source</label><button id="ref-picker-fixture" type="button" aria-haspopup="true" aria-label="main branch">main</button><label for="picker-name">New branch name</label><input id="picker-name" type="text" value="plementus-mvp-check-1">';
    document.body.append(dialog);
  });
  assert.equal(await runFixtureFunction(finalVerifier, finalArgs), true, "picker dialog contract");
  await fixturePage.locator("#picker-name").evaluate(input => { input.hidden = true; });
  assert.equal(await runFixtureFunction(finalVerifier, finalArgs), false, "hidden name");
  await fixturePage.locator("#picker-name").evaluate(input => { input.hidden = false; });
  await fixturePage.locator("#picker-name").evaluate(input => { input.disabled = true; });
  assert.equal(await runFixtureFunction(finalVerifier, finalArgs), false, "disabled name");
  await fixturePage.locator("#picker-name").evaluate(input => { input.disabled = false; });
  await fixturePage.locator("#ref-picker-fixture").evaluate(button => { button.setAttribute("aria-disabled", "true"); });
  assert.equal(await runFixtureFunction(finalVerifier, finalArgs), false, "disabled source");
  await fixturePage.locator("#ref-picker-fixture").evaluate(button => { button.removeAttribute("aria-disabled"); });
  await fixturePage.evaluate(() => document.querySelector("dialog").insertAdjacentHTML("beforeend", '<label for="other-name">New branch name</label><input id="other-name" value="plementus-mvp-check-1">'));
  assert.equal(await runFixtureFunction(finalVerifier, finalArgs), false, "ambiguous name");
  await fixturePage.locator("#other-name").evaluate(input => { input.previousElementSibling.remove(); input.remove(); });
  assert.equal(await fixturePage.evaluate(() => window.submitCount), 0);
  assert.equal(await fixturePage.evaluate(openNativeBranchDialog, "fixture-owner/disposable-repo"), "UNSUPPORTED_UI");
  await fixturePage.locator("#picker-name").fill("");
  await fixturePage.locator("#ref-picker-fixture").evaluate(button => { button.textContent = "wrong-source"; });
  assert.equal(await runFixtureFunction(prepareNativeBranchForm,
    ["fixture-owner/disposable-repo", "main", "plementus-mvp-check-1"]), "MANUAL_ACTION_REQUIRED");
  await fixturePage.locator("#ref-picker-fixture").evaluate(button => { button.textContent = "main"; });
  await fixturePage.locator("#picker-name").fill("already-entered");
  assert.equal(await runFixtureFunction(prepareNativeBranchForm,
    ["fixture-owner/disposable-repo", "main", "plementus-mvp-check-1"]), "MANUAL_ACTION_REQUIRED");
  assert.equal(await fixturePage.evaluate(() => window.submitCount), 0);
  await fixturePage.close();
  console.log("PASS: real worker messaging/session storage with mocked provider APIs; one preparation and no external request");
} finally {
  if (context) await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
