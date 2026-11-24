import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const extension = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sh-project-setup-f03-02-"));
const tab = (url = "https://github.com/microsoft/vscode?token=secret#fragment") => ({
  id: 7, windowId: 2, active: true, incognito: false, status: "complete", url,
});
const observed = { origin: "https://github.com", repositoryCandidate: "microsoft/vscode",
  title: "microsoft/vscode: Code", heading: "microsoft / vscode" };
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
  assert.equal("content_scripts" in manifest, false);
  assert.equal(manifest.action.default_popup, "src/popup/popup.html");
  assert.equal(manifest.background.service_worker, "src/background.js");

  const requests = [];
  const errors = [];
  context.on("request", request => {
    if (!request.url().startsWith("chrome-extension://")) requests.push(request.url());
  });
  const popup = await context.newPage();
  popup.on("pageerror", error => errors.push(error.message));
  await popup.goto(`chrome-extension://${id}/src/popup/popup.html`);
  const inspect = popup.locator("#inspect-current-tab");
  const read = popup.locator("#read-github-page");
  const state = popup.locator("#github-page-state");
  assert.equal(await read.isHidden(), true);
  assert.equal(await state.textContent(), "Not read");

  await popup.evaluate(() => {
    window.events = [];
    window.queries = [];
    window.scriptResult = null;
    window.scriptFailure = false;
    chrome.tabs.query = async query => {
      if (JSON.stringify(query) !== '{"active":true,"currentWindow":true}') throw Error("wrong query");
      window.events.push("query");
      const value = window.queries.shift();
      if (value === "DENIED") throw Error("token=secret");
      return value;
    };
    chrome.scripting.executeScript = async options => {
      window.events.push("execute");
      window.executeArgs = { target: options.target, args: options.args, func: options.func.toString() };
      if (window.scriptFailure) throw Error("token=secret");
      return window.scriptResult;
    };
  });
  assert.deepEqual(await popup.evaluate(() => window.events), []);
  await popup.evaluate(value => { window.queries = [[value]]; }, tab("https://example.com"));
  await inspect.click();
  assert.equal(await read.isHidden(), true);
  assert.equal(await state.textContent(), "Not read");
  assert.deepEqual(await popup.evaluate(() => window.events), ["query"]);

  await popup.evaluate(value => { window.events = []; window.queries = [[value]]; }, tab());
  await inspect.click();
  assert.equal(await read.isVisible(), true);
  assert.equal(await state.textContent(), "Not read");
  assert.deepEqual(await popup.evaluate(() => window.events), ["query"]);
  await popup.evaluate(({ selected, result }) => {
    window.events = [];
    window.queries = [[selected], [selected]];
    window.scriptResult = [{ frameId: 0, result }]; // MOCKED injection result
  }, { selected: tab(), result: observed });
  await read.click();
  await state.getByText("Page observed").waitFor();
  assert.deepEqual(await popup.evaluate(() => window.events), ["query", "execute", "query"]);
  const executeArgs = await popup.evaluate(() => window.executeArgs);
  assert.deepEqual(executeArgs.target, { tabId: 7, frameIds: [0] });
  assert.deepEqual(executeArgs.args, ["microsoft/vscode"]);
  assert.match(executeArgs.func, /document\.title/);
  assert.equal(await popup.locator("#github-page-repository").textContent(), "microsoft/vscode");
  assert.equal(await popup.locator("#github-page-title").textContent(), "microsoft/vscode: Code");
  assert.equal(await popup.locator("#github-page-heading").textContent(), "microsoft / vscode");
  assert.equal(await popup.locator("#github-page-source").textContent(), "Read-only GitHub page observation");
  assert.match(await popup.locator("#github-page-details").textContent(), /Account access and repository permissions are not verified\./);
  assert.equal((await popup.locator("#tab-observation").textContent()).includes("secret"), false);
  assert.equal(await popup.locator(".progress [aria-current='step']").textContent().then(s => /Customer/.test(s)), true);
  assert.equal(await popup.locator("#plan-status").textContent(), "");
  assert.deepEqual(await popup.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);

  await popup.evaluate(({ selected, result }) => {
    window.events = [];
    window.queries = [[selected], [selected]];
    window.scriptResult = [{ frameId: 0, result }]; // MOCKED injection result
  }, { selected: tab(), result: { ...observed, heading: null } });
  await read.click();
  await state.getByText("Page observed").waitFor();
  assert.equal(await popup.locator("#github-page-heading").textContent(), "Not determined");

  async function caseRead(queries, result, expected, fail = false) {
    await popup.evaluate(({ queries, result, fail }) => {
      window.events = [];
      window.queries = queries;
      window.scriptResult = result;
      window.scriptFailure = fail;
    }, { queries, result, fail });
    await read.click();
    await state.getByText(expected).waitFor();
    assert.equal(await popup.locator("#github-page-details").isHidden(), true);
  }
  await caseRead([[{ ...tab(), id: 8 }]], [{ frameId: 0, result: observed }], "Page changed / reinspection required");
  assert.deepEqual(await popup.evaluate(() => window.events), ["query"]);
  assert.equal(await read.isHidden(), true);
  await popup.evaluate(value => { window.queries = [[value]]; }, tab());
  await inspect.click();
  await caseRead([[tab()], [{ ...tab(), url: "https://github.com/microsoft/other" }]],
    [{ frameId: 0, result: observed }], "Page changed / reinspection required");
  assert.deepEqual(await popup.evaluate(() => window.events), ["query", "execute", "query"]);
  await popup.evaluate(value => { window.queries = [[value]]; }, tab());
  await inspect.click();
  await caseRead([[tab()], [tab()]], [{ frameId: 1, result: observed }], "Read failed");
  await caseRead([[tab()], [tab()]], [{ frameId: 0, result: { ...observed, authorized: true } }], "Read failed");
  await caseRead(["DENIED"], [{ frameId: 0, result: observed }], "Access unavailable");
  assert.equal(await read.isHidden(), true);
  await popup.evaluate(value => { window.queries = [[value]]; }, tab());
  await inspect.click();
  await caseRead([[tab()]], null, "Read failed", true);
  assert.equal((await popup.locator("#tab-observation").textContent()).includes("secret"), false);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  assert.deepEqual(await popup.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
  await popup.reload();
  assert.equal(await read.isHidden(), true);
  assert.equal(await state.textContent(), "Not read");
  console.log("PASS: disposable Chromium popup, MOCKED injection results, scoped scripting and drift denials");
  console.log("LIMITATION: real toolbar invocation, activeTab grant, and live GitHub DOM require user smoke check");
} finally {
  if (context) await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
