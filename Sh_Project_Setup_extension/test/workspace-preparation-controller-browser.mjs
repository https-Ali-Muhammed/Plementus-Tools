import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const extension = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sh-preparation-controller-"));
let context;
let statusProfile;
try {
  context = await chromium.launchPersistentContext(profile, { headless: false,
    args: ["--headless=new", "--disable-background-networking", "--no-first-run",
      `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker", { timeout: 10000 });
  const id = /^chrome-extension:\/\/([^/]+)\//.exec(worker.url())?.[1];
  assert.ok(id);
  await context.route("https://github.com/**", route => route.fulfill({ status: 200,
    contentType: "text/html", body: "Controlled fixture: no live GitHub content." }));
  const workspace = await context.newPage();
  await workspace.goto(`chrome-extension://${id}/src/popup/popup.html?workspace=1`);
  const status = await workspace.evaluate(() => chrome.runtime.sendMessage({ type: "SANDBOX_PREPARATION_STATUS" }));
  assert.deepEqual(status, { ok: true, record: null });
  assert.equal((await workspace.evaluate(() => chrome.runtime.sendMessage({ type: "SANDBOX_PREPARATION_START", customer: "secret" }))).ok, false);
  assert.equal(await workspace.locator("#current-sandbox-preparation").isVisible(), true);
  assert.match(await workspace.locator("#current-sandbox-preparation").textContent(), /No current sandbox preparation/);
  assert.deepEqual(await worker.evaluate(() => chrome.storage.session.get("sandboxPreparation.current.v1")), {});
  await worker.evaluate(() => {
    self.navigationCalls = [];
    chrome.permissions.contains = async () => true;
    chrome.tabs.create = options => {
      self.navigationCalls.push(options);
      return new Promise(resolve => { self.finishNavigation = resolve; });
    };
    chrome.tabs.get = async tabId => ({ id: tabId, windowId: 1, incognito: false,
      status: "complete", url: "https://github.com/fixture-owner/disposable-repo/branches" });
    chrome.scripting.executeScript = async () => [{ frameId: 0, result: false }];
  });
  await workspace.evaluate(() => {
    chrome.permissions.contains = async () => true;
    chrome.permissions.request = () => { throw Error("existing grant must not prompt"); };
    window.sent = [];
    const send = chrome.runtime.sendMessage.bind(chrome.runtime);
    chrome.runtime.sendMessage = message => { window.sent.push(message); return send(message); };
  });
  await workspace.locator("#customer-name").fill("Private customer");
  await workspace.locator("#subscription").selectOption("customer");
  await workspace.locator("#subscription-reference").fill("private-subscription-secret");
  await workspace.locator("#continue").click();
  await workspace.locator("#github-organization").fill("fixture-owner");
  await workspace.locator("#repository-mode").selectOption("existing");
  await workspace.locator("#repository").fill("disposable-repo");
  await workspace.locator("#continue").click();
  await workspace.locator("#production").fill("main");
  await workspace.locator("#staging").fill("plementus-mvp-check");
  await workspace.locator("#continue").click();
  await workspace.locator("#prepare").click();
  await workspace.locator("#workspace-branch-acknowledgment").check();
  await workspace.locator("#workspace-branch-review").click();
  await workspace.locator("#workspace-branch-start").click();
  await workspace.waitForFunction(() => document.querySelector("#current-sandbox-state").textContent.includes("NAVIGATION_PENDING"));
  const sent = await workspace.evaluate(() => window.sent.filter(message => message.type === "SANDBOX_PREPARATION_START"));
  assert.equal(sent.length, 1);
  assert.deepEqual(Object.keys(sent[0]).sort(),
    ["type", "operationId", "repository", "sourceBranch", "newBranch", "acknowledged"].sort());
  assert.equal(JSON.stringify(sent).includes("private-subscription-secret"), false);
  assert.equal(JSON.stringify(sent).includes("Private customer"), false);
  assert.equal(await worker.evaluate(() => self.navigationCalls.length), 1);
  await workspace.close();
  await worker.evaluate(() => self.finishNavigation({ id: 42, url: "https://github.com/fixture-owner/disposable-repo/branches" }));
  const reopened = await context.newPage();
  await reopened.goto(`chrome-extension://${id}/src/popup/popup.html?workspace=1`);
  await reopened.waitForFunction(() => document.querySelector("#current-sandbox-state").textContent.includes("UNSUPPORTED_PAGE"));
  assert.equal(await reopened.locator("#workspace-branch-navigation").isHidden(), true);
  assert.equal(await worker.evaluate(() => self.navigationCalls.length), 1);
  const stored = await worker.evaluate(() => chrome.storage.session.get("sandboxPreparation.current.v1"));
  assert.deepEqual(Object.keys(stored), ["sandboxPreparation.current.v1"]);
  assert.equal(JSON.stringify(stored).includes("private-subscription-secret"), false);
  assert.equal(JSON.stringify(stored).includes("Private customer"), false);
  await worker.evaluate(() => {
    const key = "sandboxPreparation.current.v1";
    const originalSet = chrome.storage.session.set.bind(chrome.storage.session);
    self.checkpointReached = new Promise(resolve => { self.signalCheckpoint = resolve; });
    self.checkpointHeld = false;
    chrome.storage.session.set = value => {
      if (value[key]?.state !== "NAVIGATION_PENDING" || self.checkpointHeld) return originalSet(value);
      self.checkpointHeld = true;
      self.signalCheckpoint();
      return new Promise((resolve, reject) => {
        self.releaseCheckpoint = () => { void originalSet(value).then(resolve, reject); };
      });
    };
    chrome.tabs.create = options => { self.navigationCalls.push(options); return Promise.resolve({ id: 43, url: options.url }); };
  });
  const gated = await reopened.evaluate(() => chrome.runtime.sendMessage({
    type: "SANDBOX_PREPARATION_START", operationId: crypto.randomUUID(),
    repository: "fixture-owner/disposable-repo", sourceBranch: "main",
    newBranch: "plementus-mvp-check", acknowledged: true,
  }));
  assert.equal(gated.ok, true);
  const beforeRelease = await worker.evaluate(async () => {
    await self.checkpointReached;
    const stored = await chrome.storage.session.get("sandboxPreparation.current.v1");
    const result = { state: stored["sandboxPreparation.current.v1"].state, navigationCalls: self.navigationCalls.length };
    self.releaseCheckpoint();
    return result;
  });
  assert.deepEqual(beforeRelease, { state: "ADMITTED", navigationCalls: 1 });
  await reopened.waitForFunction(async operationId => {
    const status = await chrome.runtime.sendMessage({ type: "SANDBOX_PREPARATION_STATUS" });
    return status.record?.operationId === operationId && status.record.state === "UNSUPPORTED_PAGE";
  }, gated.record.operationId);
  assert.equal(await worker.evaluate(() => self.navigationCalls.length), 2);
  await worker.evaluate(() => {
    chrome.tabs.create = options => { self.navigationCalls.push(options); return Promise.resolve({ id: "invalid", url: options.url }); };
  });
  const malformed = await reopened.evaluate(() => chrome.runtime.sendMessage({
    type: "SANDBOX_PREPARATION_START", operationId: crypto.randomUUID(),
    repository: "fixture-owner/disposable-repo", sourceBranch: "main",
    newBranch: "plementus-mvp-check", acknowledged: true,
  }));
  assert.equal(malformed.ok, true);
  await reopened.waitForFunction(async id => {
    const status = await chrome.runtime.sendMessage({ type: "SANDBOX_PREPARATION_STATUS" });
    return status.record?.operationId === id && status.record.state === "NAVIGATION_UNCONFIRMED";
  }, malformed.record.operationId);
  assert.equal(await worker.evaluate(() => self.navigationCalls.length), 3);
  // Mock only status replies to isolate the workspace when storage emits no change event.
  const statusWorkspace = await context.newPage();
  await statusWorkspace.addInitScript(() => {
    const realSetTimeout = window.setTimeout.bind(window);
    window.statusPollCallbacks = [];
    window.setTimeout = (callback, delay, ...args) => {
      if (delay !== 45000) return realSetTimeout(callback, delay, ...args);
      const timer = realSetTimeout(() => {}, 60000);
      window.statusPollCallbacks.push(() => { clearTimeout(timer); callback(...args); });
      return timer;
    };
    const originalSend = chrome.runtime.sendMessage.bind(chrome.runtime);
    window.statusReads = 0;
    window.statusReply = { ok: true, record: { operationId: "123e4567-e89b-42d3-a456-426614174000",
      repository: "fixture-owner/disposable-repo", sourceBranch: "main",
      newBranch: "plementus-mvp-check", state: "ADMITTED" } };
    chrome.runtime.sendMessage = message => {
      if (message?.type !== "SANDBOX_PREPARATION_STATUS") return originalSend(message);
      window.statusReads++;
      return Promise.resolve(window.statusReply);
    };
  });
  await statusWorkspace.goto(`chrome-extension://${id}/src/popup/popup.html?workspace=1`);
  await statusWorkspace.waitForFunction(() => document.querySelector("#current-sandbox-state").textContent.includes("ADMITTED"));
  await statusWorkspace.waitForFunction(() => window.statusPollCallbacks.length === 1);
  await statusWorkspace.evaluate(() => {
    window.statusReply = { ok: false, reason: "SESSION_UNAVAILABLE" };
    window.statusPollCallbacks.shift()();
  });
  await statusWorkspace.waitForFunction(() => /SESSION_UNAVAILABLE|PREPARATION_UNCERTAIN/.test(
    document.querySelector("#current-sandbox-state").textContent), undefined, { timeout: 9000 });
  assert.ok(await statusWorkspace.evaluate(() => window.statusReads >= 2));
  assert.equal(await statusWorkspace.evaluate(() => window.statusPollCallbacks.length), 0);
  assert.equal(await worker.evaluate(() => self.navigationCalls.length), 3);
  await context.close();
  statusProfile = fs.mkdtempSync(path.join(os.tmpdir(), "sh-preparation-status-"));
  context = await chromium.launchPersistentContext(statusProfile, { headless: false,
    args: ["--headless=new", "--disable-background-networking", "--no-first-run",
      `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  const statusWorker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker", { timeout: 10000 });
  const statusId = /^chrome-extension:\/\/([^/]+)\//.exec(statusWorker.url())?.[1];
  assert.ok(statusId);
  await context.route("https://github.com/**", route => route.fulfill({ status: 200,
    contentType: "text/html", body: "Controlled fixture: no live GitHub content." }));
  const initiator = await context.newPage();
  await initiator.goto(`chrome-extension://${statusId}/src/popup/popup.html?workspace=1`);
  await initiator.waitForFunction(() => document.querySelector("#current-sandbox-state").textContent.includes("No current sandbox preparation"));
  await statusWorker.evaluate(() => {
    const key = "sandboxPreparation.current.v1";
    const originalSet = chrome.storage.session.set.bind(chrome.storage.session);
    self.checkpointReached = new Promise(resolve => { self.signalCheckpoint = resolve; });
    self.navigationCalls = 0;
    chrome.permissions.contains = async () => true;
    chrome.tabs.create = async () => { self.navigationCalls++; return { id: 44 }; };
    chrome.storage.session.set = value => {
      if (value[key]?.state !== "NAVIGATION_PENDING") return originalSet(value);
      self.signalCheckpoint();
      return new Promise(() => {});
    };
  });
  const accepted = await initiator.evaluate(() => chrome.runtime.sendMessage({
    type: "SANDBOX_PREPARATION_START", operationId: crypto.randomUUID(),
    repository: "fixture-owner/disposable-repo", sourceBranch: "main",
    newBranch: "plementus-mvp-check", acknowledged: true,
  }));
  assert.equal(accepted.ok, true);
  await statusWorker.evaluate(() => self.checkpointReached);
  assert.equal((await initiator.evaluate(() => chrome.runtime.sendMessage({ type: "SANDBOX_PREPARATION_STATUS" }))).reason,
    "SESSION_UNAVAILABLE");
  await initiator.close();
  const observing = await context.newPage();
  await observing.goto(`chrome-extension://${statusId}/src/popup/popup.html?workspace=1`);
  await observing.waitForFunction(() => document.querySelector("#current-sandbox-state").textContent.includes("SESSION_UNAVAILABLE"),
    undefined, { timeout: 5000 });
  assert.equal((await statusWorker.evaluate(() => chrome.storage.session.get("sandboxPreparation.current.v1")))
    ["sandboxPreparation.current.v1"].state, "ADMITTED");
  assert.equal(await statusWorker.evaluate(() => self.navigationCalls), 0);
  console.log("PASS: real Chromium worker messaging/storage timeout without change event; mocked provider APIs; workspace closure/reopen without replay");
} finally {
  if (context) await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
  if (statusProfile) fs.rmSync(statusProfile, { recursive: true, force: true });
}
