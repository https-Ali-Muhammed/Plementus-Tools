# Phase 13.01 — Read-only Odoo.sh page-detection contract v1

2026-11-11 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW — DOCUMENTATION_ONLY**.
Scope: **DOCUMENTATION_ONLY / FIXTURE-READY**. This proposed contract is sufficiently
specified for a separately authorized 13.02 implementation; nothing is implemented
or tested as application behavior in 13.01.

## 1. Baseline, authority and design choice

Required publication baseline: `af73ec2d81b1ec32633f9bd174f837ebf87d95f7`.
Per the supplied instruction, [12.03](../phase12/PHASE_12_03.md) is
**ACCEPTED/PUBLISHED — FIXTURE_ONLY** at that baseline; local HEAD/upstream agree.
[Phase 12](../phase12/PHASE_12.md) fixture-only parent exit **PASS**; full live
capability **PENDING**. The [12.01 contract](../phase12/PHASE_12_01.md) and
[12.02 report](../phase12/PHASE_12_02.md), including original wording and test
history, remain unchanged. Acceptance here is user-supplied, not inferred from Git.
No remote lookup or new application test establishes additional acceptance.

Read with [Phase 13 in the master plan](../../01_MASTER_PLAN.md),
[ADR-006/007/008](../../02_ARCHITECTURE_DECISIONS.md),
[integration contracts](../../08_INTEGRATION_CONTRACTS.md),
[selection/invalidation](../phase07/PHASE_07_BROWSER_FIRST_SELECTION_INVALIDATION_DESIGN.md),
[trust boundaries](../phase07/PHASE_07_BROWSER_FIRST_TRUST_BOUNDARY_DESIGN.md),
[R1 admission](../phase07/PHASE_07_03_R1_CONTRACT_FREEZE.md) and the unchanged
[v1 adapter module](../../../src/adapters/contract.mjs).
Browser-first planning does not approve Chrome permissions, real-site selectors,
page inspection, credentials, provider calls or a bridge to those modules.

**Chosen design:** a pure synchronous function of two primitive canonical JSON
strings: trusted fixture configuration and untrusted synthetic observation.
This follows the inert boundary used in Phase 12 and avoids caller objects,
getters, proxies, callbacks and DOM handles. A DOM/HTML parser would introduce
unneeded collection and selector behavior; a browser admission controller would
exceed this phase. This function is neither. It has no clock, timer, retained
state, asynchronous work, imports or access to external capabilities.

Proposed 13.02 export: `recognizeFixtureOdooShPage(configurationText, observationText)`
in `src/odoo-sh/page-recognition.mjs`, with focused tests in
`test/odoo-sh-page-recognition.test.mjs`, relative to the extension root.
These are future locations, not files created now. No existing callers, exports,
fixtures, manifest, config, dependencies or adapters need modification. Do not
connect it to a worker, popup, workflow coordinator, R1 or selection controller.

## 2. Separate facts and evidence ceilings

| Concept | v1 representation | What it cannot establish |
|---|---|---|
| Selected site/tab role | Harness-owned `selections`; exactly one explicit `odoo-sh` entry required | Origin or page marker never assigns a role; no genuine browser invocation |
| Supported fixture origin | Exact fixed synthetic origin comparison | Browser permission, authenticated access or actual Odoo.sh origin support |
| Current document/context generation | Harness expectation versus supplied observation counters | Browser document identity, event coverage, same-document account stability or cross-boot freshness |
| Page classification | Exact allowlisted synthetic marker match | Authentic page content, provider state or a successful operation |
| Target/project/branch availability | Matching non-null fixture slots when required | Real project/branch identity, existence, ownership or entitlement |
| Evidence provenance | Always `SIMULATED` / `SYNTHETIC_UNTRUSTED` | Real browser observation, human attestation or provider verification |
| Account and operation rights | Every related verification flag is false | Login appearance, account identity, subscription availability or permission to act |
| Execution authority | Every approval, execution, mutation and installation flag is false | Writes, navigation, retries, provisioning or installation |

“Trusted configuration” means the test harness owns the expectations and catalog;
it is not supplied by page markers. Both arguments remain validated inert data.
No serialized assertion authenticates its sender. Even a fully matching fixture
result is display-only and untrusted as evidence about the outside world.
Do not map it to the existing adapter's `observed` result or `provider-state`
verification. Its enums are local to this recognizer; accepted adapter v1 enums,
contracts, security policy and false-authority restrictions remain unchanged.

## 3. Exact inert input boundary and budgets

