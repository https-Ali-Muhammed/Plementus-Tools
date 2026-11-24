import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const extension = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sh-project-setup-f03-01-"));
const tab = url => ({ id: 7, windowId: 2, active: true, incognito: false, status: "complete", url });
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
  assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "storage"]);
  assert.equal("host_permissions" in manifest, false);
  assert.equal("content_scripts" in manifest, false);
  assert.equal(manifest.action.default_popup, "src/popup/popup.html");

  const requests = [];
  const errors = [];
  context.on("request", request => {
    if (!request.url().startsWith("chrome-extension://")) requests.push(request.url());
  });
  const popup = await context.newPage();
  popup.on("pageerror", error => errors.push(error.message));
  await popup.goto(`chrome-extension://${id}/src/popup/popup.html`);
  const state = popup.locator("#tab-observation-state");
  const inspect = popup.locator("#inspect-current-tab");
  assert.equal(await popup.locator("#tab-observation").isVisible(), true);
  assert.equal(await state.textContent(), "Not inspected");
  assert.equal(await popup.locator("#tab-observation-details").isHidden(), true);
  await popup.evaluate(() => {
    window.queryCalls = 0;
    chrome.tabs.query = query => {
      window.queryCalls++;
      if (query.active !== true || query.currentWindow !== true || Object.keys(query).length !== 2) {
        throw new Error("wrong query scope");
      }
      return new Promise(resolve => { window.resolveTabQuery = resolve; });
    };
  });
  await popup.locator("#continue").click();
  assert.equal(await popup.evaluate(() => window.queryCalls), 0);
  await inspect.focus();
  await popup.keyboard.press("Enter");
  assert.equal(await state.textContent(), "Inspecting");
  assert.equal(await inspect.isDisabled(), true);
  await popup.evaluate(value => window.resolveTabQuery([value]), tab("https://github.com/acme/tools?token=secret#fragment"));
  await state.getByText("GitHub tab observed").waitFor();
  assert.equal(await popup.locator("#tab-observation-provider").textContent(), "GitHub");
  assert.equal(await popup.locator("#tab-observation-source").textContent(), "browser tab metadata");
  assert.equal(await popup.locator("#tab-observation-repository").textContent(), "acme/tools");
  assert.match(await popup.locator("#tab-observation").textContent(), /Account and repository permissions are not verified\./);
  assert.equal((await popup.locator("#tab-observation").textContent()).includes("secret"), false);
  assert.equal(await popup.locator(".progress [aria-current='step']").textContent().then(s => /Customer/.test(s)), true);
  assert.equal(await popup.locator("#plan-status").textContent(), "");
  assert.equal(await popup.locator("#simulation-panel").isHidden(), true);
  assert.equal(await inspect.isEnabled(), true);

  async function inspectFixture(value, expectedState) {
    await popup.evaluate(fixture => {
      chrome.tabs.query = async query => {
        if (query.active !== true || query.currentWindow !== true) throw new Error("wrong query scope");
        if (fixture === "reject") throw new Error("denied");
        return fixture;
      };
    }, value);
    await inspect.click();
    await state.getByText(expectedState).waitFor();
  }

  await inspectFixture([tab("https://github.com/")], "GitHub tab observed");
  assert.equal(await popup.locator("#tab-observation-repository-row").isHidden(), true);
  await inspectFixture([tab("https://github.com.evil.test/acme/tools")], "Unsupported tab");
  assert.equal(await popup.locator("#tab-observation-details").isHidden(), true);
  await inspectFixture([], "Access unavailable");
  await inspectFixture([{ ...tab("https://github.com/acme/tools"), status: "loading" }], "Access unavailable");
  await inspectFixture([{ ...tab("https://github.com/acme/tools"), incognito: true }], "Access unavailable");
  await inspectFixture("reject", "Observation failed");
  await popup.evaluate(() => { chrome.tabs.query = undefined; });
  await inspect.click();
  await state.getByText("Access unavailable").waitFor();

  await popup.reload();
  assert.equal(await state.textContent(), "Not inspected");
  const opened = context.waitForEvent("page");
  await popup.locator("#open-workspace").click();
  const workspace = await opened;
  await workspace.waitForLoadState();
  assert.equal(workspace.url(), `chrome-extension://${id}/src/popup/popup.html?workspace=1`);
  assert.equal(await workspace.locator("#tab-observation").isHidden(), true);
  assert.equal(await workspace.locator("#customer-name").inputValue(), "");
  await workspace.locator("#customer-name").fill("Demo customer");
  await workspace.locator("#subscription").selectOption("customer");
  await workspace.locator("#subscription-reference").fill("local-secret");
  await workspace.locator("#continue").click();
  await workspace.locator("#github-organization").fill("demo-org");
  await workspace.locator("#repository-mode").selectOption("existing");
  await workspace.locator("#repository").fill("demo-repo");
  await workspace.locator("#continue").click();
  await workspace.locator("#production").fill("main");
  await workspace.locator("#staging").fill("develop");
  await workspace.locator("#continue").click();
  await workspace.locator("#prepare").click();
  assert.match(await workspace.locator("#plan-status").textContent(), /prepared locally/);
  await workspace.locator("#start-simulation").click();
  await workspace.locator("#simulation-finish").waitFor({ state: "visible", timeout: 10000 });
  assert.equal(await workspace.locator("#simulation-run-state").textContent(), "COMPLETED");
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  console.log("PASS: isolated Chromium extension, controlled tab metadata, popup states, no external requests");
  console.log("LIMITATION: toolbar-icon invocation and real activeTab grant were not exercised");
} finally {
  if (context) await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
