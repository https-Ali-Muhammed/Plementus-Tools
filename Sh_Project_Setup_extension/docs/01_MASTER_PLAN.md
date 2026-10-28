# Odoo.sh Customer Setup — Chrome Extension Master Implementation Plan

**Edition:** 2.0 — Chrome extension architecture replaces the former Odoo addon plan  
**Updated:** 2026-10-28  
**Product:** One browser extension, provisionally `odoo-sh-customer-setup`  
**Architecture:** Chrome Manifest V3 (MV3); browser-first, local-first; **no Odoo addon or modifications to standard Odoo/Plementus**  
**Project status:** PLANNED — **0/20 phases accepted**; no repository or runtime inspected; no code implemented  
**Delivery method:** ChatGPT plans/reviews one phase; Codex implements it; owner reviews/commits/pushes and controls accounts and live changes.

> **Change notice:** This document supersedes the previously attached *Odoo.sh Project Setup Addon* plan. The approved product direction is now **one Chrome extension**. Retain the 20-phase, Phase-00-first, documented, Codex-gated delivery workflow, but **do not build an Odoo module, edit `project.project`, create a backend service, or add a Plementus dependency**. Keep the original uploaded filenames for compatibility with the next-chat handoff; their contents describe the extension, not an addon.

## 1. Executive objective and intended user experience

The company currently completes roughly **28 manual steps** when opening a new customer Odoo.sh environment across Odoo.sh, GitHub, utility repositories, Odoo Production/Staging, and Plementus. Build **one Chrome extension** to orchestrate those tasks in the operator's browser. It should fill forms, click and verify controls, perform supported GitHub API operations where safer, request human approval for sensitive actions, and resume after interruptions.

**Target experience:** Open Chrome → click the extension's **Set Up New Customer** action → enter subscription mode, GitHub and utilities selections, requested modules, and domain preference → review the proposed actions → start a guided, partially automated workflow → handle authentication/approvals or uncertain steps → inspect a verified completion report.

**Do not promise “one click” or complete hands-off deployment.** Odoo.sh offers no documented platform API to create projects, branches, or rebuilds; a Chrome extension can *potentially* automate those UI operations, but functionality remains **unverified until authorized real-site tests**. The extension should always have an understandable **operator-assisted fallback**. The final reduction from ~28 actions is an outcome to measure at the demo, not an established result.

### The owner's current workflow — authoritative business requirements

1. Create Odoo.sh project under a customer's subscription code, or under an approved partner trial code.
2. Create a private GitHub organization repository or link an existing suitable repository.
3. Associate `main`/`master` with Odoo.sh Production and wait for the Production build/database.
4. Add selected private **Utilities** repository/repositories (for example PLOS) with appropriate Git submodule paths and access authorization; do not confuse attaching a repo with installing its modules.
5. Open Production Apps and install `pl_auth` plus any selected utility modules; verify actual installation, not just visibility.
6. Create/prepare `develop` branch and **Staging/Test** environment that takes a neutralized copy of Production's configured database, then verify installed apps; a Git branch by itself does **not** copy a database.
7. Accept default Odoo.sh Live/Test URLs or coordinate custom domains if the customer controls them.
8. Enter Database Name, Database Live URL, Database Test URL, Database User and related connection fields in Plementus; existing **Connect Live / Connect Test** launches authenticated customer sessions using `pl_auth`. The extension must **reuse the existing user-facing workflow** when it becomes verifiable, not invent token/session logic.

### What should be automated vs. what still needs a person

| Work item | Proposed extension behavior | Operator remains responsible for |
|---|---|---|
| GitHub repository selection/creation | Official GitHub APIs, subject to approved OAuth/app permissions and preflight | Account sign-in, granting approved permissions, approving writes |
| Git branches / utilities submodules | Validate/prepare using supported GitHub APIs and/or browser UI as actually feasible | Repository access, conflict resolution, approval before commits/writes |
| Odoo.sh project and Production setup | **Candidate browser UI automation**, behind evidence-based adapter | Sign-in, subscription entitlement, irreversible operation approval, unexpected UI |
| Odoo.sh private-repository authorization | Assist with *public* deploy-key handoff and UI checkpoints | GitHub/Odoo.sh consent and key authorization; no private-key collection |
| Odoo Production module installation | **Candidate browser UI automation**, with real installed-state verification | Approving installation and any risky Production change |
| Staging/Test environment | **Candidate Odoo.sh UI automation**, verify staging copy rather than merely creating `develop` | Reviewing database-copy implications and failures |
| Domains | Capture default URLs and assist custom-domain setup | External DNS ownership, DNS changes, TLS/verification |
| Plementus Project form | **Candidate browser UI automation** once real form and permissions are inspected | Sign-in and confirmation; `pl_auth` must work independently |
| Login, MFA, CAPTCHA | Never automate or bypass | Human authentication and security challenges |

## 2. Non-negotiable platform facts and confidence limits