Both arguments must be primitive JavaScript strings. Check `typeof` before any
coercion/property inspection; objects, boxed strings, functions, proxies, symbols,
undefined, bigint and thenables produce `REJECTED/invalid_input` without invoking
user behavior. No `String(value)`, `toJSON`, getter, iterator or callback is used.

Each argument must contain 1–8,192 ASCII characters inclusive. Size overflow has
its own `input_too_large` reason. Parse JSON only after the primitive/size checks;
require a single top-level record and exact equality with `JSON.stringify` of
the parsed value. Require the exact key orders below at every record level.
Canonical input has no whitespace outside strings, BOM, duplicate keys, alternate
number spellings, unnecessary escapes, trailing bytes or trailing newline.
Round-trip inequality is `invalid_input`. ASCII means U+0000–U+007F at the wire;
decoded textual values must be printable U+0020–U+007E. Escaped controls and
non-ASCII values are invalid. No trimming, normalization, coercion or truncation.

All keys are required; **there are no optional fields**. Null is allowed only
where explicitly listed. Reject extra keys at any depth, including `__proto__`,
`constructor`, credentials, evidence claims and authority flags. JSON-derived
records/arrays only; nesting is bounded by the exact shapes, at most three
container levels (root, selections array, selection record). No arbitrary nested
payload is admitted. Resource bounds apply separately to each argument; combined
input is at most 16,384 ASCII characters. A bounded JSON parse may precede shape
validation; recursion over arbitrary nested data is not required.

Scalar definitions:

| Name | Exact type / bounds |
|---|---|
| Version | Integer 1–999; only value 1 is supported; wrong type/out-of-range is malformed, not a future version |
| Generation | Integer 1–1,000,000 inclusive or null; no negative zero |
| Slot | Integer 1–3 inclusive; project/branch slots may be null, tab slots may not |
| Origin | Primitive printable ASCII string, length 1–128; compared as exact inert text, never parsed/navigated/fetched |
| Marker | Primitive printable ASCII string, length 1–64; exact case-sensitive match only |

### Configuration record, exact property order

| Position / field | Type and allowed values |
|---|---|
| 1 `version` | Version; recognizer input contract version |
| 2 `fixtureVersion` | Version; synthetic marker catalog version |
| 3 `expectedOrigin` | Origin; supported literal is `https://odoo-sh.fixture.invalid` (**synthetic fixture data only**) |
| 4 `selections` | Array of 0–3 records, each exactly `role`, then `tabSlot` |
| 5 `documentGeneration` | Generation; expected synthetic document generation |
| 6 `contextGeneration` | Generation; expected synthetic selection/target context generation |
| 7 `projectSlot` | Slot or null; expected synthetic project slot |
| 8 `branchSlot` | Slot or null; expected synthetic branch slot |
| 9 `access` | `fixture_available`, `missing`, `denied`, `unknown`; a harness scenario, never browser permission |
| 10 `lifecycle` | `current`, `cancelled`, `context_lost`, `unexpected_navigation` |

Each selection's `role` is exactly `odoo-sh`, `github` or `plementus` and `tabSlot`
is a Slot. Array order is unconstrained and never breaks ties. Any repeated role
or tab slot, including an identical duplicate entry, is a selection conflict.
Missing Odoo.sh selection is not repaired from the observation. Other roles may
be absent: this standalone recognizer does not establish a three-tab aggregate.

### Observation record, exact property order

| Position / field | Type and allowed values |
|---|---|
| 1 `version` | Version |
| 2 `fixtureVersion` | Version |
| 3 `origin` | Origin or null; supplied synthetic observation, not browser metadata |
| 4 `tabSlot` | Slot or null |
| 5 `documentGeneration` | Generation |
| 6 `contextGeneration` | Generation |
| 7 `projectSlot` | Slot or null |
| 8 `branchSlot` | Slot or null |
| 9 `markers` | Array of 0–16 Marker strings inclusive; no other values |

No page role is accepted from observation. It can contradict a chosen tab, but
cannot select one. Origin strings other than the fixed synthetic literal are
rejection stimuli only, not approved URLs. A full URL with route, query, fragment,
credentials, port variation, trailing slash or case variation will not match.
No actual Odoo.sh URLs, routes, selectors, labels, keys, tokens or customer values
are needed or permitted as fixture content. Hostile-text tests use harmless
invented markers only; never capture raw HTML, a DOM tree or real page text.

## 4. Synthetic page taxonomy and marker catalog v1

**Every token in this table is invented synthetic fixture data. None is an actual
Odoo.sh selector, element, UI label, route or capability.** No CSS selector, XPath,
HTML element or network endpoint is proposed. Every page uses one exact page
marker; no title/URL substring, fuzzy match or “most specific page” heuristic.

