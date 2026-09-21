# Evaluation

The authoritative implementation guide is [Decision Bench](../../doc/decision-bench.md). It defines every denominator, supported config, provenance limitation, and replay behavior.

## Repeat the offline analysis

```sh
npm run eval -- --config data/support-routing-v1.json
node playground.mjs replay --report doc/results/jev-test-2026-09-21.json
```

The first command evaluates keywords, not Jev. The second recomputes the saved Jev report. Neither validates current provider availability.

## Design a new experiment

1. Specify the task, allowed labels, review policy, and failure costs.
2. State provenance and redistribution permission for every dataset.
3. Separate development from test cases before tuning.
4. Freeze data, questions, model version, policy, and baseline.
5. Obtain approval for live cost; retain every attempt, including failures.
6. Report successful-response and per-attempt metrics separately.
7. Inspect individual errors before making a headline claim.

Only department labels exist today. Urgency/frustration accuracy, calibration, and repeat consistency require additional protocols. Do not silently relabel difficult test cases after seeing results.

Use the [dataset guide](dataset-contributions.md) and [experiment proposal template](experiment-template.md).
