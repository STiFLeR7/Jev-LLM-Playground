# Jev Reference Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This document is a proposed implementation scope, not authorization to execute, commit, publish, or run paid evaluations.

**Goal:** Turn the existing support-routing playground into a credible learning example with reproducible evidence and an application decision trace.

**Architecture:** Preserve the native Node CLI/server and browser assets. Keep the API boundary and routing policy shared; extract evaluation orchestration into one module only when implementing replay and versioned reports. Do not build a provider framework or monorepo.

**Tech Stack:** Node.js built-ins, node:test, native HTML/CSS/JavaScript.

**Spec:** [Readiness audit and release scope](../../../doc/audit-2026-09-21.md).

## Global constraints

- Node >=22.9.0; no runtime dependencies.
- Preserve existing CLI commands and the saved historical report.
- Local-only server; explicit live opt-in; no automatic retries.
- Synthetic/public data only; no commits/pushes/paid runs without further authorization.
- License selection belongs to the owner.
- No schema-validity, confidence, or 16/16-result claims of universal correctness.

## File responsibilities

Implementation checkpoint: response normalization, score consistency, offline replay, hashed provenance, the versioned config loader, detailed class metrics, and timeout/concurrency checks are implemented. See `doc/decision-bench.md` for exact supported contracts and metric denominators. Trace UI, broader datasets, education/contribution work, and release approval remain pending. Work is on `improve/validation-bench`, uncommitted; no new paid calls were made. The detailed unchecked steps below retain the original plan; `doc/roadmap.md` is the current milestone-status record.

| Files | Responsibility |
| --- | --- |
| `playground.mjs` | Existing client, normalization, policy, and compatible CLI |
| `evaluation.mjs` (new) | Dataset/config validation, provenance, offline metrics/replay |
| `data/support-routing-v1.json` (new) | Frozen experiment configuration; references existing tickets |
| `test/playground.test.mjs`, `test/server.test.mjs` | Boundary and policy regressions |
| `test/evaluation.test.mjs` (new) | Provenance and metric denominators |
| `server.mjs`, `web/*` | Local trace and curated recorded-results view |
| `README.md`, `doc/jev-101.md`, `CONTRIBUTING.md`, `SECURITY.md` | Learning/onboarding and operating boundaries |

## Task 1 — Normalize the provider boundary

Findings: A1, A2. Modify `playground.mjs` and `test/playground.test.mjs`.

Interface: `validateResponse(data)` returns a fresh allowlisted `{model, answers, usage}`; `evaluateTicket` consumes that return value before routing or serialization. Retain existing required fields. Strip unexpected fields at every nested level; preserve documented probability/legend keys only. Validate the weighted score within 0.03 for this three-level rubric (an application rounding allowance, not an official API guarantee).

- [ ] Add failing regressions using the existing `reply()` helper:

```js
const contradictory = reply();
contradictory.answers.frustration.score = 2;
contradictory.answers.frustration.probabilities = {0: 1, 1: 0, 2: 0};
assert.throws(() => validateResponse(contradictory), /Invalid API response/);
const extra = reply();
extra.answers.extra = {debug: 'SYNTHETIC_PRIVATE_MARKER'};
extra.usage.debug = 'SYNTHETIC_PRIVATE_MARKER';
assert.ok(!JSON.stringify(validateResponse(extra)).includes('SYNTHETIC_PRIVATE_MARKER'));
```

- [ ] Run `node --test test/playground.test.mjs`; establish those cases fail before editing implementation.
- [ ] Compute weighted score from permitted levels, reject contradictory values, and construct fresh nested objects instead of returning `data`:

```js
const weighted = keys.reduce((sum, key) => sum + Number(key) * distribution[key], 0);
requireValue(Math.abs(answer.score - weighted) <= 0.03, invalid);
// In evaluateTicket, assign the validated projection before serializing:
data = validateResponse(data);
```

- [ ] Add rounded-valid and extra-field cases to both client-return and HTTP-output checks; run `npm test` and validate all 16 historical responses without modifying the artifact.
- [ ] Review diff; leave uncommitted unless committing is explicitly authorized.

## Task 2 — Prove failure and routing boundaries

Finding: A4. Modify the two existing test files; add a timeout injection option only if needed to test abort behavior quickly. Default remains 30,000 ms; validate any override as a positive safe integer.