| Synthetic marker | Output `pageClass` | Required matching context |
|---|---|---|
| `fx:auth-required` | `AUTH_REQUIRED` | None |
| `fx:project-list` | `PROJECT_LIST` | None |
| `fx:project-detail` | `PROJECT_DETAIL` | Project |
| `fx:project-settings` | `PROJECT_SETTINGS` | Project |
| `fx:submodule-key-settings` | `SUBMODULE_KEY_SETTINGS` | Project |
| `fx:branch-build` | `BRANCH_BUILD` | Project and branch |
| `fx:production-context` | `PRODUCTION_CONTEXT` | Project and branch |
| `fx:staging-context` | `STAGING_CONTEXT` | Project and branch |

Two additional **synthetic fixture markers**, `fx:mfa-required` and
`fx:captcha-required`, represent interruptions only. They never prove genuine
MFA/CAPTCHA or authentication state. All ten marker literals form the entire v1
allowlist. Zero page markers means unknown unless an interruption rule applies;
more than one distinct page marker means ambiguous, even a settings/detail pair.
Duplicate markers are rejected as conflicting evidence, never deduplicated.
Array order does not affect classification or reason.

A supported fixture page requires supported versions/origin, one explicit role,
matching current synthetic tab/document/context, exactly one supported page marker,
no unsupported/duplicate/conflicting markers, and sufficient matching target slots.
`AUTH_REQUIRED` always interrupts rather than producing a usable match. Matching
Production/Staging/branch/build markers never establishes a Production database,
Staging copy, branch/build success, key association, checkout or module installation.

## 5. Deterministic precedence and result rules

Evaluate top to bottom; **first applicable row wins**, exactly one reason, no
accumulated diagnostics. Before semantic rows, validate both complete v1-shaped
envelopes, including all types, key orders, lengths and counts. Thus a malformed
future-version payload is invalid; a structurally valid one is unsupported.
Within each row, no input order or arbitrary text determines the emitted reason.
No input-dependent exception text escapes; expected input failures return results.

| Order | Predicate | `resultClass` / `reason` |
|---|---|---|
| 1 | Either argument is not a primitive string | `REJECTED / invalid_input` |
| 2 | Either string exceeds 8,192 characters | `REJECTED / input_too_large` |
| 3 | Any remaining syntax, canonicalization, shape, type, scalar limit, empty input or array-count violation | `REJECTED / invalid_input` |
| 4 | Either `version` is not 1 | `REJECTED / unsupported_contract_version` |
| 5 | Either `fixtureVersion` is not 1 | `REJECTED / unsupported_fixture_version` |
| 6 | Configuration `lifecycle` is `cancelled` | `CANCELLED / operator_cancelled` |
| 7 | `expectedOrigin` is not the fixed synthetic origin | `REJECTED / unsupported_site` |
| 8 | Any repeated selection role or tab slot | `AMBIGUOUS_PAGE / selection_conflict` |
| 9 | No selection with role `odoo-sh` | `MANUAL_REVIEW / selection_missing` |
| 10 | `access` is `denied` | `MANUAL_REVIEW / permission_denied` |
| 11 | `access` is `missing` or `unknown` | `MANUAL_REVIEW / permission_unavailable` |
| 12 | `lifecycle` is `context_lost` | `MANUAL_REVIEW / context_lost` |
| 13 | `lifecycle` is `unexpected_navigation` | `MANUAL_REVIEW / unexpected_navigation` |
| 14 | Observation `origin` or `tabSlot` is null | `MANUAL_REVIEW / source_context_missing` |
| 15 | Observation origin differs from fixed expected origin | `REJECTED / unsupported_site` |
| 16 | Observation tab slot differs from selected Odoo.sh tab slot | `MANUAL_REVIEW / tab_mismatch` |
| 17 | Either expected or observed document/context generation is null | `MANUAL_REVIEW / document_context_missing` |
| 18 | Either observed generation differs from expected, older OR newer | `MANUAL_REVIEW / stale_generation` |
| 19 | Repeated identical marker | `AMBIGUOUS_PAGE / duplicate_marker` |
| 20 | Both interruption markers present | `AMBIGUOUS_PAGE / interruption_conflict` |
| 21 | More than one distinct page marker | `AMBIGUOUS_PAGE / page_conflict` |
| 22 | Any marker outside the ten-token allowlist | `UNKNOWN_PAGE / unsupported_marker` |
| 23 | Supplied non-null observed project or branch slot differs from corresponding expected slot, including expected null | `AMBIGUOUS_PAGE / target_conflict` |
| 24 | `fx:mfa-required` present | `MANUAL_REVIEW / mfa_required` |
| 25 | `fx:captcha-required` present | `MANUAL_REVIEW / captcha_required` |
| 26 | Sole page marker is `fx:auth-required` | `MANUAL_REVIEW / login_required` |
| 27 | No page marker | `UNKNOWN_PAGE / page_unknown` |
| 28 | Required project or branch slot is null in either argument | `MANUAL_REVIEW / target_context_missing` |
| 29 | All prior predicates false | `FIXTURE_MATCH / fixture_page_match` |

