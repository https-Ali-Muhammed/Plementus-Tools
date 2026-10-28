# Phase 03.03: GitHub and Utilities input validation

**Status: READY_FOR_REVIEW.** Recorded 2026-10-29 (Africa/Cairo). Progress: **3/20 master phases; 12/72 micro-phases accepted.** Evidence tier: **LOCAL_BROWSER_TESTED**.

## Baseline and scope

Root: `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`; origin: `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`; branch/upstream: `feature/sh-project-setup-extension-clean` / `origin/feature/sh-project-setup-extension-clean`; authorized entry HEAD: `f6fe125bdf702cae1e7667cda7b001cc5ba0a606`. Worktree was clean. `PHASE_02.md` SHA-256 was `f0e89c0419bb72cfdb21aebbcebf3983ca0375e75f54c54c6c70a7d56e5de473`.

Added GitHub organization, repository selection and repository name fields, plus optional add/remove Utilities entries. Supported URLs are GitHub HTTPS, `git@github.com:` SSH, and `ssh://git@github.com/` SSH, with optional `.git`. The local validator rejects embedded credentials, malformed URLs, unsafe relative submodule paths, duplicate repository identities across URL formats, and case-insensitive duplicate paths. Errors contain no entered values. Submission is prevented; values remain in the popup. Downstream controls and navigation remain disabled.

## Reproducible checks

From the repository root:

```sh
node --test Sh_Project_Setup_extension/test/popup-validation.test.mjs
node --check Sh_Project_Setup_extension/src/popup/popup.js
node --check Sh_Project_Setup_extension/src/popup/validation.mjs
node Sh_Project_Setup_extension/test/popup-03-03-smoke.mjs
git diff --check
```

**PASS:** Eight Node tests passed, including four 03.02 regression cases and cases for identifiers, both repository modes, HTTPS/SSH, credential rejection, paths, and duplicates. Both modules parsed. Chrome for Testing `151.0.7922.34` loaded the unpacked extension in a disposable profile, verified accessible inline errors, repeated Utilities entries and duplicate errors, removal and focus, Enter submission safety, disabled downstream controls, empty permission fields, and no console/page errors or non-extension network requests. The smoke script uses only synthetic values, prints no input values and removes its temporary profile. `git diff --check` passed.

No GitHub authentication/API, provider access, storage, actual repository creation or submodule operation was performed. Provider, workflow, security integration and real-site tests remain **NOT RUN**. URL and identifier checks are local syntax checks and do not establish repository existence, access or privacy.

**STOP for ChatGPT acceptance of Phase 03.03.** Do not begin 03.04 without a later scoped request.
