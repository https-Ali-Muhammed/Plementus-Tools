# Phase 03.01: Basic customer setup wizard layout

**Status: READY_FOR_REVIEW.** Recorded 2026-10-28 (Africa/Cairo). Progress: **3/20 master phases; 10/72 micro-phases accepted.** Evidence tier: **LOCAL_BROWSER_TESTED**.

## Scope and implementation

Replaced the simple popup body with a vanilla HTML/CSS “Set Up New Customer” wizard preview. It provides an accessible page heading, labelled progress navigation, and four labelled sections: customer/project/subscription; GitHub repository/Utilities; Production/Staging/modules/domains; and review/confirmation. All inputs, selection, and actions are disabled, and the popup states that provisioning is not functional.

The CSS gives the Chrome-constrained popup a bounded width/height and normal document scrolling. No JavaScript was added. The layout has no enabled data entry, validation, navigation, storage, transmission, API call, GitHub connection, provider automation, package, or permission change.

## Preflight

Git root: `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`; origin fetch/push: `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`; branch/upstream: `feature/sh-project-setup-extension-clean` / `origin/feature/sh-project-setup-extension-clean`; entry HEAD: `82d40963ed777a03a8fa1b30bdb2c1258d8e2240`. The full worktree was clean before this scoped change. `d192c67` is an ancestor of entry HEAD.

## Validation

The following commands were run during this evidence-repair turn against the current source. They are new verification and make no claim about the exact commands used in the earlier 03.01 turn.

### Static popup and manifest assertions

From the repository root:

```sh
node --input-type=module --eval 'import fs from "node:fs"; const root="Sh_Project_Setup_extension"; const html=fs.readFileSync(root+"/src/popup/popup.html","utf8"); const manifest=JSON.parse(fs.readFileSync(root+"/manifest.json","utf8")); const required=["Set Up New Customer","Customer, project and subscription","GitHub repository and Utilities","Production, Staging, modules and domains","Review and confirmation"]; for(const text of required) if(!html.includes(text)) throw new Error("missing required text: "+text); const inputs=[...html.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"[^>]*\bdisabled(?:\s|>)/g)].map(match=>match[1]); if(inputs.length!==7) throw new Error("expected 7 disabled controls, got "+inputs.length); for(const id of inputs) if(!new RegExp("<label\\b[^>]*\\bfor=\""+id+"\"").test(html)) throw new Error("missing label for "+id); if((html.match(/<button\b[^>]*\bdisabled(?:\s|>)/g)||[]).length!==2) throw new Error("expected 2 disabled buttons"); if(!html.includes("aria-label=\"Setup progress\"")||!html.includes("provisioning is not yet functional")) throw new Error("missing progress label or preview notice"); if(!html.includes("href=\"popup.css\"")||/https?:\/\//.test(html)) throw new Error("popup references must be local"); if("permissions" in manifest||"host_permissions" in manifest) throw new Error("manifest permissions changed"); console.log(JSON.stringify({result:"PASS",requiredText:required.length,disabledControls:inputs.length,disabledButtons:2,localStylesheet:true,permissions:manifest.permissions??[],host_permissions:manifest.host_permissions??[]},null,2));'
```

**Actual result: PASS.** Output reported five required text entries, seven disabled input/select controls with matching labels, two disabled buttons, a local stylesheet, and empty `permissions` and `host_permissions` arrays.

### Isolated Chrome/Playwright popup smoke test

From the repository root, with the already installed `playwright` module resolvable by Node and its existing Chrome for Testing browser:

```sh
node --input-type=module --eval 'import {chromium} from "playwright"; import fs from "node:fs"; import os from "node:os"; import path from "node:path"; const extension=path.resolve("Sh_Project_Setup_extension"); const profile=fs.mkdtempSync(path.join(os.tmpdir(),"sh-project-setup-03-01-")); let context; try { context=await chromium.launchPersistentContext(profile,{headless:false,args:["--headless=new","--disable-extensions-except="+extension,"--load-extension="+extension]}); let worker=context.serviceWorkers()[0]; if(!worker) worker=await context.waitForEvent("serviceworker",{timeout:10000}); const id=/^chrome-extension:\/\/([^/]+)\//.exec(worker.url())?.[1]; if(!id) throw new Error("extension worker did not expose extension ID: "+worker.url()); const runtimeManifest=await worker.evaluate(()=>chrome.runtime.getManifest()); if("permissions" in runtimeManifest||"host_permissions" in runtimeManifest) throw new Error("extension permissions are present"); const page=await context.newPage(); const pageErrors=[]; page.on("pageerror",error=>pageErrors.push(error.message)); await page.goto("chrome-extension://"+id+"/src/popup/popup.html",{waitUntil:"load"}); const popup=await page.evaluate(()=>({title:document.title,heading:document.querySelector("h1")?.textContent,sections:[...document.querySelectorAll("section h2")].map(node=>node.textContent),labels:[...document.querySelectorAll("label")].map(label=>({for:label.htmlFor,exists:!!document.getElementById(label.htmlFor)})),disabledControls:[...document.querySelectorAll("input,select")].every(control=>control.disabled),disabledActions:[...document.querySelectorAll("button")].every(button=>button.disabled),progressLabel:document.querySelector("nav")?.getAttribute("aria-label"),notice:document.body.textContent.includes("provisioning is not yet functional"),stylesheet:document.querySelector("link[rel=stylesheet]")?.getAttribute("href"),scroll:getComputedStyle(document.body).overflowY})); if(popup.title!=="Set Up New Customer"||popup.heading!=="Set Up New Customer"||popup.sections.length!==4||popup.labels.some(label=>!label.exists)||!popup.disabledControls||!popup.disabledActions||popup.progressLabel!=="Setup progress"||!popup.notice||popup.stylesheet!=="popup.css"||pageErrors.length) throw new Error(JSON.stringify({popup,pageErrors})); const browser=await(await context.newCDPSession(page)).send("Browser.getVersion"); console.log(JSON.stringify({result:"PASS",browser:browser.product,worker:worker.url(),permissions:runtimeManifest.permissions??[],host_permissions:runtimeManifest.host_permissions??[],popup,pageErrors},null,2)); } finally { if(context) await context.close(); fs.rmSync(profile,{recursive:true,force:true}); }'
```

**Actual result: LOCAL_BROWSER_TESTED / PASS.** Chrome for Testing `151.0.7922.34` registered the MV3 worker, opened the local popup, verified the title, all four section headings, all seven label targets, disabled form controls and actions, progress label, preview notice, local stylesheet, and automatic scrolling; `pageErrors` was empty and permissions were empty. The command creates a fresh temporary profile and removes it in `finally`. This tests local rendering only; it does not exercise wizard behavior or a provider.

No provider, account, credential, real browser profile, customer data, or external page was accessed. Permissions remain `[]`; host permissions remain `[]`. Unit, integration, fixture, validation, persistence, workflow, GitHub sandbox, real Odoo.sh, and real Plementus tests remain **NOT RUN**.

## Acceptance and stop point

Layout, local references, basic accessibility semantics, disabled-preview boundary, and unchanged manifest permissions: **PASS**. Functional validation, persistence, navigation, APIs, integrations, and provider evidence: **NOT RUN / out of scope**.

**STOP for ChatGPT acceptance of Phase 03.01.** Do not begin 03.02 without a later scoped request.
