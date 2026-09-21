# Evidence Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Inspect one recorded experiment, safely and without provider calls, in the local browser.

**Architecture:** Replay the fixed report, project validated per-case fields, expose one fixed endpoint, and render metrics and filterable tables in an independent browser section.

**Tech Stack:** Existing Node ES modules, node:test, native HTML/CSS/JavaScript; no runtime dependencies.

**Spec:** [Approved evidence explorer](../specs/2026-09-21-evidence-explorer-design.md).

## Global constraints

- No charting library, upload flow, arbitrary filesystem browser, report registry, database, or additional experiment.
- Keep the original report immutable.
- Never spread raw report/provider objects into the response.
- Null metrics display “not available,” not zero.
- No paid evaluations, commits, pushes, deployments, or release tags.

## Task 1: Validated projection and fixed endpoint

Files: `evaluation.mjs`, `server.mjs`, `test/evaluation.test.mjs`, `test/server.test.mjs`.

Consumes: `replayReport(report)`, `validateResponse(result)`, `route(result, threshold)`.
Produces: `recordedReportView(report)` and GET `/api/reports/support-routing-2026-09-21` with the approved response contract. A server-side `readReport` injection may supply parsed reports in tests; it must never accept a client path.

- [x] Test the missing projection with the saved fixture and assert:

```js
assert.equal(typeof evaluation.recordedReportView, 'function');
const view = evaluation.recordedReportView(report);
assert.equal(view.api_calls, 0);
assert.deepEqual(view.summary, replayReport(report).summary);
assert.equal(view.cases.length, 16);
assert.equal(view.metadata.recorded_at, report.collected_at);
assert.deepEqual(view.warnings, ['legacy_provenance_incomplete']);
```

Add unknown private fields and assert they are absent. Test error-only rows produce null model metrics/results and a generic marker; summary mismatch remains explicit. Invalid timestamps, wrong decisions, invalid latency, and malformed answers reject with a generic message. Missing timestamp becomes null. Run `node --test test/evaluation.test.mjs` and confirm missing-function failure.

- [x] Implement projection by calling replay first, requiring `live_evaluation` for this fixed recorded view, and validating optional ISO timestamp. Derive metadata model from unique successful normalized response model names (use null when none), keeping requested model separately labeled. Build each case explicitly:

```js
const clean = row.status === 'ok' ? validateResponse(row.result) : null;
return { id: row.id, expected: row.expected, baseline: row.baseline,
  status: row.status, prediction: clean?.answers.department.choice ?? null,
  confidence: clean?.answers.department.confidence ?? null,
  decision: clean ? route(clean, report.threshold) : null,
  latency_ms: clean ? row.result.latency_ms : null,
  error: clean ? null : 'evaluation_failed' };
```

Return explicit replay summary/diagnostics/warnings/comparison fields. Do not expose current dataset text or unvalidated report fields.
- [x] Add server tests for fixed GET success without a key, zero evaluator calls, 404 arbitrary/query paths, 403 cross-origin, malformed/missing report sanitized failure, and unchanged fixture hash. Watch the endpoint test fail before adding the route.
- [x] Add fixed route before POST-only dispatch. Read only the hard-coded report with `readFile(new URL(..., import.meta.url))`, parse, project, and send. Use a generic unavailable message on report errors; never leak paths or partial metrics. Re-run `npm test`.

## Task 2: Read-only explorer interface

Files: `web/index.html`, `web/app.js`, `web/style.css`.

Consumes: fixed endpoint contract. Produces: independent Recorded experiment section, native tables and local filters.

- [x] Before implementation, check the browser for “Load recorded experiment”; confirm absent. Establish browser assertions for loaded metadata/warnings and 16 table rows, then errors/review/misclassification filters, no provider calls, and unavailable retry.
- [x] Add a load button, separate polite status, hidden loaded panel, metadata and warnings before metrics, filter select, case table, and model/baseline confusion matrices. Use DOM node construction and `textContent` throughout.
- [x] Maintain one local recorded view; show loading state and disable the load button until completion; allow retry on failure. Fetch only the fixed endpoint, with a bounded timeout. Do not change live checkbox, submit ticket form, or reset the live panel.
- [x] Filter with explicit predicates:

```js
const include = row => filter === 'all'
  || (filter === 'errors' && row.status === 'error')
  || (filter === 'review' && row.decision?.action === 'review')
  || (filter === 'misclassified' && row.status === 'ok' && row.prediction !== row.expected);
```

Display an empty message when no rows match. Metrics retain full-report denominators when filtering. Show successful-response and per-attempt accuracy separately, baseline denominator, errors, review count/coverage, wrong auto-routes, and successful latency. Cost remains an explicitly historical token estimate, not current pricing.
- [x] Native table captions and scoped headers explain expected rows/predicted columns. Put wide tables in labeled, keyboard-focusable scrolling regions, keep focus visible, and show no page-level horizontal overflow at 390px.
- [x] Verify local filters issue no extra requests; changing the live form leaves recorded results intact. Intercept synthetic error-only and mismatch responses for edge checks and label all simulated evidence.

## Task 3: Acceptance evidence and documentation

Files: `docs/verification/2026-09-21-education-experience.md`, `docs/images/`, `README.md`, `doc/roadmap.md`, relevant learning/architecture/recipe/evaluation docs, both approved specs and these task checkboxes.

- [x] Run the complete keyless command set:

```text
npm test
npm run demo
npm run eval -- --config data/support-routing-v1.json
node playground.mjs replay --report doc/results/jev-test-2026-09-21.json
```

- [x] Verify browser desktop and 390px layouts; keyboard navigation through form, trace disclosures, recorded load/filter and scrolling regions; loading/failure/recovery; independent panels; no credentials or external provider requests. Capture actual screenshots with preview/recorded/simulated labels visible.
- [x] Record test commands/results, browser engine/viewport, what was simulated, and any unverified accessibility scope. Do not claim full WCAG conformance from keyboard checks.
- [x] Replace planned/CLI-only descriptions with verified behavior in README and linked docs. Link screenshots and verification report, preserve synthetic 16-case and legacy-provenance caveats. Mark roadmap items complete only with direct evidence, and separate already completed push/CI from pending release/license items.
- [x] Check local Markdown links, `git diff --check`, full test suite, historical report hash, and secret exclusion. Leave all changes uncommitted for user review. Mark the goal complete only when every acceptance item has evidence.
