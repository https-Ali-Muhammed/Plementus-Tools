# Phase 03.02: Project and subscription validation

**Status: READY_FOR_REVIEW.** Recorded 2026-10-28 (Africa/Cairo). Progress: **3/20 master phases; 11/72 micro-phases accepted.** Evidence tier: **LOCAL_BROWSER_TESTED**.

## Scope

Enabled only the customer/project name, subscription type, and subscription-reference fields. The supported modes are Customer Subscription and Partner Trial. Text is trimmed on blur; blank or whitespace-only values are rejected. Project names are limited to 100 characters and subscription references to 160 characters. The reference is masked and errors use fixed text only.

The popup module keeps values only while its document is open. It has no storage, logging, network call, provider access, or inline JavaScript. GitHub, Utilities, environment, review, and action controls remain disabled.

## Approved preserved modification

The owner authorized preserving `docs/Phases/PHASE_02.md` outside this phase. Pre-task SHA-256: `f0e89c0419bb72cfdb21aebbcebf3983ca0375e75f54c54c6c70a7d56e5de473`.

Its pre-task diff changes only Phase 02 status from `IN_PROGRESS` to `ACCEPTED`, progress from `2/20; 9/72` to `3/20; 10/72`, 02.03 from `READY_FOR_REVIEW` to `ACCEPTED`, and its closing scope sentence. It contains no subscription or credential value and does not conflict with 03.02. It is excluded from this phase and was not edited, staged, or restored.

## Executed validation

From the repository root:

```sh
node --test Sh_Project_Setup_extension/test/popup-validation.test.mjs
```

**PASS:** Node `v24.19.0` ran four tests for empty values, whitespace-only values, valid Customer Subscription and Partner Trial values, and invalid/overlong values. Error text never includes the reference.

```sh
node --check Sh_Project_Setup_extension/src/popup/popup.js
node --check Sh_Project_Setup_extension/src/popup/validation.mjs
git diff -- Sh_Project_Setup_extension/manifest.json
rg -n 'console\.|fetch\(|XMLHttpRequest|chrome\.storage|localStorage|sessionStorage' Sh_Project_Setup_extension/src/popup Sh_Project_Setup_extension/test || true
```

**PASS:** Both modules parsed, the manifest had no delta, and the scan returned no storage, logging, or network APIs.

```sh
node --input-type=module --eval 'import {chromium} from "playwright"; import fs from "node:fs"; import os from "node:os"; import path from "node:path"; const extension=path.resolve("Sh_Project_Setup_extension"); const profile=fs.mkdtempSync(path.join(os.tmpdir(),"sh-project-setup-03-02-")); let context; try { context=await chromium.launchPersistentContext(profile,{headless:false,args:["--headless=new","--disable-extensions-except="+extension,"--load-extension="+extension]}); let worker=context.serviceWorkers()[0]; if(!worker) worker=await context.waitForEvent("serviceworker",{timeout:10000}); const id=/^chrome-extension:\/\/([^/]+)\//.exec(worker.url())?.[1]; if(!id) throw new Error("extension worker did not expose an ID"); const manifest=await worker.evaluate(()=>chrome.runtime.getManifest()); if("permissions" in manifest||"host_permissions" in manifest) throw new Error("permissions changed"); const page=await context.newPage(); const pageErrors=[]; const consoleMessages=[]; const requests=[]; page.on("pageerror",error=>pageErrors.push(error.message)); page.on("console",message=>consoleMessages.push(message.text())); page.on("request",request=>requests.push(request.url())); await page.goto("chrome-extension://"+id+"/src/popup/popup.html",{waitUntil:"load"}); for(const selector of ["#customer-name","#subscription","#subscription-reference"]){await page.locator(selector).focus(); await page.locator(selector).blur();} const invalid=await page.evaluate(()=>({errors:["#customer-name-error","#subscription-error","#subscription-reference-error"].map(selector=>{const node=document.querySelector(selector); return {text:node.textContent,hidden:node.hidden,role:node.getAttribute("role")};}),invalid:["#customer-name","#subscription","#subscription-reference"].every(selector=>document.querySelector(selector).getAttribute("aria-invalid")===""),disabledFuture:["#repository","#utilities","#production","#staging","#modules","button"].every(selector=>[...document.querySelectorAll(selector)].every(node=>node.disabled))})); if(invalid.errors.some(error=>error.hidden||error.role!=="alert")||!invalid.invalid||!invalid.disabledFuture) throw new Error("invalid state did not render accessibly"); const reference="x".repeat(20); await page.locator("#customer-name").fill("  Customer Project  "); await page.locator("#customer-name").blur(); await page.locator("#subscription").selectOption("partner-trial"); await page.locator("#subscription-reference").fill("  "+reference+"  "); await page.locator("#subscription-reference").blur(); const valid=await page.evaluate(()=>({errors:["#customer-name-error","#subscription-error","#subscription-reference-error"].map(selector=>document.querySelector(selector).hidden),invalid:["#customer-name","#subscription","#subscription-reference"].map(selector=>document.querySelector(selector).hasAttribute("aria-invalid")),projectName:document.querySelector("#customer-name").value,referenceLength:document.querySelector("#subscription-reference").value.length})); if(valid.errors.some(hidden=>!hidden)||valid.invalid.some(Boolean)||valid.projectName!=="Customer Project"||valid.referenceLength!==20||pageErrors.length||consoleMessages.length||requests.some(url=>!url.startsWith("chrome-extension://"))) throw new Error(JSON.stringify({valid,pageErrors,consoleMessages,requests})); const browser=await(await context.newCDPSession(page)).send("Browser.getVersion"); console.log(JSON.stringify({result:"PASS",browser:browser.product,permissions:manifest.permissions??[],host_permissions:manifest.host_permissions??[],popupErrors:invalid.errors.map(error=>error.text),valid:{projectNameTrimmed:true,referenceTrimmed:true},pageErrors:pageErrors.length,consoleMessages:consoleMessages.length,networkRequests:requests.filter(url=>!url.startsWith("chrome-extension://")).length},null,2)); } finally { if(context) await context.close(); fs.rmSync(profile,{recursive:true,force:true}); }'
```

**LOCAL_BROWSER_TESTED / PASS:** Chrome for Testing `151.0.7922.34` showed the three generic errors with `role="alert"`, accepted Partner Trial, trimmed valid text, retained disabled future controls/actions, logged no console or page error, issued zero non-extension requests, and retained empty permission arrays. The command uses a generated test value and never prints it.

## Postflight

`PHASE_02.md` SHA-256 remains `f0e89c0419bb72cfdb21aebbcebf3983ca0375e75f54c54c6c70a7d56e5de473`; its Git diff remains identical to the approved pre-task diff above. `git diff --check` passed, all 32 local Markdown files had resolving local links, and `git diff --exit-code -- docs/01_MASTER_PLAN.md docs/_source` passed. The only pre-existing modification is the preserved Phase 02 reconciliation; all other changed and untracked paths are 03.02 implementation, tests, and documentation.

## Limits and stop point

Functional navigation, storage, workflow coordination, GitHub/Utilities validation, provider integration, and provider tests are **NOT RUN / out of scope**. No claim of provider or Production behavior follows from local popup validation.

**STOP for ChatGPT acceptance of Phase 03.02.** Do not start 03.03 without a later scoped request.
