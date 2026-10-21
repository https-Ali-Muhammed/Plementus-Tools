# Deployment Runbook

## Current status

**NOT DEPLOYABLE.** The project is not implemented or runnable. There is no application scaffold, package manifest, dependency lockfile, extension build, or verified output directory. Do not run guessed install/build commands or attempt browser installation.

## Planned path (not yet available)

After the relevant phases are authorized and implemented, the runbook will record only verified procedures for:

1. Clean-clone prerequisites and pinned tool versions.
2. Dependency installation and local development/build/test commands.
3. Exact generated extension directory and Chrome `chrome://extensions` → Developer mode → Load unpacked steps.
4. Site permission and explicit recording-consent behavior.
5. Local data review, export, deletion, update, and uninstall behavior.
6. Release package review, privacy disclosures, manual rollback, and owner approval.

Each command and output path remains **NOT YET AVAILABLE** until tested against the actual project. No deployment, packaging, store upload, or publication was performed in DB.

## Git boundary

Current local working branch: `feature/odoo-tracebridge`, based on verified `origin/develop` at `64a05446cd9ca65e89c5515c6c76e8ee073fb94a`. The actual Git root is the parent of the supplied project directory. DB was accepted per owner and committed/pushed at f3cdea5; verified upstream origin/feature/odoo-tracebridge and live remote match local HEAD on 2026-10-20. Phase 00 documentation is local/uncommitted; no push or commit performed in this execution. Commits and pushes require owner review.

## Safety and approval boundaries

- No Odoo/customer/production access or data changes.
- No automated deployment or public release.
- Commits and pushes require owner review; no automatic merges into `develop` or `main`.
- Phase 21 Plemo work, if later approved, begins with read-only discovery; no live integration is implemented here.

## Phase 00 boundary

Discovery is PROVISIONAL; not an installation/release artifact. No Chrome/Odoo environment or build tested. See [feasibility](FEASIBILITY.md) for candidate WXT/API evidence and [support matrix](SUPPORT_MATRIX.md) for all UNKNOWN / NOT TESTED coverage. No setup commands introduced; Phase 01 remains not started.