Null observed target slots never conflict by themselves. They are unavailable,
not agreement: row 28 handles required missing slots. Non-required null targets
do not prevent listing/auth classification. Supplied contradictory non-null
target slots still conflict for every page class, including listing/auth.

`pageClass` is `UNKNOWN` for all rows except 26, 28 and 29. Row 26 emits
`AUTH_REQUIRED`; rows 28/29 emit the sole matched class. This prevents stale,
ambiguous, wrong-origin and interrupted observations from retaining a misleading
previous match. `projectContext` and `branchContext` are `UNAVAILABLE` except:
for rows 26/28/29, each non-required dimension is `NOT_REQUIRED`; each required
dimension is `AVAILABLE` only when both non-null slots match, otherwise
`UNAVAILABLE`. A missing branch can therefore retain an available synthetic
project category without leaking its identity or asserting authority.

## 6. Exact immutable sanitized output

Return a new deeply frozen plain record on every call, including rejection.
All fields below are required, in this exact insertion/serialization order;
no extra fields, arrays, nested objects or optional properties. Flat primitive
values make `Object.freeze` deep for this schema. No mutable reference is retained.
Serialized result is ASCII and at most 2,048 characters; no timestamps, IDs,
generations, slots, markers, origin strings, raw exceptions or input excerpts.

| Order / field | Exact value or vocabulary |
|---|---|
| 1 `version` | Integer 1, output schema version even for unsupported input |
| 2 `fixtureVersion` | Integer 1, supported output catalog, never echo the submitted version |
| 3 `resultClass` | `FIXTURE_MATCH`, `UNKNOWN_PAGE`, `AMBIGUOUS_PAGE`, `MANUAL_REVIEW`, `REJECTED`, `CANCELLED` |
| 4 `reason` | Exactly one of the 29-row table's fixed reasons; no other strings |
| 5 `pageClass` | `UNKNOWN` or one of the eight taxonomy classes |
| 6 `projectContext` | `UNAVAILABLE`, `NOT_REQUIRED`, `AVAILABLE`, per section 5 |
| 7 `branchContext` | Same vocabulary and rule |
| 8 `evidenceTier` | `SIMULATED` |
| 9 `provenance` | `SYNTHETIC_UNTRUSTED` |
| 10 `fixtureOnly` | Boolean true |
| 11 `nextStep` | Fixed code from section 7; never an executable instruction or URL |
| 12 `browserObserved` | Boolean false |
| 13 `permissionVerified` | Boolean false |
| 14 `accountVerified` | Boolean false |
| 15 `rightsVerified` | Boolean false |
| 16 `subscriptionVerified` | Boolean false |
| 17 `approvalGranted` | Boolean false |
| 18 `executionAuthorized` | Boolean false |
| 19 `mutationAuthorized` | Boolean false |
| 20 `installationAuthorized` | Boolean false |
| 21 `trustedContinuingContext` | Boolean false |
| 22 `associationVerified` | Boolean false |
| 23 `productionDatabaseVerified` | Boolean false |
| 24 `stagingCopyVerified` | Boolean false |
| 25 `moduleInstalled` | Boolean false |
| 26 `effectsApplied` | Boolean false |

No raw HTML/DOM, cookies, storage, tokens, public/private keys, arbitrary URLs,
account/customer/project names, provider IDs, page text, hashes or sensitive
content is output, logged, thrown, persisted or exported. Hostile marker text is
never copied into a result or rendered as markup. A safe result contains only
fixed literals and fixed booleans. `AVAILABLE` describes synthetic context slots;
it is not a verified resource or permission flag.

## 7. Manual fallback and fixed next steps

Every result is display-only. Proposed presentation uses a text status/reason,
keyboard-accessible actions, a visible cancel action and status focus/announcement;
never color alone. The recognizer implements no UI. The following mapping is
exhaustive; messages are authored product guidance, **not actual Odoo.sh UI labels**.