Interfaces retained: `route(data, threshold)` and `createPlaygroundServer({apiKey, evaluate})`. A timed-out/failed provider call produces an error, never a route, and is not retried.

- [ ] Add threshold boundary assertions with the existing fixture:

```js
assert.equal(route(reply(), 0.9).action, 'route');
assert.equal(route(reply(), 0.9001).action, 'review');
```

- [ ] Add a mock that records `init.signal`, waits for its abort event, and rejects with its reason; assert one invocation and the sanitized connection error. Test body-read failure separately from connection failure.
- [ ] Use a deferred promise in the injected evaluator: start one request, await evaluator entry, assert the second returns 429, release the first, and assert a third succeeds. Repeat with evaluator rejection to prove lock release. Avoid arbitrary sleeps.
- [ ] Use fake-key markers in responses/errors and verify they are absent from server static/status/error output and normalized unknown fields. Do not load the real key into tests or claim all arbitrary strings can be made secret-free.
- [ ] Run `npm test`; retain all existing checks.

## Task 3 — Freeze experiment identity and enable offline replay

Finding: A3. Create `evaluation.mjs`, `data/support-routing-v1.json`, and `test/evaluation.test.mjs`; update CLI dispatch in `playground.mjs`. Keep `npm run eval` unchanged by default; add `--config` and a `replay --report PATH` command. Replay must never require credentials or call a provider.

Initial config content:

```json
{
  "schema_version": 1,
  "task": "support-routing",
  "dataset": "./tickets.json",
  "dataset_version": "synthetic-tickets-v1",
  "split": "test",
  "model": "jev-1.13.0",
  "threshold": 0.8,
  "policy_version": "support-routing-v1",
  "baseline_version": "keyword-v1",
  "attempts_per_case": 1
}
```

Interfaces: `loadExperiment(configPath)` returns validated config, selected cases, and provenance; `replayReport(report)` returns recomputed metrics and provenance warnings. Reject unknown schema versions, missing/empty splits, duplicate IDs, unknown labels, invalid thresholds, and unsupported attempt counts. Resolve the dataset relative to its config file. Freeze actual questions in new report metadata rather than relying on mutable source imports during replay.

- [ ] Write failing tests for invalid config/dataset cases and a same-content/same-hash check; run `node --test test/evaluation.test.mjs`.
- [ ] Use Node SHA-256 for exact dataset bytes and serialized question/config/policy metadata:

```js
import { createHash } from 'node:crypto';
const sha256 = value => createHash('sha256').update(value).digest('hex');
```

- [ ] Record report schema version, config, hashes, requested/resolved models, start/end timestamps, Node/platform, attempt count, and code revision (`null` with an explicit uncommitted warning when unavailable). Do not include environment dumps or credentials. Retain safe failure codes and per-attempt elapsed time; do not fabricate failed-call token usage.
- [ ] Accept the historical unversioned report only as legacy input: recompute its existing metrics and emit `legacy_provenance_incomplete`; never add invented original-run hashes/revisions.
- [ ] Verify replay through a subprocess with both credential variables blank and a network-failing evaluator. `node playground.mjs replay --report doc/results/jev-test-2026-09-21.json` must succeed offline and retain the historical 16/16 result.

## Task 4 — Add diagnostic metrics, not stronger marketing claims

Finding: A3. Implement in `evaluation.mjs`, test in `test/evaluation.test.mjs`, and use from CLI evaluation/replay. Preserve the existing summary fields for compatibility.

Interface: `classificationMetrics(rows, labels)` returns `confusion_matrix` (expected rows, predicted columns), per-class support/precision/recall/F1, successful/failed counts, and baseline metrics. Failures stay outside the confusion matrix but remain in per-attempt correctness and coverage denominators. For each class, report successful-case recall separately from per-attempt recall. Undefined denominators are `null`, not 0 or 1. Do not treat an error as `other`.

- [ ] Create a fixture with two billing cases (one predicted technical), one technical case predicted technical, and one failed sales case. Assert total attempts 4, successes 3, billing successful recall 0.5, technical precision 0.5, and no successful sales recall denominator.
- [ ] Implement count accumulation and explicit ratio handling:

```js
const ratio = (numerator, denominator) => denominator ? numerator / denominator : null;
// Only validated successful predictions contribute to confusion cells.
// Every attempted labeled case contributes to per-attempt denominators.
```

