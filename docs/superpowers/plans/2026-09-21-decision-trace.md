# Decision Trace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Explain application routing from actual validated answers without changing historical decisions.

**Architecture:** Export a small trace function alongside `route`. Attach its output to the server response; render it using the existing native browser UI.

**Tech Stack:** Node >=22.9, ES modules, node:test, native HTML/CSS/JavaScript; no runtime dependencies.

**Spec:** [Approved decision trace](../specs/2026-09-21-decision-trace-design.md).

## Global constraints

- No new dependencies, generic task framework, persistence, or provider calls on page load.
- Do not add fields to `decision` or require traces in historical reports.
- Render all ticket/provider-derived strings with `textContent`.
- No paid API runs, commits, pushes, or release operations during this goal.
- Preserve all existing tests; strengthen injected server fixtures to contain valid normalized answers.

## Task 1: Shared trace and HTTP boundary

Files: modify `playground.mjs`, `server.mjs`, `test/playground.test.mjs`, `test/server.test.mjs`.

Consumes: `validateResponse(data)`, `route(data, threshold = 0.8)`.
Produces: `decisionTrace(data, threshold = 0.8)` with the approved version-1 trace fields; `/api/triage` live responses gain `trace` and shared question definitions.

- [x] Add tests using the existing `reply()` fixture; import the module namespace initially so the missing function produces an assertion failure:

```js
assert.equal(typeof policy.decisionTrace, 'function');
const trace = policy.decisionTrace(reply(), 0.9);
assert.equal(trace.reason, 'threshold_met');
assert.deepEqual(trace.decision, route(reply(), 0.9));
assert.equal(policy.decisionTrace(reply(), 0.9001).reason, 'below_threshold');
assert.throws(() => policy.decisionTrace({}), /Invalid API response/);
```

Also set category/probabilities to `other` and verify `other_category` at thresholds 0 and 1. Assert exact trace keys and unchanged decision keys. Run `node --test test/playground.test.mjs` and confirm missing-helper failure.

- [x] Implement the shared function:

```js
const clean = validateResponse(data);
const decision = route(clean, threshold);
const { choice: category, confidence } = clean.answers.department;
return { schema_version: 1, policy_version: 'support-routing-v1',
  validation: 'passed', category, confidence, threshold,
  reason: decision.action === 'route' ? 'threshold_met'
    : category === 'other' ? 'other_category' : 'below_threshold', decision };
```

- [x] Extend the server test with valid historical fixture data and assert the returned trace, threshold, questions, and sanitized errors. Verify malformed injected evaluator output yields 502. Keep existing concurrency tests with valid fixtures. Run the test before adding the response fields.
- [x] In the server live branch, normalize evaluator output, compute trace, and serialize an explicit response containing mode, normalized model/answers/usage, finite nonnegative latency, unchanged decision, trace, and `questions`. Reject invalid latency. Never spread arbitrary evaluator fields. Use existing catch/finally behavior.
- [x] Run `npm test`; require all existing and new tests to pass, including historical replay and concurrency/lock release.

## Task 2: Trace presentation and verification

Files: modify `web/index.html`, `web/app.js`, `web/style.css`; browser verification artifacts under `docs/verification/` and `docs/images/`.

Consumes: submitted input snapshot; preview `request.questions`; live `questions` and `trace`.
Produces: a semantic ordered five-step application trace with clearly pending preview stages.

- [x] Before UI changes, run a browser assertion that preview exposes a visible application trace; confirm failure because the trace is absent. Use intercepted synthetic responses for live-shaped checks, never credentials.
- [x] Add a hidden trace section with a heading and ordered list. Populate text-only entries from the submitted snapshot and server definitions:

```js
const item = document.createElement('li');
const heading = document.createElement('strong');
heading.textContent = 'Input state';
const content = document.createElement('p');
content.textContent = input.text;
item.append(heading, content);
```

Repeat for questions, validation, policy, and suggested route. Preview validation/policy/route say pending, no model observation. Live policy shows category/confidence/threshold and a human-readable reason. Include “suggested only; no action executed.” Clear/hide the trace in existing reset behavior. Keep stored-report state independent.
- [x] Style list spacing and long-text wrapping within existing panels. Keep headings readable, visible focus, semantic disclosures, and reduced-motion behavior. Do not replace the current design system.
- [x] Verify preview, threshold equality, low confidence, other category, sanitized error, stale clearing, pending controls, and text injection in the browser. Check keyboard reachability and 390px width. Save labeled synthetic/preview screenshots and exact evidence in the verification document.
- [x] Run `npm test`, `npm run demo`, and historical replay. Update spec status only after acceptance evidence exists. Continue with the separate explorer plan; documentation publication updates are covered there.
