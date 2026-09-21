# Benchmark v0.2.0 Implementation Plan

> Execute inline with test-first checks; user approved end-to-end execution on main. No publication step.

**Goal:** Freeze and evaluate a broader support-routing benchmark within USD 0.05.

**Architecture:** Reuse playground.mjs and evaluation.mjs. Add benchmark.mjs for the new fixture/runner/replay contract and budget.mjs for durable spending reservations. Leave legacy evaluator and browser behavior intact.

**Tech Stack:** Node.js >=22.9, built-in test runner/filesystem/crypto only.

**Spec:** ../specs/2026-09-21-benchmark-v2-design.md

## Global constraints

- Main branch; no dependencies; no new release/tag/deployment.
- USD 0.05 maximum new provider spend under verified pricing; no retries; fail closed.
- Synthetic data only; keys never in saved files; never overwrite observations.

## Tasks

- [x] Freeze data/support-routing-v2.json and data/tickets-v2.json with the rubric in docs/03-evaluation/benchmark-v2.md. Validate exact fields, unique IDs/texts, split isolation, labels, model, repeats, and question hash before calls.
- [x] Write test/budget.test.mjs first; prove missing behavior fails. Implement budget.mjs with openBudget(path, limitUsd), reserve(), settle(id, inputTokens), snapshot(), close(). Test exact cap boundary, failed reservation retention, reopen, lock contention, malformed/duplicate entries and invalid usage.
- [x] Write test/benchmark.test.mjs first; prove missing behavior fails. Implement loadBenchmark(path), benchmarkMetrics(cases, rows, config), runBenchmark(experiment, options), replayBenchmark(report), and CLI preview/live/replay. Fixtures assert wrong auto-route rate, review denominators, complete-case and pairwise consistency. Inject HTTP transport only for live tests.
- [x] Run npm test, baseline CLI and legacy replay. Freeze SHA256 for dataset/config/questions/source before live calls. Review budget failure paths before using the key.
- [x] Execute the 48-case/three-pass live test once with durable shared ledger and exclusive result path. Save partial failures if any; do not retry automatically. Replay independently and reconcile reported usage against ledger settlements.
- [x] Write docs/03-evaluation/benchmark-v2-results.md and an engineering explanation. Update README/roadmap/CI commands without claiming release publication. Verify tests, offline commands, links, no configured secret values, preserved historical report, and changed-file scope.