| Reason(s) | `nextStep` | Presentation and explicit operator action |
|---|---|---|
| `fixture_page_match` | `REVIEW_FIXTURE` | “Synthetic page class matched; identity and rights unverified.” Review the fixture result only; do not advance provisioning or enable writes. |
| `invalid_input`, `input_too_large` | `CORRECT_FIXTURE` | “Fixture input rejected.” Correct the local fixture within the fixed schema/limits; never display rejected content. |
| `unsupported_contract_version`, `unsupported_fixture_version` | `REVIEW_VERSION` | “Unsupported fixture version.” Use the reviewed v1 fixture or obtain a separately reviewed version contract; do not guess or downgrade. |
| `selection_conflict`, `selection_missing`, `tab_mismatch` | `FRESH_SELECTION` | “Selected tab is missing or ambiguous.” Cancel this review, choose one explicit Odoo.sh fixture role and distinct slot assignments, then start a fresh fixture context. |
| `unsupported_site` | `FRESH_SELECTION` | “Unsupported fixture site.” Stop and explicitly select the supported synthetic site; never rewrite an origin or transfer a result to another tab. |
| `source_context_missing`, `document_context_missing`, `stale_generation`, `context_lost`, `unexpected_navigation` | `FRESH_SELECTION` | “Context unavailable or changed.” Discard the displayed match, cancel the review and create fresh explicit selection/document/context evidence. An identical returning URL does not restore a match. |
| `permission_denied`, `permission_unavailable` | `MANUAL_ACCESS` | “Access denied or unverified.” Stop recognition and resolve the scenario manually; no automatic permission request, broadening or authenticated fallback. Any future real access needs its own authorization. |
| `duplicate_marker`, `interruption_conflict`, `page_conflict`, `unsupported_marker`, `page_unknown` | `MANUAL_PAGE` | “Unknown or conflicting synthetic page evidence.” Stop, review/correct the fixture catalog or choose manual guidance; do not pick a winning marker or retry automatically. |
| `target_conflict`, `target_context_missing` | `MANUAL_TARGET` | “Target context missing or conflicting.” Resolve the intended synthetic project/branch externally to this result, cancel the old review and select a fresh context; do not infer from a URL/page name. |
| `login_required`, `mfa_required`, `captcha_required` | `MANUAL_AUTH` | “Authentication interruption modeled; no authenticated access verified.” Stop; an operator handles any real sign-in/challenge only in a separately authorized native-site workflow, then makes fresh selection. Do not collect credentials or solve/bypass challenges. |
| `operator_cancelled` | `STOP` | “Review cancelled.” Clear the displayed result. A later review requires fresh selection; cancellation claims no logout, grant revocation, rollback or reconciliation. |

No automatic navigation, clicks, typing, form submission, authentication, retry,
polling, permission request or external observation. No actual operator/provider
action is authorized by this fixture contract. Uncertainty after a possible write
belongs to the existing separate reconciliation policy; page recognition and
cancellation never erase that obligation or turn it into a success.

The function is deliberately stateless. The synthetic harness owns generations,
selection and cancellation: after context loss it discards old results and creates
a fresh context with strictly greater context generation; document replacement
also increments document generation. At 1,000,000, stop the scenario, never wrap.
Cancellation inputs always cancel on repeated calls. No result is a reusable
capability or proof of lifecycle continuity; equal old inputs still produce equal
inert outputs. Cross-call replay enforcement, Chrome lifecycle collection and
cross-boot identity are outside this function and must not be claimed by 13.02.

## 8. Canonical fixture example and expected projection

These two lines are **synthetic fixture data only**, respectively configuration
and observation. The code-block delimiters/newlines are not part of the input.
No host resolution or page load occurs.

```json
{"version":1,"fixtureVersion":1,"expectedOrigin":"https://odoo-sh.fixture.invalid","selections":[{"role":"odoo-sh","tabSlot":1}],"documentGeneration":1,"contextGeneration":1,"projectSlot":1,"branchSlot":1,"access":"fixture_available","lifecycle":"current"}
```

```json
{"version":1,"fixtureVersion":1,"origin":"https://odoo-sh.fixture.invalid","tabSlot":1,"documentGeneration":1,"contextGeneration":1,"projectSlot":1,"branchSlot":1,"markers":["fx:project-detail"]}
```

Exact variable projection: `resultClass: FIXTURE_MATCH`,
`reason: fixture_page_match`, `pageClass: PROJECT_DETAIL`,
`projectContext: AVAILABLE`, `branchContext: NOT_REQUIRED`,
`nextStep: REVIEW_FIXTURE`. All other fields take their fixed values in section 6.
Replacing the sole marker with `fx:production-context` changes only the page class
and branch-context category (`PRODUCTION_CONTEXT`, `AVAILABLE`); every verification
and authority flag remains false. These examples are specifications, not test runs.

