# Phase 02.03: Unpacked Chrome loading and smoke test

**Status: READY_FOR_REVIEW.** Recorded 2026-10-28 (Africa/Cairo). Progress: **2/20 master phases; 9/72 micro-phases accepted.** Evidence tier: **LOCAL_BROWSER_TESTED**.

## Test environment and command

Playwright `1.62.1` launched Chrome for Testing `151.0.7922.34` with `--headless=new`, `--disable-extensions-except=<extension path>`, and `--load-extension=<extension path>`. The Node command created a profile under the system temporary directory, closed Chrome, and removed that profile in `finally`. It opened only the extension's local `chrome-extension://` popup URL.

Exact successful command, run from the repository root:

```text
node --input-type=module --eval "import { chromium } from 'playwright'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; const extension=path.resolve('Sh_Project_Setup_extension'); const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sh-project-setup-mv3-')); let context; try { context=await chromium.launchPersistentContext(profile,{headless:false,args:['--headless=new','--disable-extensions-except='+extension,'--load-extension='+extension]}); let worker=context.serviceWorkers()[0]; if(!worker) worker=await context.waitForEvent('serviceworker',{timeout:10000}); const workerUrl=worker.url(); const id=/^chrome-extension:\/\/([^/]+)\//.exec(workerUrl)?.[1]; if(!id) throw new Error('extension worker was not registered: '+workerUrl); const extensionBase='chrome-extension://'+id+'/'; const runtimeManifest=await worker.evaluate(()=>chrome.runtime.getManifest()); if(Object.hasOwn(runtimeManifest,'permissions')||Object.hasOwn(runtimeManifest,'host_permissions')) throw new Error('installed manifest permissions are not empty'); const page=await context.newPage(); const pageErrors=[]; page.on('pageerror',error=>pageErrors.push(error.message)); await page.goto(extensionBase+'src/popup/popup.html',{waitUntil:'load'}); const popup=await page.evaluate(()=>({title:document.title,heading:document.querySelector('h1')?.textContent,message:document.querySelector('p')?.textContent,stylesheet:document.querySelector('link[rel=stylesheet]')?.href,resources:performance.getEntriesByType('resource').map(entry=>entry.name)})); if(popup.title!=='Plementus Project Setup'||popup.heading!=='Plementus Project Setup'||popup.message!=='Setup automation is not yet implemented.'||!popup.stylesheet.startsWith(extensionBase)||popup.resources.some(url=>!url.startsWith(extensionBase))||pageErrors.length) throw new Error('popup smoke check failed: '+JSON.stringify({popup,pageErrors})); const version=await (await context.newCDPSession(page)).send('Browser.getVersion'); console.log(JSON.stringify({browser:version.product,workerUrl,popup,permissions:runtimeManifest.permissions??[],hostPermissions:runtimeManifest.host_permissions??[],pageErrors},null,2)); } finally { if(context) await context.close(); fs.rmSync(profile,{recursive:true,force:true}); }"
```

The first default-headless attempt timed out waiting for a service worker. An explicit `--headless=new` attempt registered the worker. Two initial popup probes used an incorrect base path and then Node's null `chrome-extension:` URL origin; both temporary profiles were removed. The final fresh-profile command derived the extension ID from the registered worker URL and passed.

## Actual result

```text
browser: Chrome/151.0.7922.34
worker: chrome-extension://<generated-id>/src/background.js
popup title: Plementus Project Setup
popup heading: Plementus Project Setup
popup message: Setup automation is not yet implemented.
permissions: []
hostPermissions: []
pageErrors: []
```

Chrome recognized the unpacked extension, registered the module service worker, and loaded the local stylesheet. The observed popup had no page errors. The worker registration and empty manifest permission arrays are the available startup/error and permission evidence for this scope.

## Limits

No provider site, account, credential, real profile, customer data, workflow action, or browser store publication was used. This local runtime result does not verify provider integration or future setup automation.

## Stop point

**STOP for ChatGPT acceptance of Phase 02.03.** Phase 03 has not started.
