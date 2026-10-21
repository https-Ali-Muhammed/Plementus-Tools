# Deployment Runbook

## Current status

**NOT RELEASE-READY.** Phase 02 provides a buildable inert scaffold and a verified production output directory; no product capture or Odoo feature exists, and manual Chrome installation remains untested. Use only the verified commands and path below.

## Planned path (not yet available)

Later phases will add verified procedures for:

1. Clean-clone prerequisites and pinned tool versions.
2. Dependency installation and local development/build/test commands.
3. Exact generated extension directory and Chrome `chrome://extensions` → Developer mode → Load unpacked steps.
4. Site permission and explicit recording-consent behavior.
5. Local data review, export, deletion, update, and uninstall behavior.
6. Release package review, privacy disclosures, manual rollback, and owner approval.

Phase 02 verified local commands:

```sh
npm ci
npm run dev
npm run build
npm run typecheck
npm run lint
npm test
```

Production unpacked output: `.output/chrome-mv3`. Development output: `.output/chrome-mv3-dev`; WXT includes localhost reload permissions there, so do not distribute or use it against Odoo/customer pages. Open `chrome://extensions`, enable Developer mode, choose Load unpacked, and select `.output/chrome-mv3`. Manual browser installation/popup verification is still NOT TESTED. No store upload or publication was performed.

## Git boundary

Current local working branch: `feature/odoo-tracebridge`, based on verified `origin/develop` at `64a05446cd9ca65e89c5515c6c76e8ee073fb94a`. Git root is the parent of the supplied project directory. DB/Phase 00 historical publication records remain in the reports. Phase 01 acceptance and verified pushed baseline `013887312f69d77458191d1663308ed9490297e7` were supplied for this run; Phase 02 changes are local/uncommitted and unpushed. Commits and pushes require owner review.

## Safety and approval boundaries

- No Odoo/customer/production access or data changes.
- No automated deployment or public release.
- Commits and pushes require owner review; no automatic merges into `develop` or `main`.
- Phase 21 Plemo work, if later approved, begins with read-only discovery; no live integration is implemented here.

## Phase 02 boundary

Phase 00 and Phase 01 COMPLETE; accepted progress **2/22**. Phase 02 **PROVISIONAL — pending owner acceptance** because manual Chrome smoke is outstanding. WXT/React scaffold builds and has no production permissions or host grants. Every Odoo feature remains UNKNOWN / NOT TESTED.

Owner smoke: load `.output/chrome-mv3` unpacked in Chrome 120+, open popup and verify the unavailable message and no site access. Later capture requires approved policy and least-privilege grant/consent tests; no customer/production use follows from loading the scaffold. Retention/encryption/production/export policy remains OWNER DECISION REQUIRED. No rollback binary, store package or deployment exists.