- [ ] Add all-failed, empty, perfect, and zero-auto-route cases; run `npm test` and offline replay.
- [ ] Report out-of-scope misroutes, wrong auto-routes, coverage, latency, and cost separately. Keep the current price as a dated estimate. Defer urgency/frustration accuracy, calibration, and repeated-decision stability until suitable labels/runs exist.

## Task 5 — Show the application policy trace and recorded evidence

Findings: A5, A4. Modify `route` in `playground.mjs`, `server.mjs`, and `web/index.html`, `web/app.js`, `web/style.css`; extend existing tests.

Interface: append `reason` and `threshold` to routing results. Reasons are `out_of_scope`, `below_threshold`, or `meets_threshold`; `other` takes precedence. Existing action/queue fields remain compatible.

```js
const reason = department.choice === 'other' ? 'out_of_scope'
  : department.confidence < threshold ? 'below_threshold' : 'meets_threshold';
```

- [ ] Write failing assertions for all three reasons and threshold equality; implement the shared policy metadata and rerun tests.
- [ ] Render an ordered native HTML trace: input, defined questions (Choice/Noul/Score), observed answer, validation/policy condition, suggested route. Use `textContent` for external content. Preview has no model observation. Failed responses have no successful decision trace.
- [ ] Add one explicit allowlisted GET endpoint for the curated synthetic report, never a user-supplied filesystem path. Render a compact per-case table with expected/predicted, confidence, route, and failure status. Mark it “Recorded run — 2026-09-21”; no provider call occurs when opening it. Include provenance warnings for this legacy report.
- [ ] Test the endpoint cannot expose `.env` or arbitrary files and recorded-mode requests cannot dispatch evaluation.
- [ ] Verify desktop and 375px mobile rendering, keyboard use, pending/error recovery, preview/live distinction, and clearing stale results when inputs change. Use mock live responses for browser checks unless a paid call is separately approved. Save only synthetic screenshots; document actual checks and any unavailable browser tooling honestly.

## Task 6 — Make onboarding match the evidence

Finding: A6. Rewrite `README.md`; add `doc/jev-101.md`, `CONTRIBUTING.md`, and `SECURITY.md`; update `doc/validation.md` and `.github/workflows/checks.yml`.

- [ ] README order: purpose/independence → clone and offline startup → preview/live setup → Choice/Score/Noul → evidence/limits → architecture → contributions. Correct the stale “no remote” statement. Clearly distinguish local implementation from published GitHub state.
- [ ] Explain that the application validates and applies policy, and that the trace is not hidden model reasoning. Cite the audit's official sources; retain the 16-ticket limitations next to every accuracy headline.
- [ ] Contribution rules: synthetic or explicitly redistributable data, documented label policy, dev-only tuning, frozen test config, model/config provenance, tests, and no fabricated observations. Retain one support-routing task; additional recipes require separate scope.
- [ ] Security guidance: local-only deployment, provider data boundary, no private tickets in examples, no real keys in issues, and credential revocation after suspected exposure. Ask the owner for an actual private reporting channel; do not invent one or claim GitHub private reporting is enabled.
- [ ] Keep CI keyless. Add offline replay and syntax checks after implementation; do not put live provider calls into pull-request workflows.
- [ ] Run `npm test`, `npm run demo`, `npm run eval`, and historical replay from documented commands. Check local Markdown links and verify `.env` remains ignored.

## Approval-dependent release gate

- [ ] Owner selects a license before adding LICENSE or changing `UNLICENSED` metadata.
- [ ] Review staged content and scan for secrets before an authorized initial commit/push. Current Git has no HEAD; never stage blindly with `git add .`.
- [ ] With explicit paid-run approval, freeze any new dataset/config before evaluation, retain every attempted run, and state that model outputs can vary even with fixed inputs/version.
- [ ] With explicit publication approval, push, inspect actual hosted CI, then tag a meaningful release. Prepare a factual engineering write-up; no trending guarantee or artificial engagement.

## Self-review and handoff

Tasks 1–2 address validation and test gaps; 3–4 produce reproducible evidence; 5 adds the policy trace and recorded view; 6 improves education/onboarding. Owner-dependent license/reporting/publication choices remain explicit gates, not defaults. Larger recipes, adapters, and infrastructure are deliberately outside this release.

Recommended execution: inline, task-by-task, starting with Task 1 and a review after each passing test cycle. Subagent-driven execution is an alternative only if explicitly chosen. No implementation began during this audit.
