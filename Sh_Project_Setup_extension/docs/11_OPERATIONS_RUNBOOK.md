# Operations runbook

**CURRENT LOCAL EVIDENCE:** Phase 02.03 loaded the unpacked extension in a disposable Chrome for Testing profile and verified its worker, popup, and empty permission baseline. Provider tests remain **NOT RUN**. Follow [security](09_SECURITY_AND_SECRETS.md) and [blockers](05_BLOCKERS_AND_DECISIONS.md).

## Before future local testing

1. Verify the current Git root, branch, HEAD and full worktree, and obtain a scoped implementation/testing request. Preserve source documents and unrelated files.
2. Use an isolated local browser profile. Record browser/version, extension build identity, origin permissions and test scope without customer data. Do not reuse a customer profile or real production data by assumption.
3. Review the extension's manifest and requested permissions. Limit access to explicitly approved local fixture origins. Stop for unexpected broad permissions, remote executable code or unfamiliar origins.

## Planned unpacked loading and inspection

Open `chrome://extensions` in an isolated local profile, enable Developer mode, select Load unpacked, and choose `Sh_Project_Setup_extension`. Open the toolbar popup and confirm its name and static status message. Inspect the service-worker link in `chrome://extensions` for errors. Record sanitized errors and permissions, not cookies, passwords, access tokens, customer data or subscription references. Phase 02.03 verified this flow with Chrome for Testing 151.0.7922.34 in a temporary profile.

## Safe fixtures, interruption and recovery

Run only approved local fixtures with invented data; record test commands, environment, counts and evidence tier. Verify target origin, account and environment before any action. Login, MFA, CAPTCHA, unknown UI and risky operations require operator intervention. If a possible write times out or a tab/worker stops, pause at `RECONCILE_REQUIRED`; inspect the target and obtain renewed approval before any safe retry. Never infer completion from a click or fixture result.

## Test-only reset and evidence

A future reset procedure must first identify the disposable run, storage namespace, fixture profile and owner-approved retention/cleanup policy. The operator must verify the exact test-only target and authorization before removing its test state. Until those controls are designed and accepted, reset instructions and cleanup targets are **OPEN / NOT AVAILABLE**. Never clear a real browser profile, repository, database or customer state based on this document.

Collect only necessary, sanitized evidence: run/build identifiers, timestamps, test commands/results, origin classification and redacted errors. Screenshots and logs require review for secrets/customer data before retention or sharing. Retention, deletion, encryption and access remain owner decisions; do not infer permission to save or transmit data.

## Authorized real demo

Real Odoo.sh and Plementus demos require their later gated phases, explicit owner-approved accounts, environment, targets, scope, cost, risk and recovery plan. Verify target and permissions, review each mutation and keep manual sign-in/MFA/CAPTCHA. Do not access customer Production or mutate DNS without separate authorization. Record actual outcomes under their proper evidence tier and flag unknown writes for reconciliation. No live demo or provider operation was performed here.
