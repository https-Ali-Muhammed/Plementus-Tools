# SEC-01 implementation checkpoint 1

**READY_FOR_REVIEW**, pending ChatGPT acceptance. Phase 04 remains **IN_PROGRESS / BLOCKED**; progress remains **4/20 master phases and 18/72 micro-phases accepted**. This checkpoint is not a master-plan micro-phase.

## Scope and policy

The disconnected `src/storage/checkpoint-policy.mjs` provides strict v2 structural validation, temporal eligibility and an update guard. It retains the v1 restrictions through the existing pure validator without changing the v1 synthetic repository. The seven own enumerable data properties are `schemaVersion`, `runId`, `state`, `step`, `evidenceTier`, `revision`, and `createdAt`. V1 and unknown versions are rejected; there is no timestamp invention or migration.

`createdAt` and injected `now` are non-negative safe integer Unix milliseconds. Expiry is `createdAt + 604800000`; at that exact boundary eligibility is `expired`, while structural validation remains true for a well-formed expired record. The update guard requires the same run ID and immutable creation time and rejects expired inputs. It is not a transition, revision-conflict, reconciliation or persistence service. Results are bounded booleans or `eligible`, `expired`, and `invalid` without record contents.

A caller can supply a trusted prior clock observation; a lower current time fails closed. With only the seven approved persisted fields, rollback across restarts cannot reliably be detected. Trustworthiness of a supplied comparison and clock is outside these pure guards. No actual schema migration, database, persistence, deletion, runtime integration or workflow runner was implemented.

## Executed validation

From the Git root, Node v24.19.0:

```sh
node --test Sh_Project_Setup_extension/test/*.test.mjs
node --check Sh_Project_Setup_extension/src/storage/checkpoint-policy.mjs
node --check Sh_Project_Setup_extension/test/checkpoint-policy.test.mjs
```

Node: **32 PASS, 0 FAIL, 0 SKIP** (5 CP1 cases and 27 existing regressions). Syntax: **2 PASS, 0 FAIL, 0 SKIP**. Tests use invented data and do not establish browser behavior or actual retention.

Preflight: root, origin, branch, HEAD `f07a1baf83772e9f71b64865529a2c9fcc6e822d`, clean worktree and local upstream equality verified without fetch. Protected policy, plan, historical draft, master and source inputs, manifest, v1 repository and its tests were hash-compared to HEAD. Scoped Git delta, local Markdown links and whitespace were checked; manifest and permissions unchanged. Static inspection of the new module found no browser APIs, storage writes or external calls. These are static checks, not browser or operational evidence.

## Remaining gates

Closed-browser deletion at expiry, incident contacts and routing, and device-control verification remain unresolved. Actual storage, lifecycle, concurrency, cleanup, browser, security activation and provider tests are **NOT RUN**. No IndexedDB adapter, production migration, Chrome permissions, browser-profile writes, persistent data, dependencies, provider calls, commits or pushes were introduced. Stop for ChatGPT acceptance; checkpoint 2 and Phase 05 are not authorized by this work.

Additional executable verification from the Git root:

```sh
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git rev-parse HEAD
git status --short --branch
git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'
git rev-list --left-right --count HEAD...@{upstream}
git diff --check
rg -n 'indexedDB|chrome\.storage|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|Date\.now' Sh_Project_Setup_extension/src/storage/checkpoint-policy.mjs || true
python3 - <<'PY'
from pathlib import Path
import hashlib, subprocess, json, re
base=Path('Sh_Project_Setup_extension')
protected=['docs/Phases/PHASE_04_SEC01_APPROVED_POLICY.md','docs/Phases/PHASE_04_SEC01_STORAGE_IMPLEMENTATION_PLAN.md','docs/Phases/PHASE_04_D07_DECISION_DRAFT.md','docs/01_MASTER_PLAN.md','docs/_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md','docs/_source/ODOO_SH_PROJECT_SETUP_NEXT_CHAT_HANDOFF.md','manifest.json','src/storage/run-record.mjs','test/run-record.test.mjs']
for name in protected:
    path=base/name
    assert hashlib.sha256(path.read_bytes()).digest()==hashlib.sha256(subprocess.check_output(['git','show','HEAD:'+path.as_posix()])).digest()
assert (base/'docs/01_MASTER_PLAN.md').read_bytes()==(base/'docs/_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md').read_bytes()
m=json.loads((base/'manifest.json').read_text())
assert all(not m.get(k) for k in ['permissions','host_permissions','optional_permissions','optional_host_permissions'])
names=['Phases/PHASE_04_SEC01_CP1.md','Phases/PHASE_04.md','00_PROJECT_STATUS.md','03_CHANGELOG.md','04_TEST_EVIDENCE.md','05_BLOCKERS_AND_DECISIONS.md','06_HANDOFF.md']
for name in names:
    f=base/'docs'/name
    for target in re.findall(r'\]\(([^)]+)\)',f.read_text()):
        if not target.startswith(('http:','https:','#','mailto:')) and target.split('#')[0]:
            assert (f.parent/target.split('#')[0]).exists()
expected={'docs/'+n for n in names}|{'src/storage/checkpoint-policy.mjs','test/checkpoint-policy.test.mjs'}
actual={line[3:] for line in subprocess.check_output(['git','status','--short','--untracked-files=all'],text=True).splitlines()}
assert actual=={str(base/n) for n in expected}
for name in expected:
    assert all(not line.endswith((' ','\t')) for line in (base/name).read_text().splitlines())
print('PASS: protected hashes, master/source, permissions, links, scoped delta and whitespace')
PY
```

The original executed link/hash and scoped-delta checks passed: 9 protected hashes, master/source equality, permission assertions, 109 local links, 9 scoped paths and scoped whitespace. `git diff --check` passed for tracked changes; the separate whitespace check also covered new files. Static pattern search returned no matches. Local upstream was 0 ahead / 0 behind; no fetch was performed.