## 9. Phase 13.02 acceptance matrix — specified, NOT RUN

Use the section 8 pair as base and change only the stated fields. For boundary
cases, preserve canonical serialization unless noncanonical input is the test.
Every row also asserts the exact 26-field output order/allowlist, section 5 page
and context rules, section 7 next step, fixed evidence labels and 15 false flags.
No test code or executable fixture is authored in 13.01.

| Case | Input variation / assertion | Expected `resultClass / reason` |
|---|---|---|
| A01 | Each of the seven non-auth page markers separately, required slots present | `FIXTURE_MATCH / fixture_page_match`; exact class/context from taxonomy |
| A02 | Listing with all four expected/observed project/branch slots null | `FIXTURE_MATCH / fixture_page_match`; `PROJECT_LIST`, both `NOT_REQUIRED` |
| A03 | Markers empty | `UNKNOWN_PAGE / page_unknown` |
| A04 | One invented unknown marker `fx:unlisted` | `UNKNOWN_PAGE / unsupported_marker` |
| A05 | Detail + settings; Production + Staging; auth + detail; permute each | `AMBIGUOUS_PAGE / page_conflict` |
| A06 | Repeat any identical marker, including unknown/interruption tokens | `AMBIGUOUS_PAGE / duplicate_marker` |
| A07 | Either valid version field 2, 999; both arguments tested | `REJECTED / unsupported_contract_version` |
| A08 | Either fixtureVersion 2, 999 with version 1 | `REJECTED / unsupported_fixture_version` |
| A09 | Either origin `https://other.fixture.invalid` (synthetic negative control), or fixed origin plus slash/query/fragment/case variation | `REJECTED / unsupported_site` |
| A10 | Observation origin/tab null independently | `MANUAL_REVIEW / source_context_missing` |
| A11 | Each of four expected/observed generation fields null independently | `MANUAL_REVIEW / document_context_missing` |
| A12 | Document/context observed 1 vs expected 2, then observed 2 vs expected 1 | `MANUAL_REVIEW / stale_generation`; same origin/marker cannot rescue |
| A13 | Duplicate role with different slots, identical entries, different roles sharing slot | `AMBIGUOUS_PAGE / selection_conflict` |
| A14 | Empty selections or only GitHub/Plementus selections | `MANUAL_REVIEW / selection_missing`; no inferred role |
| A15 | Distinct three-role selections in all array orders, Odoo.sh slot matches | `FIXTURE_MATCH / fixture_page_match`; same serialized result |
| A16 | Selected Odoo.sh slot 2, observed 1 | `MANUAL_REVIEW / tab_mismatch` |
| A17 | Observed project/branch slot 2 against expected 1 or null, separately | `AMBIGUOUS_PAGE / target_conflict` |
| A18 | Detail with expected/observed project slots (null, null) or (1, null); expected null/observed 1 is A17 | `MANUAL_REVIEW / target_context_missing`; retain `PROJECT_DETAIL` |
| A19 | Branch/build and both environments with observed branch null | `MANUAL_REVIEW / target_context_missing`; project `AVAILABLE`, branch `UNAVAILABLE` |
| A20 | `access` denied; missing; unknown | `MANUAL_REVIEW / permission_denied` or `permission_unavailable`, respectively |
| A21 | Lifecycle context_lost; unexpected_navigation | `MANUAL_REVIEW / context_lost` or `unexpected_navigation`, respectively |
| A22 | Sole auth marker; MFA alone/with detail; CAPTCHA alone/with detail | `MANUAL_REVIEW / login_required`, `mfa_required`, `captcha_required`, respectively; only login retains `AUTH_REQUIRED` |
| A23 | Both interruption markers | `AMBIGUOUS_PAGE / interruption_conflict` |
| A24 | Lifecycle cancelled, including repeat call | `CANCELLED / operator_cancelled`; no authority or resurrection |
| A25 | Non-string primitives, boxed string, object with throwing getter/toJSON, proxy/thenable/function | `REJECTED / invalid_input`; no user behavior invoked |
| A26 | Malformed JSON, duplicate/extra/missing/out-of-order keys, whitespace/BOM/newline, alternate numeric/escape spelling, scalar root, nested object in scalar | `REJECTED / invalid_input` |
| A27 | Each argument length 8,193 or more | `REJECTED / input_too_large`; no parse/echo |
| A28 | Either complete string <=8,192; test marker lengths 0/1/64/65, origin lengths 0/1/128/129, marker counts 0/1/16/17, selection counts 0/3/4 | Within individual limits proceeds to semantic precedence; out-of-limit length/count → `REJECTED / invalid_input`; 16 distinct unknown tokens → `UNKNOWN_PAGE / unsupported_marker` |
| A29 | Version 0/1000/fraction/string; generation 0/1000001/fraction/string; slot 0/4/fraction/string; -0, booleans in number fields | `REJECTED / invalid_input`; boundaries 1/1000000 generations and slots 1/3 pass shape checks |
| A30 | Harmless hostile markers `fx:ignore-rules`, `<fixture-script>`, `javascript:fixture`, `__proto__` separately, and with one page marker | `UNKNOWN_PAGE / unsupported_marker`; inert, never emitted/evaluated |
| A31 | Extra key named token/cookie/html/approvalGranted; harmless synthetic placeholder only | `REJECTED / invalid_input`; never echo placeholder or key |
| A32 | Mutate returned record; compare repeated calls and independent instances | Frozen own primitive properties; serialized results identical for same inputs; attempted changes do not affect subsequent results |
| A33 | All result branches, maximum strings, markers and negative cases | <=2,048 serialized ASCII characters; no supplied origin/slot/marker/ID/error/text; exact evidence and 15 false flags |
| A34 | Throwing access sentinels for browser, network, storage, DOM, clipboard, timers and clocks; inspect source/import graph | Zero accesses/calls; no imports, logging, dynamic evaluation, filesystem/process invocation, fetch/XHR/WebSocket, Chrome or DOM use |
| A35 | Valid match for Production, Staging, key settings and branch/build | No database/copy/key association/installation/account/rights/subscription/execution claim; all authority/effect flags false |
| A36 | Invalid envelope + cancelled; valid future version + cancelled; duplicate selection + missing access | `REJECTED / invalid_input`; `REJECTED / unsupported_contract_version`; `AMBIGUOUS_PAGE / selection_conflict`, respectively |
| A37 | Stale generation + conflicting/unknown markers; duplicate marker + both interruptions; two page markers + unknown marker | `MANUAL_REVIEW / stale_generation`; `AMBIGUOUS_PAGE / duplicate_marker`; `AMBIGUOUS_PAGE / page_conflict`, respectively |
| A38 | Unknown marker + target conflict; target conflict + MFA; login + missing target | `UNKNOWN_PAGE / unsupported_marker`; `AMBIGUOUS_PAGE / target_conflict`; `MANUAL_REVIEW / login_required`, respectively |
| A39 | Observed branch present while expected null on project listing | `AMBIGUOUS_PAGE / target_conflict`; non-required does not hide contradictions |
| A40 | Both complete strings at 8,192 characters constructed from syntactically parseable but schema-invalid padding/extra data | `REJECTED / invalid_input`, never `input_too_large`; valid schema cannot reach this transport ceiling |