- The [Odoo.sh FAQ](https://www.odoo.sh/faq) says a **platform API** for creating Odoo.sh projects/branches or requesting rebuilds is not planned. Its database XML-RPC API is **not** a substitute for the platform API. **Do not invent, reverse-engineer, or rely on undocumented endpoints**.
- Odoo's [Staging and Development documentation](https://www.odoo.com/documentation/18.0/administration/odoo_sh/getting_started/branches.html) distinguishes Staging (neutralized Production data copy) from Development (separate demo database). The target placement of `develop` must be verified during a real demo.
- Official [GitHub REST endpoints](https://docs.github.com/en/rest/repos/repos) allow organization repository operations with appropriate permissions. Credentials and authentication mechanism need a security design; browser extensions must **not contain GitHub App client secrets**.
- Chrome [MV3 service workers can stop and restart](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle). Use persisted state, event-driven actions, bounded waits, checkpoints and reconciliation. Do **not** assume a continuously running background process.
- The browser extension's ability to act on Odoo.sh, customer Odoo, or Plementus is **proposed, not verified**. Real URLs, workflows, selectors, access controls and policy compatibility remain unknown until inspection; fake pages only establish local behavior.

**Local-first constraint:** The owner currently has **no Odoo.sh access** and no locally available Plementus project. The extension can be developed/tested against **local fixture pages, browser mocks, and an approved GitHub sandbox**, but real Odoo.sh/Plementus capabilities must remain explicitly unverified. Standard Odoo source code is **not required** for an extension-only baseline.

## 3. Product scope, exclusions, and design decisions

### Required scope

- Chrome Manifest V3 extension with one clearly labeled extension UI (popup or side panel; choose based on UX/testing in Phase 01/03), **Set Up New Customer** wizard, progress viewer, and resumable run journal.
- Inputs: customer/partner subscription mode; subscription reference treated as sensitive; GitHub organization and new/private vs existing repository; base branch; optional Utilities repo(s), paths and module selections including `pl_auth`; `develop`/Staging intent; default/custom domains; final URLs and database user.
- Read-only site preflight and page detection; least-privilege site access for GitHub, Odoo.sh, relevant customer Odoo and future Plementus origins, with user consent/optional permissions wherever possible.
- Preferred official GitHub API integration for read, repository creation and safe supported operations; never assume all Git/submodule mutations are possible through one API call.
- Versioned **browser adapter interfaces** for Odoo.sh, customer Odoo Apps, Plementus; selectors/mutations isolated from the workflow engine; robust UI state verification and manual handoff when a selector is unknown.
- Explicit approval steps for creating repos, creating Odoo.sh projects, Production/staging changes, deploy-key permissions, module installs and Plementus writes; screenshots and reports must not leak secrets.
- Resilient run state across MV3 suspension, browser/tab navigation and interruption; retries only on safe idempotent steps and reconciliation on unknown outcomes.
- Offline **fixture/mock adapters** and honest tiers of evidence; no live Odoo.sh status claims derived from fixtures.
- Manual fallbacks that show which tab to open, what to do, and what evidence the operator must confirm.

### Out of scope until explicitly approved

- Any Odoo backend addon, modification of standard Odoo, backend API/server, remote agent, headless cloud browser, or browser extension + addon hybrid. This project is **one extension**.
- Capturing/storing account passwords, 2FA codes, CAPTCHA solutions, login/session cookies, private SSH keys, `pl_auth` access tokens, or unrestricted Plementus credentials.
- Bypassing MFA/CAPTCHA, rate limits, access controls or website security protections; requests to do so become **BLOCKED**.
- Unapproved live GitHub writes, actual customer Production operations, DNS mutations, repository deletion, forced pushes, database imports/restores or unreviewed purchases/subscriptions.
- Claiming `pl_auth` integration works without examining actual Plementus behavior and verifying the result in an authorized demo.
- Publishing to the Chrome Web Store or team-wide rollout until extension policy/permission audit, privacy review and authorization.

### Suggested logical architecture

```text
Chrome Extension (Manifest V3; single product)
 ├─ Popup / Side Panel: setup wizard, approvals, run status
 ├─ Background service worker: event-driven step coordinator
 ├─ Persisted run journal: non-secret status, evidence, checkpoints
 ├─ GitHub connector: supported REST APIs, approved auth flow
 ├─ Browser adapters / content scripts (origin-scoped)
 │   ├─ Odoo.sh: project, Production, utilities authorization, Staging [UNVERIFIED]
 │   ├─ Customer Odoo: Apps list, module-state checks/install [UNVERIFIED]
 │   └─ Plementus: Project Database INFO field mapping [UNVERIFIED]
 ├─ Fixture adapters: local DOM pages + failure scenarios [LOCAL TESTS]
 └─ Manual checkpoint UI: user sign-in/MFA/approval/unknown selectors
```

**Architecture rules:**

1. **Single extension, no backend** unless owner explicitly changes scope in a later approved decision.
2. **Provider-specific selectors** reside only in adapters. Engine uses typed actions/results, never hard-coded page selectors.
3. **No “success by click.”** For every action, observe a stable, relevant page state or require an honest operator attestation; distinguish attempted, confirmed, and unknown.
4. **MV3 durability.** Store only non-sensitive run metadata and opaque references where justified; do not persist long-lived secrets or depend on an immortal worker/DOM timer.
5. **Safe retries.** Read state before repeating writes; unknown result → `RECONCILE_REQUIRED`, not blind second click.
6. **Approval gates.** Human must review what will change and the target account/repo/environment before sensitive writes. Site authentication belongs to the site, not the extension.
7. **Scoped permissions and data minimization.** No blanket `<all_urls>` without a documented and accepted reason; request access for known origins and document dynamic Odoo/customer domains. Avoid loading remote executable code.
8. **Separation of confidence.** UI may show `SIMULATED`, `LOCAL_BROWSER_TESTED`, `GITHUB_SANDBOX_VERIFIED`, `MANUALLY_ATTESTED`, `ODOO_SH_DEMO_VERIFIED`, `PLEMENTUS_DEMO_VERIFIED`; never elevate automatically.
9. **Plementus dependency is optional.** Core Odoo.sh+GitHub workflow remains functional if the Plementus site is unavailable.
10. **Default to operator-assistance** for unverified site behavior; automation grows only after sandbox validation.

**Proposed state machine:** `draft` → `ready` → `running` → (`awaiting_operator` | `reconcile_required` | `blocked` | `failed` | `completed` | `cancelled`). Every transition records run ID, step, timestamp, evidence tier, origin/target identifiers as appropriate, redacted error, and what is safe to retry. The meaning of `completed` must include which capabilities were verified and which were attested/manual; never conflate them.

## 4. Permanent project documentation — Phase 00 first

Phase 00 bootstraps documentation **without implementing extension code**. Default directory inside the owner's verified active Git repository: `docs/odoo_sh_setup_extension/` (adapt to existing repo conventions; never assume a path exists). It must contain real, non-empty Markdown files:

```text
docs/odoo_sh_setup_extension/
├── 00_PROJECT_STATUS.md
├── 01_MASTER_PLAN.md
├── 02_ARCHITECTURE_DECISIONS.md
├── 03_CHANGELOG.md
├── 04_TEST_EVIDENCE.md
├── 05_BLOCKERS_AND_DECISIONS.md
├── 06_HANDOFF.md
├── 07_REQUIREMENTS_AND_SCOPE.md
├── 08_INTEGRATION_CONTRACTS.md
├── 09_SECURITY_AND_SECRETS.md
├── 10_TEST_MATRIX.md
├── 11_OPERATIONS_RUNBOOK.md
├── 12_BROWSER_AUTOMATION_FEASIBILITY.md
└── Phases/
    ├── PHASE_00.md
    ├── PHASE_01.md  (created when Phase 01 runs)
    └── ...         (one report for each phase actually attempted)
```

| Persistent file | Minimum required purpose |
|---|---|
| `00_PROJECT_STATUS.md` | `0/20` through `20/20`; current phase, acceptance, current git root/branch/HEAD, passed/failed/not-run tests, blockers and next safe action |
| `01_MASTER_PLAN.md` | This extension master plan verbatim plus approved amendments, progress gates and phase list |
| `02_ARCHITECTURE_DECISIONS.md` | ADRs (context, options, selection, evidence, trade-offs, revision state); extension-only decision prominently recorded |
| `03_CHANGELOG.md` | Chronological phase-by-phase actual file changes; no invented activity |
| `04_TEST_EVIDENCE.md` | Exact commands and environments, PASS/FAIL/SKIP counts, artifact references, unverified scenarios |
| `05_BLOCKERS_AND_DECISIONS.md` | Stable blocker/decision IDs, owner, impact, required approval, closure evidence |
| `06_HANDOFF.md` | Compact reproducible state for each fresh Codex/ChatGPT chat; code paths, run status, decision IDs, final/baseline HEAD |
| `07_REQUIREMENTS_AND_SCOPE.md` | Confirmed business steps, user journeys, scope/non-goals and unknown UI details |
| `08_INTEGRATION_CONTRACTS.md` | GitHub, Odoo.sh UI, customer Odoo UI and Plementus UI adapter operations, input/output, retry/approval boundaries |
| `09_SECURITY_AND_SECRETS.md` | MV3 permission model, auth handling, redaction, threat model, data retention, host allowlist and incident response |
| `10_TEST_MATRIX.md` | Unit, fixture UI, MV3 integration, permissions, interruption, GitHub sandbox, real demo matrix |
| `11_OPERATIONS_RUNBOOK.md` | How to load an unpacked extension, inspect errors, resume, reset **only test state**, collect evidence, and run a demo safely |
| `12_BROWSER_AUTOMATION_FEASIBILITY.md` | Every target action: candidate mechanism, evidence level, observed page/version, fallback, safety requirements and feasibility verdict |
| `Phases/PHASE_XX.md` | Precise scoped objective, starting/final Git state, changed files, tests, caveats, risk controls, reviewer gate and handoff |

Use `UNVERIFIED` for unknown facts; `NOT RUN` for tests not run; never invent repository, branch, account names, target browser versions, target URLs, test totals or commits. A phase may finish `READY_FOR_REVIEW`, but only ChatGPT/owner acceptance counts as `ACCEPTED`.

**Standard phase report:** Title/status; scope and exclusions; preflight root/origin/branch/HEAD/worktree; code/docs changes; exact test commands and outcomes; evidence tier; privacy/permissions; risks/blockers; PASS/FAIL/UNVERIFIED acceptance checklist; next action. Update status, changelog, test evidence, blockers, handoff, feasibility matrix and ADRs when relevant.

## 5. Roadmap — 20 individually gated phases

**Progress at publication: 0/20 accepted. Phase 00 is next.** No extension source has been implemented by this document. Phase 18 and Phase 19 will remain **BLOCKED** until their respective real-world dependencies are provided; they are not implicitly skipped or passed.

| Phase | Scope (small deliverable) | Acceptance evidence | Dependencies |
|---|---|---|---|
| **00** | Documentation system and extension-only decision | Required .md files populated; 0/20; no code touched | Existing approved local workspace |
| **01** | Browser extension repo/workspace audit and version choices | Verified Git root/branch/HEAD; Node/test tooling; Chrome and MV3 baseline | Local workspace |
| **02** | Minimal MV3 installable extension | `manifest.json`, service worker, basic UI, loadable unpacked; minimal permissions | Local Chrome |
| **03** | Setup wizard UI and validation | Subscription mode, GitHub/repo, utilities/modules, branches/domains; no secrets logged | Phase 02 |
| **04** | Persisted workflow journal / state machine | Storage transitions, interruption, duplicate runs, recoverable state tests | Phase 03 |
| **05** | Local browser fixture site and adapter contract | Fake Odoo.sh/Odoo/Plementus pages; deterministic offline scenarios | Local tests |
| **06** | Step coordinator, approvals and resume | Explicit approvals, pause/recover/reconcile behavior; no duplicate writes | Fixtures |
| **07** | GitHub auth/security design and read-only connector | Approved auth approach, non-secret storage, read-only sandbox tests | Sandbox optional |
| **08** | GitHub organization and existing-repo discovery | Org/repo/branch/permission reads + denials handled | GitHub read access optional |
| **09** | Private GitHub repo creation with approval | Dry-run and explicit sandbox write; no real customer write | Approved sandbox |
| **10** | Branch preparation and conflict checks | `main/master`, `develop` plan; safe creation where authorized; no forced update | Sandbox/fixtures |
| **11** | Utilities and submodule planning | Multiple utility selections; Gitlinks/`.gitmodules` implications; no fake “module installed” | Git fixtures |
| **12** | Private utility access/deploy-key handoff | Public key only; documented approved GitHub test flow; unresolved Odoo.sh key → waiting | Sandbox; Odoo.sh later |
| **13** | Odoo.sh UI adapter design and read-only page recognition | Isolated selectors; uncertainty/fallback; only fixtures without live access | Fixture pages |
| **14** | Browser interaction safety and operator checkpoints | Observable actions, navigation, timeouts, interrupted sessions, mandatory approval | Fixtures |
| **15** | Odoo.sh provisioning workflow against fixtures | Project/Production/build/Staging simulated end-to-end; clear SIMULATED | Fixtures |
| **16** | Customer Odoo Apps and Plementus browser adapters in fixtures | Module install-state checks, Project fields mapped; no invented `pl_auth` auth | Fixtures |
| **17** | Security hardening and complete local UAT | Least privilege, sensitive-data tests, source audit, end-to-end failure/recovery | Local Chrome |
| **18** | Real Odoo.sh authorized demo validation | Actual project, Production, utilities, module install, Staging and URLs; measured manual actions | **BLOCKED: Odoo.sh access** |
| **19** | Real Plementus verification and release decision | Actual Project form + Connect behavior, integration gaps, distribution readiness and final release gate | **BLOCKED: Plementus access/contract** |

### Detailed phase objectives and stop conditions

**Phase 00 — Docs only.** Inventory existing files/conventions read-only. Confirm there is an approved open workspace; otherwise STOP and report root missing (do not clone/init without approval). Create the documentation tree above; copy this plan into `01_MASTER_PLAN.md`; initialize truthful `0/20`, 20-phase table, unknowns and Phase-00 report. Validate Markdown links/counts, no addon/extension code, no external calls, no commits/pushes.

**Phase 01 — Repo + Chrome/Node baseline.** Read verified Git root/origin/branch/HEAD/status and existing source conventions; check installed Chrome/Chromium, Node/package manager, test tooling, platform and permission restrictions. Pick minimal MV3 project layout and test tool, record decisions; make no extension feature yet. Report if a new Git repository is desired rather than initializing without consent.

**Phase 02 — Smallest loadable MV3.** Implement manifest, background service worker, one visible toolbar/popup entry, static styling and README installation instructions. Restrict permissions to actual needs, avoid `<all_urls>` and remote code; smoke-test unpacked loading if Chrome exists, otherwise label browser loading `NOT RUN`.

**Phase 03 — Wizard.** Collect project label, subscription type (customer or partner trial) and reference (never expose in logs), GitHub org/private new/existing repo, utility repo list, required modules (`pl_auth` only if selected), branch/staging target, domains, optional Plementus stage; validate URL/SSH/branch syntax and duplicate submodule paths. No actual API calls.

**Phase 04 — Durable state.** Non-secret run metadata in extension storage; draft/ready/running/awaiting_operator/reconcile_required/failed/blocked/completed/cancelled, strict transitions, per-step evidence confidence, cancellation and conflict prevention. Handle MV3 worker restart and browser tab close in tests.

**Phase 05 — Fixtures and adapter contracts.** Local test HTML/DOM fixtures for Odoo.sh setup screens, Production, Staging, customer Apps and Plementus Database INFO. Use **invented fake page structures explicitly labeled as fixtures**, not claims about the real UI. Define adapter results: supported/unverified/blocked, observed/attested, redacted error, selected target, retry safety.

**Phase 06 — Orchestrator and approvals.** Implement ordered actions, preflight and review-before-write, manual handoff on unknown selectors, tab origin check, pause/resume and safe retries. Simulate delayed/failure/duplicate/unknown results; mutation requiring confirmation must never silently re-run.

**Phase 07 — Authentication choice + connector.** Compare GitHub OAuth through a user-consented browser flow, GitHub App variants and safe least-privilege methods. Do not embed client secrets or plaintext tokens in extension assets/commit. Implement read-only connector after approval; mock its API for automated tests. No OAuth secrets/credentials in reports.

**Phase 08 — Read-only GitHub discovery.** Verify org membership/access, repo exists/visibility, branch/default settings, scope errors and rate limits using mock tests and optional consented sandbox reads. Be explicit when no GitHub account is connected; no external writes.

**Phase 09 — Sandbox repository write.** Add create-private-org-repo/existing-repo selection, preview targeted account/org/repo, explicit user approval and idempotent error reconciliation. Live writes only to owner-approved disposable GitHub sandbox. If unavailable, local mocks may pass but phase remains `PARTIAL`/`BLOCKED` for the live-write acceptance gate unless scope is formally adjusted.

**Phase 10 — Branch workflow.** Read branch existence, protect current default, optionally create `develop` in approved test repo; no force push or silent rewrites. Git branch creation does not prove Staging exists. Check exact base SHA and what changed.

**Phase 11 — Utilities planner.** Validate allowed private utility URLs, submodule path collisions, fixed commit/branch expectations and permissions. Choose a supported approach to commit Gitlinks/`.gitmodules` only if technically verified; otherwise handoff to operator. No invented GitHub “add submodule” endpoint; no module-installation claim.

**Phase 12 — Private key handoff.** Explain difference between Odoo.sh-supplied **public** deploy key and a credential. Never request or persist private SSH keys. Let operator copy a public key from Odoo.sh and, with approval, configure the permitted GitHub sandbox deploy-key API. Without the actual Odoo.sh key, document `AWAITING_OPERATOR` rather than fake it.

**Phase 13 — Odoo.sh read-only adapter.** Implement deterministic page detection against fixtures; isolate selectors by site/version/context and support unknown-page fallback. Never depend on undocumented Odoo.sh network calls. No claim of real-browser compatibility until Phase 18.

**Phase 14 — Interaction engine.** Robust, bounded UI interactions, visibility checks, target/account/environment verification, navigation recovery, unexpected-dialog handling, automation stop on login/MFA/CAPTCHA, and explicit operator approval before Production-impacting changes. Test tab loss, stale element, multiple tabs, timeout, service-worker suspend/resume.

**Phase 15 — Fixture provisioning flow.** Simulate entering Odoo.sh customer/partner code, linking repo, Production readiness, utilities authorization handoff and Staging copy. At every stage record **SIMULATED** and distinguish observed fixture UI from actual Odoo.sh behavior. If the site later proves incompatible, retain manual mode.

**Phase 16 — Customer Apps + Plementus fixture adapters.** For customer Odoo, simulate Apps module discovery, requested installation, installed-state confirmation and failures with safe Production approval. For Plementus, simulate writing known Database INFO labels and preserve Connect Live/Test as existing application features; never synthesize `pl_auth` token/session logic. Unknown page/field mapping → manual checkpoint.

**Phase 17 — Local E2E and security acceptance.** Run full Chrome fixture demo and unit/integration tests: cross-origin guards, content script isolation, XSS/input safety, log/clipboard redaction, background restarts, bad selectors, retries, GitHub permission errors and rollback/reconciliation. Document installed extension permissions, screenshots redacted, remaining unknowns and local-only shipping class.

**Phase 18 — Real Odoo.sh authorized demo: HARD GATE.** Only after owner grants demo project/subscription, browser profile, authorized account, GitHub sandbox and written scope. Check up-to-date real UI, authentication/policy limitations, direct project/Production creation, Utilities authorization, actual Production module install and true Staging database copy. Record actual manual/automated tasks and build URLs, errors, cleanup/cost, and whether automation is supportable. No real customer project; no bypasses. If access unavailable, remain `BLOCKED` and do not claim completion.

**Phase 19 — Real Plementus verification and release: HARD GATE.** Only after authorized Plementus demo access and verified `pl_auth` contract/behavior. Inspect actual Project Database INFO fields, fill allowed values via extension, and verify native Connect Live/Test without intercepting tokens or replacing its login workflow. Review permissions, privacy, extension distribution, rollout/rollback, measurable time saved and final GO/NO-GO. If unavailable, remain `BLOCKED`, not accepted.

## 6. Tests, evidence, acceptance and release classifications

**Per-phase gate:** scoped files only; Git preflight and baseline/final worktree documented; tests with reproducible commands and pass/fail/skip totals; permissions/privacy verified; all docs synchronized; ChatGPT outcome `ACCEPT`, `REWORK`, or `BLOCKED`; owner controls commits and pushes.

**Evidence tiers:**

- `SIMULATED` — scripted fake action/result or fixture only.
- `LOCAL_BROWSER_TESTED` — extension behavior verified in a real local Chrome/Chromium session against controlled fixture pages; still not proof about Odoo.sh.
- `GITHUB_SANDBOX_VERIFIED` — authorized GitHub test-organization/repo read/write operations actually observed.
- `MANUALLY_ATTESTED` — operator completed/confirmed an action; still distinct from automatic verification.
- `ODOO_SH_DEMO_VERIFIED` — authorized Odoo.sh demo UI and resulting environment state observed.
- `PLEMENTUS_DEMO_VERIFIED` — authorized Plementus fields and native connection behavior observed.

**Completion levels:** Phase 17 can yield a **local extension prototype** only. Phase 18 can validate real Odoo.sh behavior; Phase 19 can support a release recommendation. A green fixture suite or clicked UI element does **not** mean Production is provisioned, modules installed, or `pl_auth` ready.

**Test groups:** MV3 loading/manifest; UI wizard validation; storage/restart and state transitions; isolated browser adapters; role/origin/permission denial; manual approval and cancellation; network timeout/unknown external writes; GitHub mocked and approved sandbox; UI navigation/dialog changes; module status in fake Odoo; fake Plementus field mappings; fully local E2E; real Odoo.sh and Plementus demo only at gated phases.

## 7. Codex configuration and context policy

Recommendations are **suggestions, not assertions about the models available in your Codex desktop app**. Prefer a strong coding-capable Codex model visible in the picker. Use `Medium` for bounded work and `High` for architecture, authentication, persistent state and security. Start new Codex chats at major workstream boundaries or sooner when context becomes crowded; preserve durable context in `06_HANDOFF.md`.

| Phase | Model recommendation | Thinking effort | Codex conversation |
|---|---|---|---|
| 00 | Best available coding-capable Codex model | Medium | **New** |
| 01 | Best available coding-capable Codex model | Medium | Same if context short |
| 02 | Best available coding-capable Codex model | Medium | Same |
| 03 | Best available coding-capable Codex model | Medium | **New** (wizard UI) |
| 04 | Strongest reasoning-capable Codex model available | High | Same |
| 05 | Best available coding-capable Codex model | Medium | **New** (fixtures) |
| 06 | Strongest reasoning-capable Codex model available | High | Same |
| 07 | Strongest reasoning-capable Codex model available | High | **New** (GitHub auth) |
| 08 | Best available coding-capable Codex model | Medium | Same |
| 09 | Strongest reasoning-capable Codex model available | High | Same or New if long |
| 10 | Best available coding-capable Codex model | Medium | Same |
| 11 | Strongest reasoning-capable Codex model available | High | **New** (Git operations) |
| 12 | Strongest reasoning-capable Codex model available | High | Same |
| 13 | Best available coding-capable Codex model | Medium | **New** (site adapters) |
| 14 | Strongest reasoning-capable Codex model available | High | Same |
| 15 | Best available coding-capable Codex model | High | Same or New if long |
| 16 | Best available coding-capable Codex model | High | **New** (Odoo/Plementus) |
| 17 | Strongest reasoning-capable Codex model available | High | **New** (security QA) |
| 18 | Strongest reasoning-capable Codex model available | High | **New** (live demo) |
| 19 | Strongest reasoning-capable Codex model available | High | **New** (Plementus/release) |

After **every** Codex prompt ChatGPT must append: **Model; thinking effort; SAME/NEW Codex chat; why**. If specific latest model names are unavailable in the ChatGPT context, say “best available Codex coding model” rather than inventing availability. A final Codex reply is **≤150 words**; detailed evidence goes in Markdown.

## 8. Operating loop: exactly one phase at a time

1. **ChatGPT** reads documented current status, phase report and test evidence. Give one scoped copyable Codex prompt and the configuration line. Do not provide a future phase prompt yet.
2. **Codex** verifies current workspace Git root/origin/branch/HEAD/full worktree, reads only relevant docs/source, implements **the named phase only**, tests where possible, updates permanent docs, writes `Phases/PHASE_XX.md`, and replies within 150 words.
3. **Owner** pastes Codex's summary and relevant report/evidence into ChatGPT. **ChatGPT** evaluates each acceptance criterion: `ACCEPT`, `REWORK`, `BLOCKED`. Missing evidence is `UNVERIFIED`; no phase-progress increment until accepted.
4. For `REWORK`, produce **fix-only prompt** (same phase). For `BLOCKED`, record dependency and await an owner decision; never silently skip/generate a new phase.
5. On `ACCEPT`, ChatGPT supplies a descriptive **multi-paragraph Git commit message** plus ready-to-copy `git status`, selective `git add`, `git commit`, `git push` commands using **verified** paths and branch (or requests state if unknown). Owner commits/pushes; never assume Git changed or remote updated.
6. Update/reconcile `00_PROJECT_STATUS`, `06_HANDOFF`, changelog/test ledger/ADRs/phase report with observed facts; proceed in the **next interaction only after review**.

**Global Codex stop rules:** No cloning/initializing repos, branch checkout, hard reset, force push, commit, push, customer network write, web store upload, Production change, surprise auth login or credential copying without express owner approval. Stop on mismatched/unexpected Git state. Respect unrelated dirty files. Do not expose subscription codes, GitHub tokens, browser cookies, SSH secrets, customer data or Plementus session material. No unsupported Odoo.sh endpoints; no security bypass. Never claim `LIVE_VERIFIED` from simulated or operator-only evidence.

**Prompt skeleton:** `Phase; progress; Git/permissions preflight; minimal read list; in-scope deliverable; explicit exclusions; tests/evidence; docs update; stop conditions; ≤150-word report`. If files not yet present, use the attached authoritative plan, not guessed repository docs.

## 9. Decisions, risks, and unresolved prerequisites

| ID | Item | Status | Next resolution |
|---|---|---|---|
| D-01 | Current Codex local folder and Git repo root/remote/branch/HEAD | **UNKNOWN** | Phase 00 preflight / Phase 01 audit |
| D-02 | Chrome/Chromium, Node, OS, test runner, approved repo layout | **UNKNOWN** | Phase 01 |
| D-03 | Popup vs side panel, extension distribution model and site-origin permissions | **UNDECIDED** | Phases 01–03 |
| D-04 | GitHub org identity, authorized OAuth flow / least privilege / sandbox | **NOT PROVIDED** | Phase 07–09 |
| D-05 | Customer vs partner subscription UI, Odoo.sh session/account | **UNVERIFIED** | Phase 18 |
| D-06 | Exact Odoo.sh UI paths/selectors and browser-automation policy | **NO ACCESS** | Phase 18 |
| D-07 | Private utilities SSH URLs/keys/submodule behavior | **NOT PROVIDED** | Phase 11–12 / 18 |
| D-08 | `develop` desired Staging placement, module installation semantics | **UNVERIFIED** | Phase 18 |
| D-09 | Plementus website/form access, field definitions, native `pl_auth` Connect behavior | **NO ACCESS/CONTRACT** | Phase 19 |
| D-10 | Custom domains and DNS approval | **UNKNOWN** | Phase 18+ |
| D-11 | Chrome Web Store/internal distribution policy and privacy review | **UNDECIDED** | Phase 19 |
| D-12 | Browser UI automation robustness and measured actual step savings | **UNVERIFIED** | Phase 18 |

**Keep the feasibility ledger honest:** when a real website is inaccessible, mark browser adapter actions `CANDIDATE_ONLY`; if a real page cannot be automated safely, preserve the operator-guided mode and update the acceptance forecast. Never equate page text, successful clicking and actual backend state.

## 10. Immediate next action

**Next ChatGPT conversation begins with Phase 00 only.** Attach both revised Markdown files and paste the companion handoff or the short message supplied with it. ChatGPT should return the **documentation-only Phase 00 Codex prompt**, along with model/effort/SAME-or-NEW guidance, then **STOP** for the owner's Codex result. At this point, **0/20 phases are accepted**; no GitHub, Odoo.sh, Plementus or browser automation has been deployed.

---

### Official references (reviewed 2026-10-28; re-check when implementing)

- [Odoo.sh platform API FAQ](https://www.odoo.sh/faq)
- [Odoo.sh branches, Staging and Development](https://www.odoo.com/documentation/18.0/administration/odoo_sh/getting_started/branches.html)
- [Odoo.sh projects and subscription setup](https://www.odoo.com/documentation/19.0/administration/odoo_sh/getting_started/create.html)
- [Chrome extensions: MV3 service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Chrome extensions: event/service-worker storage](https://developer.chrome.com/docs/extensions/get-started/tutorial/service-worker-events)
- [GitHub REST: repositories](https://docs.github.com/en/rest/repos/repos)
- [GitHub REST: deploy keys](https://docs.github.com/en/rest/deploy-keys/deploy-keys)


## Amendment A — Micro-phase execution ledger (2026-10-28)

**Owner-approved execution refinement.** The original 20 master phases (00–19) remain the scope and release gates, but execution is divided into **72 sequential, individually accepted micro-phases**. Each Codex prompt covers exactly **one** `XX.YY` item; never implement an entire parent phase in one prompt. Target one narrow deliverable, one focused test set, and only the relevant files; split further when needed rather than overloading context. The master phase is ACCEPTED only after all its micro-phases are accepted and its parent-level exit criteria pass. Do not consider these estimates of elapsed time or token budgets.

**Progress notation:** `0/20 master phases; 0/72 micro-phases accepted`. Both counters must be tracked in `00_PROJECT_STATUS.md`, `06_HANDOFF.md` and phase reports. Reports use `Phases/PHASE_XX_YY.md` for each micro-phase; also maintain one concise `Phases/PHASE_XX.md` parent summary, first opened when its first micro-phase begins. For every micro-phase: preflight Git, read only authoritative inputs plus directly relevant files, change only scoped files, run focused checks, update existing docs, output ≤150 words, then STOP for ChatGPT review. Prefer NEW Codex chat at phase transitions or whenever context grows; handoff file is the restart point. After ACCEPT, user manages selective commit/push; never preemptively modify Git.

**Project repository (owner-provided, remote metadata verified read-only):** `https://github.com/https-Ali-Muhammed/Plementus-Tools`; default remote branch `main`. **Extension subdirectory (owner-provided, not locally verified):** `/home/https_ali_muhammed/Plementus/Tools/Sh_Project_Setup_extension`. Expected Git root is `/home/https_ali_muhammed/Plementus/Tools` but MUST be confirmed locally. Suggested dedicated branch: `feature/sh-project-setup-extension`. Owner has **authorized creation of a new extension branch**, subject to safe local checks: verify actual repo, origin, HEAD, complete worktree, and existing branch; stop if a branch name conflict or incompatible dirty state exists. Branch creation is not verification that any files are implemented. No cloning, Git initialization, resets, commits or pushes are authorized. A connected GitHub reader reported `push=false`; ChatGPT cannot create the branch remotely and this is not evidence about local Git credentials.

**Updated Phase 00 sequencing:** `00.01` performs local Git preflight and may create/switch to the **new** dedicated branch only after all checks succeed; this is the one explicitly authorized branch exception to the original Phase 00 global no-branch-change rule. `00.02`–`00.04` create only documentation; no extension code. The initial documentation base should be under `Sh_Project_Setup_extension/docs/` (or existing conventions after validation) rather than an unrelated repo-level folder, with the original 14 mandatory Markdown documents preserved. The canonical original master plan stays verbatim within `01_MASTER_PLAN.md`; place this amendment after it or in clearly delineated amendment section.

| Micro-phase | Minimal deliverable | Gate |
|---|---|---|
| 00.01 | Verify local repository, worktree and create approved feature branch | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 00.02 | Create status, plan and architectural decision docs | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 00.03 | Create security, integration, requirements and feasibility docs | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 00.04 | Create tests, operations, handoff and Phase 00 report; validate docs | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 01.01 | Inventory existing repo and extension folder | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 01.02 | Audit Chrome, Node, package manager and test tooling | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 01.03 | Decide MV3 structure and document baseline | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 02.01 | Set up minimal extension manifest and folder skeleton | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 02.02 | Add service worker and static popup | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 02.03 | Document unpacked loading and smoke-test | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 03.01 | Implement basic wizard layout | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 03.02 | Validate subscription and project information | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 03.03 | Validate GitHub repository/utility inputs | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 03.04 | Validate branches, domains and review summary | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 04.01 | Define workflow state types and valid transitions | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 04.02 | Persist sanitized run records | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 04.03 | Resume after worker restart and tabs closing | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 04.04 | Handle duplicate/invalid transitions | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 05.01 | Specify versioned adapter interfaces | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 05.02 | Build mock Odoo.sh fixture pages | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 05.03 | Build mock customer Odoo and Plementus pages | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 05.04 | Add deterministic failure/unknown-state fixture cases | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 06.01 | Build ordered step coordinator | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 06.02 | Implement operator approval checkpoints | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 06.03 | Add pause, resume and cancel | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 06.04 | Add idempotency checks and reconciliation tests | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 07.01 | Compare GitHub authentication options and threat model | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 07.02 | Obtain authorization for chosen least-privilege approach | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 07.03 | Implement read-only connector and mocked tests | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 08.01 | Read organization and repo permissions | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 08.02 | Read repository visibility and branches | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 08.03 | Test API errors, rate limits and permission denial | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 09.01 | Preview create-private-repo operation | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 09.02 | Require explicit sandbox write authorization and approval | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 09.03 | Execute approved sandbox write and verify/reconcile | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 10.01 | Inspect default and target branches | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 10.02 | Prepare safe branch creation plan | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 10.03 | Create approved sandbox branch and verify SHA | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 11.01 | Plan utility repository selections and paths | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 11.02 | Validate .gitmodules and gitlink operations | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 11.03 | Test conflict detection and manual fallback | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 12.01 | Design public deploy-key handoff and boundaries | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 12.02 | Verify GitHub deploy-key fixture/approved sandbox path | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 12.03 | Document Odoo.sh key unavailable and operator checkpoint | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 13.01 | Define Odoo.sh page-detection contracts | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 13.02 | Implement read-only fixture recognition | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 13.03 | Handle unknown pages and isolate versioned selectors | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 14.01 | Build origin/tab/account safety guards | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 14.02 | Implement bounded DOM interaction primitives | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 14.03 | Handle navigation, dialogs and session interruption | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 14.04 | Test approval, timeout and uncertain write states | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 15.01 | Simulate subscription and project setup | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 15.02 | Simulate repository association and Production build readiness | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 15.03 | Simulate utilities authorization and module checkpoints | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 15.04 | Simulate Staging neutralized-copy confirmation and report | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 16.01 | Create customer Odoo Apps fixture adapter | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 16.02 | Implement installed-state verification and approved mock install | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 16.03 | Create Plementus Database INFO fixture mapping | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 16.04 | Validate manual Connect workflow handoff without token access | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 17.01 | Audit permissions, secrets, XSS and origin isolation | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 17.02 | Test restart, failure, replay and reconciliation | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 17.03 | Run complete local browser end-to-end fixtures | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 17.04 | Review privacy, packaging and local prototype classification | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 18.01 | Authorize demo account, scope, cost and recovery plan [REAL-DEMO GATE] | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 18.02 | Inspect live Odoo.sh UI and policies read-only [REAL-DEMO GATE] | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 18.03 | Validate approved project, repository and Production operations [REAL-DEMO GATE] | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 18.04 | Validate utility access, modules and actual Staging database copy [REAL-DEMO GATE] | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 18.05 | Measure manual vs automated steps; close demo evidence [REAL-DEMO GATE] | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 19.01 | Authorize and inspect real Plementus fields and pl_auth contract [REAL-DEMO GATE] | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 19.02 | Validate approved Plementus form flow and native Connect behavior [REAL-DEMO GATE] | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 19.03 | Review release privacy, permissions and distribution [REAL-DEMO GATE] | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |
| 19.04 | Perform final GO/NO-GO and documentation handoff [REAL-DEMO GATE] | Scoped change + specific reproducible evidence; ChatGPT ACCEPT before next |

**Hard gates:** Do not mistake fake pages for live evidence. Phases 18 and 19 stay BLOCKED until real authorized access. Any unavailable approved GitHub sandbox may also block live-write acceptance for relevant earlier micro-phases. GitHub branch setup for project development is separate from the extension's future API-driven customer-repository operations. Keep review and commits separate from implementation.
