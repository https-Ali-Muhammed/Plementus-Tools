import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const extension = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sh-sandbox-branch-"));
const destination = "https://github.com/fixture-owner/disposable-repo/branches";
let context;
try {
  context = await chromium.launchPersistentContext(profile, { headless: false,
    args: ["--headless=new", "--disable-background-networking", "--no-first-run",
      `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker", { timeout: 10000 });
  const id = /^chrome-extension:\/\/([^/]+)\//.exec(worker.url())?.[1];
  assert.ok(id);
  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
  assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "storage"]);
  assert.equal("host_permissions" in manifest, false);
  const fixture = await context.newPage();
  let fixtureBody = `<!doctype html><title>Local branch form fixture</title><dialog open aria-label="New branch">
      <h2>New branch</h2><label for="branch-name">New branch name</label><input id="branch-name" type="text">
      <label for="source-branch">Source branch</label><select id="source-branch"><option selected>main</option><option>develop</option></select>
      <button type="button" id="final-create">Create branch</button></dialog>
      <script>window.submissions=0; document.querySelector('#final-create').onclick=()=>window.submissions++;</script>`;
  await fixture.route("https://github.com/**", route => route.fulfill({ status: 200, contentType: "text/html",
    body: fixtureBody }));
  await fixture.goto(destination);
  const popup = await context.newPage();
  const errors = [];
  popup.on("pageerror", error => errors.push(error.message));
  await popup.exposeBinding("fixtureExecute", async (_source, func, args) => [{ frameId: 0,
    result: await fixture.evaluate(({ func, args }) => (0, eval)(`(${func})`)(...args), { func, args }) }]);
  await popup.goto(`chrome-extension://${id}/src/popup/popup.html`);
  const state = popup.locator("#sandbox-branch-state");
  assert.equal(await state.textContent(), "NOT_CONFIGURED");
  await popup.locator("#sandbox-repository").fill("fixture-owner/disposable-repo");
  await popup.locator("#sandbox-source").fill("main");
  await popup.locator("#sandbox-new-branch").fill("plementus-mvp-check-1");
  await popup.locator("#sandbox-acknowledgment").check();
  await popup.locator("#sandbox-preview-button").click();
  assert.equal(await state.textContent(), "PREVIEW_READY");
  assert.match(await popup.locator("#sandbox-preview").textContent(), /fixture-owner\/disposable-repo.*main.*plementus-mvp-check-1/s);
  assert.equal(await popup.locator("#sandbox-destination").textContent(), destination);
  assert.equal(await popup.locator("#sandbox-open-button").isEnabled(), true);
  await popup.locator("#sandbox-new-branch").fill("plementus-mvp-changed");
  assert.equal(await state.textContent(), "NOT_CONFIGURED");
  assert.equal(await popup.locator("#sandbox-open-button").isDisabled(), true);
  await popup.locator("#sandbox-new-branch").fill("plementus-mvp-check-1");
  await popup.locator("#sandbox-preview-button").click();
  await popup.evaluate(() => {
    window.opened = [];
    chrome.tabs.create = async options => { window.opened.push(options.url); return { id: 9 }; };
  });
  await popup.locator("#sandbox-open-button").click();
  assert.equal(await state.textContent(), "NATIVE_PAGE_OPENED");
  assert.deepEqual(await popup.evaluate(() => window.opened), [destination]);
  assert.match(await popup.locator("#sandbox-instructions").textContent(), /invoke the extension again/i);
  await popup.reload();
  assert.equal(await state.textContent(), "NOT_CONFIGURED");
  assert.equal(await popup.locator("#sandbox-acknowledgment").isChecked(), false);

  async function preview() {
    await popup.locator("#sandbox-repository").fill("fixture-owner/disposable-repo");
    await popup.locator("#sandbox-source").fill("main");
    await popup.locator("#sandbox-new-branch").fill("plementus-mvp-check-1");
    await popup.locator("#sandbox-acknowledgment").check();
    await popup.locator("#sandbox-preview-button").click();
  }
  await preview();
  await popup.evaluate(() => {
    window.activeUrl = "https://github.com.evil.test/fixture-owner/disposable-repo/branches";
    window.injections = 0;
    chrome.tabs.query = async () => [({ id: 7, windowId: 2, active: true, incognito: false,
      status: "complete", url: window.activeUrl })];
    chrome.scripting.executeScript = async options => {
      window.injections++;
      return window.fixtureExecute(options.func.toString(), options.args);
    };
  });
  await popup.locator("#sandbox-prepare-button").click();
  assert.equal(await state.textContent(), "UNSUPPORTED_PAGE");
  assert.equal(await popup.evaluate(() => window.injections), 0);
  await popup.evaluate(url => { window.activeUrl = url; }, destination);
  await fixture.evaluate(() => history.replaceState(null, "", "/fixture-owner/other/branches"));
  await popup.locator("#sandbox-prepare-button").click();
  await popup.waitForFunction(() => window.injections === 1);
  await state.getByText("UNSUPPORTED_PAGE").waitFor();
  assert.equal(await fixture.locator("input").inputValue(), "");
  await fixture.evaluate(() => history.replaceState(null, "", "/fixture-owner/disposable-repo/branches"));
  await fixture.locator("dialog").evaluate(dialog => { dialog.removeAttribute("open"); });
  await popup.locator("#sandbox-prepare-button").click();
  await state.getByText("MANUAL_ACTION_REQUIRED").waitFor();
  assert.equal(await fixture.locator("input").inputValue(), "");
  await fixture.locator("dialog").evaluate(dialog => { dialog.setAttribute("open", ""); });
  await fixture.locator("select").selectOption("develop");
  await popup.locator("#sandbox-prepare-button").click();
  await state.getByText("MANUAL_ACTION_REQUIRED").waitFor();
  await fixture.locator("select").selectOption("main");
  await fixture.evaluate(() => document.body.append(document.querySelector("dialog").cloneNode(true)));
  await popup.locator("#sandbox-prepare-button").click();
  await state.getByText("MANUAL_ACTION_REQUIRED").waitFor();
  await fixture.locator("dialog").last().evaluate(dialog => dialog.remove());
  await popup.locator("#sandbox-prepare-button").click();
  await state.getByText("FORM_PREPARED").waitFor();
  assert.equal(await fixture.locator("input").inputValue(), "plementus-mvp-check-1");
  assert.equal(await fixture.evaluate(() => window.submissions), 0);
  assert.match(await popup.locator("#sandbox-instructions").textContent(), /does not mean the branch exists/i);
  async function prepareExpect(expected) {
    const before = await popup.evaluate(() => window.injections);
    await popup.locator("#sandbox-prepare-button").click();
    await popup.waitForFunction(before => window.injections === before + 1 &&
      !document.querySelector("#sandbox-prepare-button").disabled, before);
    assert.equal(await state.textContent(), expected);
  }
  await fixture.evaluate(() => {
    const name = document.querySelector("#branch-name");
    name.value = "";
    window.nameEvents = 0;
    name.addEventListener("input", () => window.nameEvents++);
    document.body.append(name); // Label remains inside the recognized dialog.
  });
  await prepareExpect("MANUAL_ACTION_REQUIRED");
  assert.deepEqual(await fixture.evaluate(() => ({ value: document.querySelector("#branch-name").value,
    events: window.nameEvents })), { value: "", events: 0 });
  await fixture.evaluate(() => document.querySelector("dialog").append(document.querySelector("#branch-name")));
  await fixture.evaluate(() => {
    const fieldset = document.createElement("fieldset");
    fieldset.disabled = true;
    const name = document.querySelector("#branch-name");
    name.replaceWith(fieldset);
    fieldset.append(name);
  });
  assert.equal(await fixture.locator("#branch-name").evaluate(input => input.disabled), false);
  await prepareExpect("MANUAL_ACTION_REQUIRED");
  assert.deepEqual(await fixture.evaluate(() => ({ value: document.querySelector("#branch-name").value,
    events: window.nameEvents })), { value: "", events: 0 });
  await fixture.evaluate(() => document.querySelector("fieldset").replaceWith(document.querySelector("#branch-name")));
  await fixture.evaluate(() => {
    const fieldset = document.createElement("fieldset");
    fieldset.disabled = true;
    const source = document.querySelector("#source-branch");
    source.replaceWith(fieldset);
    fieldset.append(source);
  });
  await prepareExpect("MANUAL_ACTION_REQUIRED");
  assert.equal(await fixture.locator("#branch-name").inputValue(), "");
  await fixture.evaluate(() => document.querySelector("fieldset").replaceWith(document.querySelector("#source-branch")));
  await fixture.evaluate(() => {
    const name = document.querySelector("#branch-name");
    window.clearBranch = () => { name.value = ""; };
    name.addEventListener("input", window.clearBranch);
  });
  await prepareExpect("MANUAL_ACTION_REQUIRED");
  assert.equal(await fixture.locator("#branch-name").inputValue(), "");
  await fixture.evaluate(() => {
    const name = document.querySelector("#branch-name");
    name.removeEventListener("input", window.clearBranch);
    window.replaceBranch = () => { window.originalBranch = name; name.replaceWith(name.cloneNode()); };
    name.addEventListener("input", window.replaceBranch);
  });
  await prepareExpect("MANUAL_ACTION_REQUIRED");
  await fixture.evaluate(() => {
    window.originalBranch.removeEventListener("input", window.replaceBranch);
    window.originalBranch.value = "";
    document.querySelector("#branch-name").replaceWith(window.originalBranch);
    window.changeSource = () => { document.querySelector("#source-branch").value = "develop"; };
    window.originalBranch.addEventListener("input", window.changeSource);
  });
  await prepareExpect("MANUAL_ACTION_REQUIRED");
  await fixture.evaluate(() => {
    const name = document.querySelector("#branch-name");
    name.removeEventListener("input", window.changeSource);
    name.value = "";
    document.querySelector("#source-branch").value = "main";
    window.changePage = () => history.replaceState(null, "", "/fixture-owner/other/branches");
    name.addEventListener("input", window.changePage);
  });
  await prepareExpect("UNSUPPORTED_PAGE");
  await fixture.evaluate(() => {
    const name = document.querySelector("#branch-name");
    name.removeEventListener("input", window.changePage);
    name.value = "";
    history.replaceState(null, "", "/fixture-owner/disposable-repo/branches");
  });
  await popup.reload();
  await preview();
  await popup.evaluate(() => {
    window.queryCalls = 0;
    window.injections = 0;
    chrome.tabs.query = () => {
      window.queryCalls++;
      return new Promise(resolve => { window.releaseSandboxQuery = resolve; });
    };
    chrome.scripting.executeScript = async () => { window.injections++; return []; };
  });
  await popup.locator("#sandbox-prepare-button").click();
  await popup.waitForFunction(() => typeof window.releaseSandboxQuery === "function", null, { timeout: 5000 });
  for (const selector of ["#sandbox-repository", "#sandbox-source", "#sandbox-new-branch",
    "#sandbox-acknowledgment", "#sandbox-preview-button", "#sandbox-open-button", "#sandbox-prepare-button"]) {
    assert.equal(await popup.locator(selector).isDisabled(), true, selector);
  }
  await popup.evaluate(() => {
    const field = document.querySelector("#sandbox-new-branch");
    field.value = "plementus-mvp-changed";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    window.releaseSandboxQuery([{ id: 7, windowId: 2, active: true, incognito: false,
      status: "complete", url: "https://github.com/fixture-owner/disposable-repo/branches" }]);
  });
  await popup.waitForFunction(() => !document.querySelector("#sandbox-repository").disabled, null, { timeout: 5000 });
  assert.equal(await state.textContent(), "NOT_CONFIGURED");
  assert.equal(await popup.evaluate(() => window.injections), 0);
  assert.equal(await popup.locator("#sandbox-open-button").isDisabled(), true);
  assert.equal(await popup.locator("#sandbox-prepare-button").isDisabled(), true);

  await popup.reload();
  await preview();
  await popup.evaluate(() => {
    window.queryCalls = 0;
    window.injections = 0;
    chrome.tabs.query = async () => {
      window.queryCalls++;
      return [{ id: 7, windowId: 2, active: true, incognito: false,
        status: "complete", url: "https://github.com/fixture-owner/disposable-repo/branches" }];
    };
    chrome.scripting.executeScript = () => {
      window.injections++;
      return new Promise(resolve => { window.releaseSandboxInjection = resolve; });
    };
  });
  await popup.locator("#sandbox-prepare-button").click();
  await popup.waitForFunction(() => typeof window.releaseSandboxInjection === "function", null, { timeout: 5000 });
  assert.equal(await popup.locator("#sandbox-acknowledgment").isDisabled(), true);
  await popup.evaluate(() => {
    document.querySelector("#sandbox-prepare-button").dispatchEvent(new Event("click"));
    document.querySelector("#sandbox-open-button").dispatchEvent(new Event("click"));
    document.querySelector("#sandbox-preview-button").dispatchEvent(new Event("click"));
  });
  assert.deepEqual(await popup.evaluate(() => [window.queryCalls, window.injections]), [1, 1]);
  await popup.evaluate(() => {
    const acknowledgment = document.querySelector("#sandbox-acknowledgment");
    acknowledgment.checked = false;
    acknowledgment.dispatchEvent(new Event("change", { bubbles: true }));
    window.releaseSandboxInjection([{ frameId: 0, result: "FORM_PREPARED" }]); // MOCKED result
  });
  await popup.waitForFunction(() => !document.querySelector("#sandbox-repository").disabled, null, { timeout: 5000 });
  assert.equal(await state.textContent(), "NOT_CONFIGURED");
  assert.deepEqual(await popup.evaluate(() => [window.queryCalls, window.injections]), [1, 1]);
  assert.equal(await popup.locator("#sandbox-open-button").isDisabled(), true);
  assert.equal(await popup.locator("#sandbox-prepare-button").isDisabled(), true);

  await popup.reload();
  await preview();
  await popup.evaluate(() => {
    window.navigationCalls = 0;
    chrome.tabs.create = async () => { window.navigationCalls++; throw Error("mocked navigation denial"); };
  });
  await popup.locator("#sandbox-open-button").click();
  await state.getByText("FAILED").waitFor();
  assert.equal(await popup.locator("#sandbox-repository").isEnabled(), true);
  assert.equal(await popup.locator("#sandbox-acknowledgment").isEnabled(), true);
  assert.equal(await popup.locator("#sandbox-preview-button").isEnabled(), true);
  assert.equal(await popup.locator("#sandbox-open-button").isEnabled(), true);
  assert.equal(await popup.locator("#sandbox-prepare-button").isEnabled(), true);
  assert.equal(await popup.evaluate(() => window.navigationCalls), 1);

  await popup.evaluate(() => {
    chrome.tabs.create = () => {
      window.navigationCalls++;
      return new Promise(resolve => { window.releaseSandboxNavigation = resolve; });
    };
  });
  await popup.locator("#sandbox-open-button").click();
  await popup.waitForFunction(() => typeof window.releaseSandboxNavigation === "function", null, { timeout: 5000 });
  assert.equal(await popup.locator("#sandbox-source").isDisabled(), true);
  await popup.evaluate(() => {
    document.querySelector("#sandbox-open-button").dispatchEvent(new Event("click"));
    document.querySelector("#sandbox-prepare-button").dispatchEvent(new Event("click"));
    const field = document.querySelector("#sandbox-repository");
    field.value = "fixture-owner/other-repo";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    window.releaseSandboxNavigation({ id: 9 });
  });
  await popup.waitForFunction(() => !document.querySelector("#sandbox-source").disabled, null, { timeout: 5000 });
  assert.equal(await popup.evaluate(() => window.navigationCalls), 2);
  assert.equal(await state.textContent(), "NOT_CONFIGURED");
  assert.equal(await popup.locator("#sandbox-open-button").isDisabled(), true);
  assert.equal(await popup.locator("#sandbox-prepare-button").isDisabled(), true);

  await popup.reload();
  await preview();
  await popup.evaluate(() => {
    chrome.tabs.query = async () => [{ id: 7, windowId: 2, active: true, incognito: false,
      status: "complete", url: "https://github.com/fixture-owner/disposable-repo/branches" }];
    chrome.scripting.executeScript = async () => { throw Error("mocked injection denial"); };
  });
  await popup.locator("#sandbox-prepare-button").click();
  await state.getByText("FAILED").waitFor();
  assert.equal(await popup.locator("#sandbox-repository").isEnabled(), true);
  assert.equal(await popup.locator("#sandbox-preview-button").isEnabled(), true);
  assert.equal(await popup.locator("#sandbox-open-button").isEnabled(), true);
  assert.equal(await popup.locator("#sandbox-prepare-button").isEnabled(), true);
  const observedBody = `<!doctype html><title>Observed branch form fixture</title>
    <div role="dialog" aria-modal="true"><h2>Create a branch</h2>
    <label for="_r_14_">New branch name</label><input type="text" id="_r_14_">
    <label for="_r_1d_">Source</label>
    <button type="button" id="ref-picker-_r_1f_" aria-haspopup="true" aria-label="main branch">main</button>
    <button type="button">Cancel</button><button type="button">Create new branch</button></div>`;
  fixtureBody = observedBody;
  await fixture.reload();
  await popup.reload();
  await preview();
  await popup.evaluate(() => {
    window.injections = 0;
    chrome.tabs.query = async () => [{ id: 7, windowId: 2, active: true, incognito: false,
      status: "complete", url: "https://github.com/fixture-owner/disposable-repo/branches" }];
    chrome.scripting.executeScript = async options => {
      window.injections++;
      return window.fixtureExecute(options.func.toString(), options.args);
    };
  });
  await fixture.evaluate(() => {
    window.actions = [];
    for (const button of document.querySelectorAll("button")) {
      button.addEventListener("click", () => window.actions.push(button.textContent));
    }
    document.querySelector("input").addEventListener("input", () => window.actions.push("input"));
  });
  await prepareExpect("FORM_PREPARED");
  assert.equal(await fixture.locator("#_r_14_").inputValue(), "plementus-mvp-check-1");
  assert.deepEqual(await fixture.evaluate(() => window.actions), ["input"]);
  async function observedCase(change, expected = "MANUAL_ACTION_REQUIRED", value = "") {
    await fixture.reload();
    await fixture.evaluate(change);
    await prepareExpect(expected);
    assert.equal(await fixture.locator("input").inputValue(), value);
  }
  await observedCase(() => {
    const input = document.querySelector("input");
    input.id = "_r_222_";
    document.querySelector('label[for="_r_14_"]').htmlFor = input.id;
    document.querySelector('label[for="_r_1d_"]').htmlFor = "_r_333_";
    document.querySelector('button[id^="ref-picker-"]').id = "ref-picker-_r_444_";
  }, "FORM_PREPARED", "plementus-mvp-check-1");
  await observedCase(() => { document.querySelector('button[id^="ref-picker-"]').textContent = "main-old"; });
  await observedCase(() => { document.querySelector('button[id^="ref-picker-"]').setAttribute("aria-label", "main-old branch"); });
  await observedCase(() => { document.querySelector('button[id^="ref-picker-"]').setAttribute("aria-label", "main tag"); });
  await observedCase(() => { document.querySelector('button[id^="ref-picker-"]').remove(); });
  await observedCase(() => {
    const picker = document.querySelector('button[id^="ref-picker-"]');
    const duplicate = picker.cloneNode(true);
    duplicate.id = "ref-picker-_r_555_";
    picker.after(duplicate);
  });
  await observedCase(() => document.body.append(document.querySelector('button[id^="ref-picker-"]')));
  await observedCase(() => { document.querySelector('button[id^="ref-picker-"]').disabled = true; });
  await observedCase(() => { document.querySelector('button[id^="ref-picker-"]').setAttribute("inert", ""); });
  await observedCase(() => { document.querySelector('button[id^="ref-picker-"]').type = "submit"; });
  await observedCase(() => { document.querySelector('button[id^="ref-picker-"]').setAttribute("aria-haspopup", "listbox"); });
  await observedCase(() => { document.querySelector('label[for="_r_1d_"]').remove(); });
  await observedCase(() => { document.querySelector("input").value = "already-entered"; }, "MANUAL_ACTION_REQUIRED", "already-entered");
  await observedCase(() => {
    document.querySelector("input").addEventListener("input", () => {
      document.querySelector('button[id^="ref-picker-"]').textContent = "develop";
    });
  }, "MANUAL_ACTION_REQUIRED", "plementus-mvp-check-1");
  await observedCase(() => {
    document.querySelector("input").addEventListener("input", () => {
      document.querySelector('button[id^="ref-picker-"]').setAttribute("aria-label", "develop branch");
    });
  }, "MANUAL_ACTION_REQUIRED", "plementus-mvp-check-1");
  await observedCase(() => {
    document.querySelector("input").addEventListener("input", () => {
      document.querySelector("h2").textContent = "New branch";
    });
  }, "MANUAL_ACTION_REQUIRED", "plementus-mvp-check-1");
  await observedCase(() => {
    document.querySelector("input").oninput = () => {
      document.querySelector("input").type = "password";
    };
  }, "MANUAL_ACTION_REQUIRED", "plementus-mvp-check-1");
  await observedCase(() => {
    document.querySelector("input").oninput = () => {
      document.querySelector("h2").insertAdjacentHTML("afterend", "<h2>New branch</h2>");
    };
  }, "MANUAL_ACTION_REQUIRED", "plementus-mvp-check-1");
  await observedCase(() => {
    document.querySelector("input").addEventListener("input", () => {
      const picker = document.querySelector('button[id^="ref-picker-"]');
      picker.replaceWith(picker.cloneNode(true));
    });
  }, "MANUAL_ACTION_REQUIRED", "plementus-mvp-check-1");
  await observedCase(() => {
    document.querySelector("input").addEventListener("input", () => {
      const input = document.querySelector("input");
      input.replaceWith(input.cloneNode(true));
    });
  }, "MANUAL_ACTION_REQUIRED", "plementus-mvp-check-1");
  await observedCase(() => {
    document.querySelector("input").addEventListener("input", () => {
      history.replaceState(null, "", "/fixture-owner/other/branches");
    });
  }, "UNSUPPORTED_PAGE", "plementus-mvp-check-1");
  assert.deepEqual(errors, []);
  assert.deepEqual(await popup.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
  console.log("PASS: local intercepted GitHub DOM fixture; preview, exact navigation, denials and form preparation");
  console.log("LIMITATION: actual GitHub dialog, activeTab toolbar grant and provider write were not tested");
} finally {
  if (context) await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