Implementation order after separate authorization: (1) encode these expected
results as focused behavioral tests; (2) implement the closed parser and ordered
pure classification; (3) verify deterministic frozen sanitized results and zero
capability access; (4) run the then-authorized regression scope and report actual
results. No approval/execution bridge, selector discovery or new planning phase
is required to implement this v1 fixture function. Acceptance still requires
independent review; this document authorizes none of those future actions today.

## 10. Phase 13.03 versioned selector isolation

13.02 keeps the fixed marker catalog module-private and keyed conceptually by
site role `odoo-sh`, fixture version 1 and page class. No caller-supplied selectors,
selector callbacks, dynamic imports, registry mutation or wildcard origin support.
The existing synthetic role/origin/generation checks precede all catalog matching.

A separately authorized 13.03 may extract that unchanged catalog into an isolated
version module and add unknown-page presentation coverage. If synthetic elements
or selector strings are introduced then, every one must be labeled synthetic
fixture data and confined to its reviewed site/version/context fixture definition;
none is evidence of a real Odoo.sh selector. 13.02 needs no element/DOM collection.
No such selector is specified or executed in this phase.

Version 1 inputs and outputs, bounds, precedence, privacy, unknown handling and
false flags must remain byte-compatible. New versions need explicit reviewed
schemas/catalogs and negative tests; unsupported versions fail closed, never fall
back to “closest,” newest or last-known selectors. A compatibility facade may
only dispatch an explicitly supported version; v1 cannot silently accept a new
catalog. Real page collection/integration requires a separate trust, permission,
privacy and authorization contract and is not an extension point granted here.

## 11. Documentation scope, preservation and review boundary

Exactly two created files:

- [PHASE_13.md](PHASE_13.md).
- This `PHASE_13_01.md` contract.

Exactly six append-only files:

