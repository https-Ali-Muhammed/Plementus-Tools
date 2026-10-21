# Odoo TraceBridge

Odoo TraceBridge is a privacy-first Chromium extension scaffold. **Recording and all diagnostic features are unavailable — not implemented.** The popup is inert. Do not use it with Odoo/customer data.

## Planned functionality

Per-tab investigations, safe browser evidence, Odoo capability adapters, local case storage, comparisons, reviewed exports, and optional Plemo discovery are **PLANNED** only. No Odoo version, hosting type, or feature is tested or certified. See [product scope](docs/PRODUCT_SCOPE.md), [support matrix](docs/SUPPORT_MATRIX.md), and the [22-phase plan](docs/01_MASTER_PLAN.md).

## Prerequisites

- Node.js **22 or newer** and npm (the lockfile uses npm lockfile v3). Verified here with Node `v24.19.0` and npm `11.17.0`.
- Google Chrome **120 or newer** for the proposed initial browser floor. Chromium/other browsers are not certified. Chrome 120 is the architecture proposal, not a result of browser testing.

WXT `0.21.4` and its React module `1.2.2` officially support the chosen setup; React/React DOM are pinned to `19.3.1`. All direct dependencies are exact-pinned in `package.json` and the npm lockfile. See [Phase 02 evidence](docs/Phases/PHASE_02.md).

## Setup and development

```sh
npm ci
npm run dev
npm run build
npm run typecheck
npm run lint
npm test
```

`npm run dev` creates `.output/chrome-mv3-dev`, which includes localhost-only development permissions and reload support. Do not use that folder as the production artifact. `npm run build` creates the production unpacked extension at **`.output/chrome-mv3`**. It requests no extension permissions or host grants.

## Load the production build in Chrome

1. Run `npm ci` and `npm run build`.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Select **Load unpacked** and choose this project's `.output/chrome-mv3` directory.
4. Open the extension popup. It should show **“Recording unavailable — not implemented”**.

Manual Chrome installation/popup smoke testing was **NOT TESTED** in the current environment because no Chrome window is connected. Owner acceptance is pending that smoke test.

## Security and status

Production contains only the popup and minimum manifest metadata. There are no background/content scripts, host grants, capture hooks, telemetry, external requests, or remote code. The generated development manifest has additional WXT hot-reload permissions and localhost CSP; see the manifest audit in [Phase 02](docs/Phases/PHASE_02.md). Loading the scaffold does not authorize capture or use with customer data.

Phase 00 and Phase 01 are **COMPLETE**; accepted progress remains **2/22**. Phase 02 is **PROVISIONAL — pending owner acceptance**. Browser/Odoo compatibility and all planned functionality remain **NOT TESTED / NOT IMPLEMENTED**. Commits and pushes require owner review; no commit or push was made. See [status](docs/00_PROJECT_STATUS.md) and [handoff](docs/07_HANDOFF.md).

## Project documentation

- [Project status](docs/00_PROJECT_STATUS.md) · [Master plan](docs/01_MASTER_PLAN.md) · [Architecture decisions](docs/02_ARCHITECTURE_DECISIONS.md)
- [Changelog](docs/03_CHANGELOG.md) · [Test evidence](docs/04_TEST_EVIDENCE.md) · [Blockers](docs/05_BLOCKERS_AND_DECISIONS.md) · [Runbook](docs/06_DEPLOYMENT_RUNBOOK.md) · [Handoff](docs/07_HANDOFF.md)
- [Phase 02 report](docs/Phases/PHASE_02.md) · [Architecture](docs/ARCHITECTURE.md) · [Security and privacy](docs/SECURITY_PRIVACY.md)
- [Phase 01 report](docs/Phases/PHASE_01.md) · [Phase 00 report](docs/Phases/PHASE_00.md) · [Canonical blueprint](Odoo_TraceBridge_Complete_Implementation_Blueprint.md)
