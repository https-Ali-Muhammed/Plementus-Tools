# Phase 04.03: Safe recovery after interruption

**READY_FOR_REVIEW for synthetic recovery decisions only.** 2026-10-29 (Africa/Cairo). Progress **4/20 master phases; 16/72 micro-phases accepted**. Per owner instruction, 04.02 is **ACCEPTED FOR SIMULATED FOUNDATION ONLY**. Real durable storage and worker/tab restart recovery are **BLOCKED**; this phase does not satisfy the master plan's real-restart requirement.

## Preflight

Root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`; origin fetch/push `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`; branch `feature/sh-project-setup-extension-clean`; upstream `origin/feature/sh-project-setup-extension-clean`; HEAD `e9b0c622aacc384d708d39b22db0a2fdba22b0cd`. Clean tracked and untracked status, zero ahead/behind against the local upstream ref; `395e3383` is an ancestor. The successors are 04.02 foundation `a6a2c21` and historical documentation reconciliation `e9b0c62`. No remote fetch was performed.

## Chrome startup investigation

Prior evidence is preserved in [04.02](PHASE_04_02.md): an initial 03.03 obsolete disabled-field assertion failed, was corrected, then both smoke scripts timed out waiting for `serviceworker`, including a sequential retry. Their subsequent assertions were not reached. No cause was established at that time.

This turn used the Git root as cwd and the absolute unpacked path `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean/Sh_Project_Setup_extension`, where `manifest.json` exists. Playwright resolved `/home/https_ali_muhammed/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`, reporting Chrome for Testing 151.0.7922.34. A disposable profile used `headless: false` with `--headless=new`, `--disable-extensions-except=<absolute extension path>` and `--load-extension=<absolute extension path>`. The bounded diagnostic opened `chrome://extensions`, observed the named extension and the worker `chrome-extension://dopnafdolldhmjnkdindjkbdojdenana/src/background.js` through Playwright. No extension error was surfaced by the inspected item; worker startup logs before observation were not captured. The worker was already observed before the five-second event wait; no timeout was increased.

Current evidence demonstrates the extension loads and the harness can observe its worker now. The earlier intermittent environment or harness failure cannot be distinguished definitively from a transient extension failure; no persistent extension startup failure was reproduced. Absence of captured startup logs is not proof that no error occurred earlier. Both original smoke scripts subsequently passed on this run, including their assertions. Their results are local popup evidence, not restart evidence.

Diagnostic command, run from the Git root (the temporary profile is removed in `finally`):

```sh
node --input-type=module <<'DIAGNOSTIC'
import { chromium } from 'playwright';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ext=path.resolve('Sh_Project_Setup_extension'); const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sh-diag-')); let ctx;
try {
 console.log(JSON.stringify({cwd:process.cwd(),extension:ext,manifestExists:fs.existsSync(path.join(ext,'manifest.json')),executable:chromium.executablePath(),flags:['--headless=new','--disable-extensions-except='+ext,'--load-extension='+ext]}));
 ctx=await chromium.launchPersistentContext(profile,{headless:false,args:['--headless=new','--disable-extensions-except='+ext,'--load-extension='+ext]});
 const p=await ctx.newPage(); const cdp=await ctx.newCDPSession(p); console.log('version',JSON.stringify(await cdp.send('Browser.getVersion')));
 await p.goto('chrome://extensions/'); console.log('extensions',JSON.stringify(await p.evaluate(()=>{const m=document.querySelector('extensions-manager');const l=m?.shadowRoot?.querySelector('extensions-item-list');return [...(l?.shadowRoot?.querySelectorAll('extensions-item')||[])].map(x=>({id:x.id,name:x.shadowRoot?.querySelector('#name')?.textContent?.trim(),errors:x.shadowRoot?.querySelector('#errorsButton')?.textContent?.trim()}))})));
 console.log('workers_before',JSON.stringify(ctx.serviceWorkers().map(w=>w.url())));
 try {const w=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker',{timeout:5000}); console.log('worker',w.url());}catch {console.log('worker_event_timeout_5000');}
 console.log('workers_after',JSON.stringify(ctx.serviceWorkers().map(w=>w.url())));
} catch(e) {console.log('diagnostic_error',e.message.split('\n')[0]); process.exitCode=1;} finally {if(ctx)await ctx.close(); fs.rmSync(profile,{recursive:true,force:true});}
DIAGNOSTIC
```

## Synthetic scope and checks

`src/workflow/recovery.mjs` reads through the existing validated repository and requires a caller-supplied expected revision. Missing, invalid, unsupported schema and mismatched revisions fail with a generic error. Completed/cancelled return terminal; running, awaiting-operator, failed and already-reconciling require reconciliation; other valid states require operator review. No transition, retry, external action or record mutation is performed. A transition being allowed does not prove its operational prerequisites. Revision checking is a read-time snapshot, not a lock: any later authorized action must revalidate and use an atomic conflict check. Fresh repository construction over an injected in-memory fake simulates process interruption; it is not a real process/worker restart or durable adapter. Tests simulate an uncertain earlier write and demonstrate that repeated decisions do not perform another write. No timestamp or retention policy is inferred; stale means expected-revision mismatch.

Commands and results (from Git root):

```sh
node --test Sh_Project_Setup_extension/test/run-record.test.mjs Sh_Project_Setup_extension/test/workflow-state.test.mjs Sh_Project_Setup_extension/test/popup-validation.test.mjs Sh_Project_Setup_extension/test/recovery.test.mjs
node Sh_Project_Setup_extension/test/popup-03-03-smoke.mjs
node Sh_Project_Setup_extension/test/popup-03-04-smoke.mjs
node --check Sh_Project_Setup_extension/src/workflow/recovery.mjs
node --check Sh_Project_Setup_extension/test/recovery.test.mjs
cmp Sh_Project_Setup_extension/docs/01_MASTER_PLAN.md Sh_Project_Setup_extension/docs/_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md
git diff --check
git diff --exit-code HEAD -- Sh_Project_Setup_extension/manifest.json Sh_Project_Setup_extension/src/background.js Sh_Project_Setup_extension/src/popup Sh_Project_Setup_extension/docs/01_MASTER_PLAN.md Sh_Project_Setup_extension/docs/_source
```

Node: **23 PASS, 0 FAIL, 0 SKIP**, comprising the existing 20 plus 3 synthetic recovery tests. Chrome scripts: **2 PASS, 0 FAIL** in this run. Syntax, authoritative-plan comparison, protected tracked-file diff and whitespace check: **PASS**. No real browser recovery, durable storage, provider action, external API, concurrency or customer data was tested. Policy for retention, deletion, access and encryption remains **OWNER DECISION REQUIRED**; no `chrome.storage`, permissions, dependencies or workflow runner were added.

**STOP for ChatGPT acceptance of Phase 04.03.** No 04.04 work, commits or pushes.
