# Evaluation

The legacy implementation guide is [Decision Bench](../../doc/decision-bench.md). The [broader repeated benchmark](benchmark-v2.md) defines the new frozen dataset, denominators, spending guard, and separate replay command. See its [results](benchmark-v2-results.md).

## Repeat the offline analysis

```sh
npm run eval -- --config data/support-routing-v1.json
node playground.mjs replay --report doc/results/jev-test-2026-09-21.json
```

The first command evaluates keywords, not Jev. The second recomputes the saved Jev report. Neither validates current provider availability.

The browser's Recorded experiment section presents the same fixed replay with provenance warnings, denominators, confusion matrices, and case filters. It is read-only and makes no model calls. Its 16 rows are historical synthetic observations with incomplete legacy provenance, not a fresh evaluation.

## Design a new experiment

1. Specify the task, allowed labels, review policy, and failure costs.
2. State provenance and redistribution permission for every dataset.
3. Separate development from test cases before tuning.
4. Freeze data, questions, model version, policy, and baseline.
5. Obtain approval for live cost; retain every attempt, including failures.
6. Report successful-response and per-attempt metrics separately.
7. Inspect individual errors before making a headline claim.

Department and narrow expected-review labels exist in the broader benchmark. Repeated-decision agreement is descriptive, not proof of general determinism. Urgency/frustration accuracy and calibration still require additional protocols. Do not silently relabel difficult test cases after seeing results.

Use the [dataset guide](dataset-contributions.md) and [experiment proposal template](experiment-template.md).
