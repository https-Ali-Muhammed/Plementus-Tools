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

Current local working branch: `feature/odoo-tracebridge`, based on verified `origin/develop` at `64a05446cd9ca65e89c5515c6c76e8ee073fb94a`. The actual Git root is the parent of the supplied project directory. No remote feature branch, commit, or push exists. Commits and pushes require owner review.

## Safety and approval boundaries

- No Odoo/customer/production access or data changes.
- No automated deployment or public release.
- Commits and pushes require owner review; no automatic merges into `develop` or `main`.
- Phase 21 Plemo work, if later approved, begins with read-only discovery; no live integration is implemented here.
