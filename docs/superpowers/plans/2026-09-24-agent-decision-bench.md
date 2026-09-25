# Agent Decision Bench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement and verify an offline policy-attribution benchmark and record an honestly labeled, fresh-context Codex GPT-6 Luna pilot.

**Architecture:** Extract the existing deterministic routing policy without changing execution. A native Node runner validates frozen inputs, imports bounded session observations and replays reports; the coordinating agent dispatches Luna sessions, not application code. No provider framework or API client is added.

**Tech Stack:** Node >=22.9.0, ES modules, node:test, filesystem and crypto standard libraries; zero runtime dependencies.

**Spec:** [Approved design, section 9 governs current scope](../specs/2026-09-23-agent-decision-bench-design.md#9-current-goal-policy-attribution-pilot-with-codex-luna).

**Execution status (2026-09-25):** The owner approved the revised spec and this plan, and selected subagent-driven execution. Tasks 1–4 were implemented in local commits through `2682473`; Task 5 completed its one-development/48-test Luna run and offline import/replay. The checklists below preserve the original execution instructions; the [pilot report](../../03-evaluation/agent-routing-pilot.md) records measured evidence and limits. Independent human review, Jev/NVIDIA comparisons, Evidence UI expansion and publication remain outside this plan's completed scope.

## Global Constraints

- No paid API calls, publication or changes to the cumulative spending cap.
- No downstream execution, provider fallback or test retries.
- 64 synthetic tasks: 16 development, 48 test; 32 two-case families split 8/24.
- Four test strata of 12 cases; at least six cases per route; author-only labels until actual human review.
- At most four development sessions and 48 fresh test sessions using gpt-6-luna and fork_turns: none.
- Unknown usage, model settings, billing and unauditable tool activity remain null or explicitly unverified.
- Preserve main branch, existing user edits, historical reports, CLI/UI behavior and all existing tests.
- Local task commits are permitted; no push, tag or release in this plan.

## Review Focus

1. Shared policy refactor accidentally changes approval/confidence precedence: Task 1 pins equality and overlap.
2. Family leakage or false human-review provenance: Task 2 rejects cross-split families and fabricated agreed status.
3. Missing observations silently improve accuracy: Task 3 tests scheduled, failed and unattempted denominators.
4. Interrupted journal writes lose the last valid record: Task 4 fails closed on truncation, never redispatches.
5. A fresh session still has tools/workspace access: Task 5 records observable evidence and never claims hardened isolation.

## Files and responsibilities

- Modify agent.mjs: export pure policy, reuse inside runAgent; leave execution local.
- Modify evaluation.mjs: optional label list for classificationMetrics, existing default unchanged.
- Create agent-bench.mjs: dataset/config validation, frozen packets, journal import, metrics and offline CLI/replay.
- Create test/agent-bench.test.mjs; extend test/agent.test.mjs and test/evaluation.test.mjs.
- Create data/agent-routing-v2.json and experiments/agent-routing-v2.json: versioned pilot inputs and rubric.
- Create docs/03-evaluation/agent-routing-pilot.md: protocol, commands, measured results and limitations.
- Update doc/roadmap.md: distinguish implemented infrastructure from incomplete human/API evidence.
- Write ignored results/agent-routing-pilot-* artifacts: immutable freeze, append-only session journal, derived report.

### Task 1: Share deterministic policy without changing the harness

**Interfaces:** Export applyAgentPolicy(text, observation, threshold=.8). observation is {route, approval_needed, confidence}, where approval/confidence can be null for rules or Luna. Return {route, reason, predicates}; predicates are approval, explicit_review, below_threshold and unsupported_operation. Null means unavailable, not false. Keep operation private; do not expose or call its run closure from the benchmark.

- [ ] Add failing tests to test/agent.test.mjs:

```js
assert.equal(applyAgentPolicy('calculate: 2 + 2', {route:'tool',approval_needed:.5,confidence:.8}).reason, 'approval_needed');
assert.equal(applyAgentPolicy('calculate: 2 + 2', {route:'tool',approval_needed:0,confidence:.8}).route, 'tool');
assert.equal(applyAgentPolicy('calculate: 2 / 0', {route:'tool',approval_needed:0,confidence:1}).reason, 'unsupported_operation');
assert.throws(() => applyAgentPolicy('x', {route:'shell',approval_needed:null,confidence:null}));
```

- [ ] Run node --test test/agent.test.mjs; confirm missing export failure.
- [ ] Extract existing precedence exactly: approval >=.5, explicit review, confidence < threshold, capability rejection. Evaluate predicates independently against raw selection. Preserve baseline_rule for baseline and threshold_met for live decisions in runAgent; do not leak diagnostic fields into existing decision contracts.

```js
const routed = applyAgentPolicy(input.text, {
  route: answer.choice, approval_needed: approval_needed.noul,
  confidence: answer.confidence,
}, input.threshold);
route = routed.route;
reason = routed.reason;
```

- [ ] Reject unknown keys/routes, nonfinite probabilities and invalid text. Test approval plus unsupported syntax reports both predicates while approval remains the effective reason; test null confidence never activates a confidence gate.
- [ ] Run node --test test/agent.test.mjs test/nim.test.mjs; confirm existing behavior passes. Commit only Task 1 files.

### Task 2: Version and validate the dataset, rubric and config

**Interfaces:** loadAgentExperiment(configPath) returns {config,dataset,cases,hashes}; validateAgentDataset(dataset) returns dataset or throws. Hash exact bytes with SHA-256. Config paths resolve relative to the config file, not cwd.

- [ ] In test/agent-bench.test.mjs load the eventual fixture and assert its counts; mutate a clone for each invalid case:

```js
const experiment = await loadAgentExperiment('experiments/agent-routing-v2.json');
assert.equal(experiment.cases.length, 48);
const bad = structuredClone(experiment.dataset);
bad.cases[0].reference_status = 'agreed';
assert.throws(() => validateAgentDataset(bad));
```

- [ ] Run node --test test/agent-bench.test.mjs; confirm missing module failure.
- [ ] Author 32 pairs before inference. Cover exact utilities/checklists, open-ended drafting without baseline prefixes, misleading prefixes, negation, mixed requests and untrusted permission claims. Retain the spec's stratum/route counts. Each family has relation same_route or different_route matching its labels; both cases stay in one split. Include originals and contrasts, not paraphrases crossing splits.
- [ ] Store rubric, author provenance and cases in data/agent-routing-v2.json. Each case includes spec fields plus pair_relation; reference_status is author_only and reviews is empty. Do not imply the AI author is a human reviewer.
- [ ] Use this fixed config shape:

```json
{"schema_version":1,"dataset":"../data/agent-routing-v2.json","dataset_version":"agent-routing-v2","split":"test","policy_version":"agent-gating-v1","threshold":0.8,"requested_model":"gpt-6-luna","attempts_per_case":1}
```

- [ ] Reject unknown fields, invalid IDs/routes/splits/strata, whitespace-only or overlong text, duplicate normalized text, split leakage, non-pairs, invalid relations and inconsistent review_required. Agreed requires two distinct independently recorded human reviewers agreeing; AI reviews cannot satisfy it. Test each mutated boundary, including exactly 4000 characters.
- [ ] Run dataset tests and existing agent evaluation. Commit only Task 2 files.

### Task 3: Strict observations and policy-attribution metrics

**Interfaces:** parseRoutingAnswer(text) returns exactly {route,approval_needed:boolean}; summarizeAgentRows(rows) returns metrics. Each scheduled row carries id, family_id, stratum, reference_status, expected_route, status (ok/error/not_attempted), raw observation or null, baseline route, final disposition and predicates.

- [ ] Write strict parser and hand-counted metric tests:

```js
assert.deepEqual(parseRoutingAnswer('{"route":"llm","approval_needed":false}'), {route:'llm',approval_needed:false});
assert.throws(() => parseRoutingAnswer('```json\n{"route":"llm","approval_needed":false}\n```'));
assert.throws(() => parseRoutingAnswer('{"route":"llm","approval_needed":"false"}'));
assert.throws(() => parseRoutingAnswer('{"route":"llm","approval_needed":false,"confidence":1}'));
```

- [ ] Run targeted tests and confirm failure. Add parser with size bound, JSON.parse and exact key/type validation; no repair/extraction. Convert the boolean approval to 0/1 only for shared policy; preserve original observation and null confidence.
- [ ] Extend classificationMetrics(rows, labels = existingSupportLabels) to accept the four agent labels. Validate distinct nonempty labels. Existing support metrics must remain byte-equivalent for fixed fixtures; add a custom-label test in test/evaluation.test.mjs.
- [ ] Build a five-row fixture: correct automatic gain over rules; wrong raw tool caught by capability; correct raw LLM unnecessarily reviewed by approval; one error; one not_attempted. Assert scheduled=5, successful=3, error=1, not_attempted=1, automatic=1, coverage=.2, caught=1, unnecessary_review=1 and zero surviving wrong automatic routes. Add a sixth successful wrong LLM route to assert surviving and introduced errors increment.
- [ ] Report raw and final confusion metrics, review precision/recall, correct/scheduled, wrong/automatic, false-local routes, strata/reference subsets and paired gains/losses versus rules. Empty agreed-human subset and zero denominators return null rates, never fabricated scores.
- [ ] Compute always-review separately. For each gate, recompute disposition excluding only that predicate in production order; never execute. Explicit-review removal does not invent a non-review route. Report overlaps, not additive causal credit.
- [ ] Report pair relation consistency and both-correct rate over complete successful pairs with excluded counts. One-pass repetition metrics are null. Test one incomplete pair, one consistently wrong pair and overlapping gates.
- [ ] Run all metric tests; commit scoped changes.

### Task 4: Immutable freeze, session journal and offline replay

**Interfaces:** CLI modes are mutually exclusive: --freeze CONFIG --out NEW; --baseline FREEZE --out NEW; --import JOURNAL --freeze FREEZE --out NEW; --replay REPORT. Export buildRoutingPacket(text), replayAgentReport(report). No API mode or env loading.

- [ ] Add CLI tests using node:child_process and a temporary directory. Override global fetch to throw in direct module tests; replay/import must never call it. Verify module import does not run main.
- [ ] Implement frozen artifact with embedded dataset/config/rubric, source hashes (agent.mjs, evaluation.mjs, agent-bench.mjs), exact prompt and ordered test IDs. Hash using crypto; store started_at and Node/platform/git identity when available. Validate before writing exclusively with wx and mode 0600.
- [ ] Build packets from fixed instructions and only task text, with an exact two-key output schema. Include full capability bounds (decimal arithmetic <=1e12, nonzero divisor, checklist <=20 items of <=200 characters) and untrusted-task handling. Exclude IDs, split, labels and rationales from packet text.

```js
const packet = buildRoutingPacket('Please draft a welcome note.');
assert.equal(packet.includes('expected_route'), false);
assert.equal(packet.includes('reference_status'), false);
```

- [ ] Journal starts with frozen artifact hash and run ID; append and fsync pending record before dispatch, terminal record afterward. Terminal records contain case ID, session ID, requested/exposed model identity, timestamps, raw final answer bounded to 4096 characters, status and tool_audit (none_observed/used/unverified). Only allowlisted metadata survives import; never headers, environment, arbitrary tool output or reasoning.
- [ ] Reject duplicate attempts, unknown IDs, changed hashes, out-of-order records, terminal without pending, calls after first terminal failure, malformed/truncated journal and more than 48 test attempts. A trailing pending attempt becomes interrupted with remaining tasks not_attempted; no automatic redispatch.
- [ ] Recompute all projections/metrics from embedded validated inputs and terminal observations; reject corrupt hashes and inconsistent saved totals. Replay validates historical embedded source identity, not equality to today's source. Hashes are integrity checks, not proof of provider authenticity.
- [ ] Test exclusive-output refusal preserves existing bytes, foreign journal hash rejection, malicious extra metadata rejection, pending-only interruption and null usage/cost. Keep baseline and control source labels distinct from model observations.
- [ ] Run node --test and CLI baseline/replay against temporary files. Commit Task 4 files.

### Task 5: Execute the bounded Luna pilot and record evidence — completed locally

**Files:** ignored results/agent-routing-pilot-freeze.json, results/agent-routing-pilot-sessions.jsonl, results/agent-routing-pilot-report.json; docs/03-evaluation/agent-routing-pilot.md; doc/roadmap.md.

- [x] Read both spec and plan again. Run npm test and node agent-eval.mjs; establish no regressions before inference.
- [x] Use at most four development-only sessions for format/transport checks. Dispatch explicitly with model gpt-6-luna, fork_turns none, and only buildRoutingPacket output. No model override fallback. Do not expose labels or ask the session to inspect files. Record actual tool-audit visibility; absence of a returned tool log is unverified, not proof of no tools.
- [x] Freeze final prompt and inputs after development checks, before any test session:

```text
node agent-bench.mjs --freeze experiments/agent-routing-v2.json --out results/agent-routing-pilot-freeze.json
node agent-bench.mjs --baseline results/agent-routing-pilot-freeze.json --out results/agent-routing-pilot-baseline.json
```

- [x] Sequentially dispatch the 48 ordered test packets, each in a fresh session. Persist pending/terminal records through patch-based file edits followed by validated fsync before the next dispatch. Do not send follow-up corrections. Inspect actual session state on an observation timeout rather than restarting. Stop at the first failure/tool use; retain partial results and null unavailable data.
- [x] Import and replay:

```text
node agent-bench.mjs --import results/agent-routing-pilot-sessions.jsonl --freeze results/agent-routing-pilot-freeze.json --out results/agent-routing-pilot-report.json
node agent-bench.mjs --replay results/agent-routing-pilot-report.json
```

- [x] Record counts, failures, paired attribution, controls, author-reference status and actual isolation evidence. Keep session wall time separate from provider latency; unknown usage/cost remains null. Explicitly state no new Jev comparison, human adjudication, downstream quality or savings is established.
- [x] Re-run npm test, historical replay tests and git diff --check. Scan changed artifacts for configured secret values without printing values; never stage .env or the spending ledger. Verify replay metrics equal the report and spend ledger bytes are unchanged.
- [x] Update roadmap with actual completion only. Document local artifact paths and hashes; ignored raw results remain local and are not claimed as published reproducible evidence. Commit implementation/report docs locally only after checks; no push/tag/release.

## Self-review and handoff

Tasks 1-4 cover executable infrastructure and trust boundaries; Task 5 covers the actual pilot and its evidence. Missing human reviewers do not block an author-reference pilot. A partial stopped run is valid only with the specified terminal failure and all missing attempts visible, not as a shortcut to a completed run.

Recommend native execution: these five tasks share a small policy/report surface. The coordinator implements sequentially; a final independent review follows, while fresh Luna sessions are evaluators, not code authors. Written-plan review and execution-method selection are required before implementation.

TypeSafe live documentation rechecked 2026-09-24: [intent routing](https://docs.typesafe.ai/patterns/intent-routing), [confidence](https://docs.typesafe.ai/confidence). The plan keeps policy in code and does not equate confidence with correctness.
