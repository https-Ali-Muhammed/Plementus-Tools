# Odoo TraceBridge

**PROJECT NOT YET IMPLEMENTED OR RUNNABLE.** This repository currently contains planning references and Step DB documentation only. No browser extension, executable features, dependencies, build output, or compatibility certification exists.

Odoo TraceBridge is a proposed privacy-first diagnostic handover tool for Odoo developers, technical leads, implementation/QA engineers, and support engineers. The planned workflow is an explicitly opted-in troubleshooting session that organizes observable browser evidence, separates facts from hypotheses, compares cases cautiously, and prepares a reviewed handover.

## Planned functionality

The proposed first release is an AI-free, local-first Chromium browser extension. Planned capabilities include a per-tab investigation timeline, safe client-error and request metadata, evidence-linked deterministic checks, local case review, and Markdown/JSON export. These are plans only; none are available today. Future Plemo discovery is optional and separately authorized (Phase 21); no Plemo integration is implemented or assumed.

## Architecture direction

The blueprint proposes a Chromium Manifest V3 extension with local processing and storage, capability-based Odoo adapters, and a generic browser-evidence fallback. The product is intended to work without AI, a hosted backend, or an Odoo server module. Technical choices remain subject to Phase 00 discovery and Phase 01 architecture/security review.

## Privacy and security principles

The proposed design is opt-in, bounded, read-only, and local-first. It must not collect credentials, cookies, tokens, typed input, complete business records, or raw request/response bodies by default. Export/transmission would require deliberate review and approval. These are design requirements, not implemented or security-tested controls. Do not use this project to access Odoo/customer data; no such access is part of the current scope.

## Odoo compatibility strategy

Compatibility is a goal, not a result. The plan uses generic browser evidence plus tested capability-specific adapters and explicit statuses (`Verified`, `Partial`, `Fallback`, `Unknown`, `Unsupported`). Odoo 8–20 are planning targets; no version, edition, hosting type, or feature has been tested or certified. See the [master plan](docs/01_MASTER_PLAN.md) and the canonical blueprint's compatibility strategy.

## Installation and setup

**NOT YET AVAILABLE.** There is no runnable extension or verified setup procedure. Do not install dependencies, run build commands, or load an unpacked extension based on this README. Exact prerequisites, commands, permissions, and output paths will be documented only after implementation and verification.

### Browser extension installation

**PLANNED — NOT AVAILABLE.** Chrome Developer mode / Load unpacked instructions and a build directory cannot be provided until a real extension build exists and its output path is verified.

## Planned development, build, and test workflow

The planned sequence is documentation acceptance, product discovery, architecture/security decisions, and then one gated implementation phase at a time. No development, build, lint, typecheck, or product test commands are available yet. Product and real-Odoo tests are **NOT TESTED**.

## Troubleshooting

No application is runnable, so there are no verified runtime troubleshooting steps yet. For project status or blockers, see [00 Project Status](docs/00_PROJECT_STATUS.md), [05 Blockers and Decisions](docs/05_BLOCKERS_AND_DECISIONS.md), and [07 Handoff](docs/07_HANDOFF.md).

## Contributions and security reports

Contribution and security-reporting processes are **NOT YET ESTABLISHED**. Do not submit customer data, credentials, or production captures. Changes to the project scope and any Git commit/push require owner review.

## Current development branch

`feature/odoo-tracebridge`, created from verified `origin/develop` at `64a05446cd9ca65e89c5515c6c76e8ee073fb94a`. The branch policy and evidence are recorded in [Architecture Decisions](docs/02_ARCHITECTURE_DECISIONS.md) and the [DB phase report](docs/Phases/PHASE_DB_DOCUMENTATION_BOOTSTRAP.md). All later phases use this branch unless the owner explicitly changes the strategy. Commits and pushes require owner review; no automatic merges to `develop` or `main`.

## Project documentation

- [Project status](docs/00_PROJECT_STATUS.md)
- [Master plan and phase gates](docs/01_MASTER_PLAN.md)
- [Architecture decisions](docs/02_ARCHITECTURE_DECISIONS.md)
- [Changelog](docs/03_CHANGELOG.md)
- [Test evidence](docs/04_TEST_EVIDENCE.md)
- [Blockers and decisions](docs/05_BLOCKERS_AND_DECISIONS.md)
- [Deployment runbook](docs/06_DEPLOYMENT_RUNBOOK.md)
- [Handoff](docs/07_HANDOFF.md)
- [Step DB phase report](docs/Phases/PHASE_DB_DOCUMENTATION_BOOTSTRAP.md)
- [Canonical implementation blueprint](docs/Odoo_TraceBridge_Complete_Implementation_Blueprint.md)
- [New chat instructions](docs/Odoo_TraceBridge_New_Chat_Instructions.md)

## Status boundaries

Real Odoo compatibility: **NOT TESTED**. Browser extension functionality: **NOT IMPLEMENTED**. Plemo integration: **NOT IMPLEMENTED**. No commits or pushes have been performed for Step DB.