- [Phase 12 parent](../phase12/PHASE_12.md).
- [Project status](../../00_PROJECT_STATUS.md).
- [Changelog](../../03_CHANGELOG.md).
- [Test evidence](../../04_TEST_EVIDENCE.md).
- [Blockers and decisions](../../05_BLOCKERS_AND_DECISIONS.md).
- [Handoff](../../06_HANDOFF.md).

Preflight verified the required root, extension, branch, all origin fetch/push
URLs, local HEAD/upstream and empty permitted/staged inventories. Upstream is
`origin/feature/sh-project-setup-extension-clean`. Status/diff inspection was
path-scoped from the first command, with `GIT_OPTIONAL_LOCKS=0`. No clone, fetch,
checkout, reset, stage, commit, push, ref repair or sibling worktree operation.

Prospective snapshot: `/tmp/phase13-01-u0345p7i/before.json`, outside the worktrees;
202 tracked extension files, six exact historical byte prefixes, 35 refs, 58
sampled Git metadata files (including all three raw indexes), and three worktree
registrations/HEADs and root filesystem identities. Protected IDE paths received
metadata-only stat checks; no protected content was read, hashed, edited, staged
or restored. Sibling protected source documents and sibling working-tree content
were not inspected. No claim of protected-file content equality is made.

Preservation comparisons cover that snapshot window and sampled metadata, not all
Git metadata, object storage, historical ref retention or sibling content equality.
Pre-existing Codex checkpoint refs are retained without attribution or repair.
The historical **35 → 24 discrepancy remains UNVERIFIED**, regardless of the
current 35-ref snapshot. Publication is user-supplied with local corroboration;
no live remote freshness claim is made. Measured final checks are appended below.

Skills used: Ponytail; Superpowers workflow, design/planning and verification,
bounded by the explicit documentation-only scope and requested review stop.
Tools: local shell/Git/Python through functions tools. WarpGrep and Valyu were
unavailable in tool discovery. No external-service MCP, web research, page
inspection, browser/provider tool or application/Node test was used.

Official progress **42/72 accepted; 5/20 master phases accepted**, unchanged.
Phase 13 parent **IN_PROGRESS / NOT ACCEPTED**. Phase 12 fixture-only exit **PASS**;
full Phase 12 live capability **PENDING**. Phase 10.03 **BLOCKED / NOT AUTHORIZED**;
production **NO_GO**. **STOP for ChatGPT review. No staging, commit, push or 13.02.**


### Measured documentation and preservation results

The scoped audit verifies **eight files: two new, six append-only**; all six
original byte prefixes match. All **196 other tracked extension files**, including
accepted source/tests, master, architecture, contracts, security policies,
manifest, dependencies and README, match the pre-edit snapshot. Staging remains
empty. **33 authored local Markdown links** resolve. UTF-8, LF endings, final
newlines, trailing whitespace, heading spacing, table column counts, paired code
fences and scoped `git diff --check` pass. The two canonical JSON examples parse
and round-trip as written; all 27 reason codes have manual next-step mappings.
The matrix contains 40 specified cases, none executed as application tests.

All **35 original refs** retain their values; the full enumerated ref set remains
35 with no additions/deletions in the observed window. All three worktree
registrations/HEADs and root filesystem identities match. All three raw index
**byte hashes** match. The 58 sampled metadata files retain their bytes. Protected
IDE metadata shows no observed drift; contents remain deliberately unverified.
Sibling source documents and working-tree contents were not inspected.

**Metadata exception — full metadata equality does not hold.** The sibling index
`/home/https_ali_muhammed/Plementus/Tools/.git/worktrees/Tools-Smart-Editor-Guard/index`
changed inode **10355012 → 10355023** and modification time
**1794408112695090696 → 1794411823916729341 ns**. Its size remains **10,870 bytes**
and SHA-256 remains
`877fd06f1d7824c31cdb60b01fe31c5b842b8599bf95eec47b70881fb9119c37`.
Cause **UNVERIFIED**; no task command refreshed or wrote a sibling index and no
repair/restoration was attempted. The initial audit exited 1 on this strict
metadata comparison. Subsequent verification retains the original finding and
reports byte preservation separately from this metadata exception; it does not
rebaseline or conceal it. No ref/index-content/worktree-identity mismatch was
observed. This exception does not resolve the historical 35 → 24 discrepancy.

Temporary evidence: `/tmp/phase13-01-u0345p7i/initial-verification-with-exception.json`,
`verification.json`, and `verify_docs.py` in the same directory. These are local
document-preservation checks, not application tests or committed artifacts.
Application/Node/browser/provider tests **NOT RUN**. No new Chrome permission,
page inspection, real provider operation, staging, commit, push or 13.02 work.
**STOP for ChatGPT review; production NO_GO.**
